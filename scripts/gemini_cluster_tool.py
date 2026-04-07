from __future__ import annotations

import argparse
import json
import os
import re
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
from google import genai
from google.genai import types
from PIL import Image


def _get_client() -> genai.Client:
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_CLOUD_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY 或 GOOGLE_CLOUD_API_KEY 未设置。")
    return genai.Client(api_key=api_key)


def _parse_json_text(text: str) -> dict[str, Any]:
    if not text:
        return {}
    s = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", s)
    if m:
        s = m.group(1).strip()
    try:
        data = json.loads(s)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _fetch_image_part(url: str) -> types.Part | None:
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert("RGB")
        img.thumbnail((768, 768))
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg")
    except Exception:
        return None


def _label_catalog_text(labels: list[dict[str, Any]]) -> str:
    groups: dict[str, list[str]] = {}
    for item in labels:
        group = str(item.get("group") or "其它")
        groups.setdefault(group, []).append(str(item.get("label") or ""))
    lines = []
    for group, names in groups.items():
        lines.append(f"- {group}: " + " / ".join([n for n in names if n]))
    return "\n".join(lines)


def _cluster_prompt(cluster: dict[str, Any], labels: list[dict[str, Any]]) -> str:
    struct_top = cluster.get("structTopLabels") or []
    competitors = cluster.get("competitorNames") or []
    return f"""你是一名女装电商聚类语义分析师。请对一个视觉簇做“多标签理解 + cluster 生成/归类”。

你只能从下面给定的固定标签池中选标签，不能发明新标签：
{_label_catalog_text(labels)}

输入 cluster 信息：
- 当前 cluster 名：{cluster.get("name") or ""}
- 中文描述：{cluster.get("cnDesc") or ""}
- insight：{cluster.get("insight") or ""}
- 结构 Top Labels：{", ".join(struct_top)}
- 样本竞品标题：{" | ".join(competitors[:6])}

请输出严格 JSON，不要 markdown，不要解释：
{{
  "generatedClusterName": "重新生成的 cluster 名，适合业务展示，10-24 字",
  "generatedSummary": "一句话总结这个 cluster 的核心卖点/风格/版型方向",
  "primary": "主类目标签",
  "secondary": "最重要的第二标签",
  "labels": [
    {{
      "label": "必须来自固定标签池",
      "group": "类目|风格|版型|材质|图案",
      "score": 0.0
    }}
  ],
  "tags": ["主类目 xxx", "核心风格 xxx", "版型 xxx"],
  "groups": {{
    "类目": ["..."],
    "风格": ["..."],
    "版型": ["..."],
    "材质": ["..."],
    "图案": ["..."]
  }}
}}

要求：
- 至少输出 4 个标签，最多 8 个标签。
- primary 必须优先来自“类目”。
- secondary 优先选“风格”或“版型”。
- score 范围 0 到 1，按相关性排序。
- 如果图片和文本冲突，优先以图片视觉为准。
"""


def _normalize_semantic(raw: dict[str, Any], labels: list[dict[str, Any]]) -> dict[str, Any]:
    allowed_by_label = {str(item.get("label")): item for item in labels if item.get("label")}
    normalized_labels: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in raw.get("labels") or []:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()
        if not label or label in seen or label not in allowed_by_label:
            continue
        meta = allowed_by_label[label]
        seen.add(label)
        try:
            score = float(item.get("score") or 0.0)
        except Exception:
            score = 0.0
        normalized_labels.append(
            {
                "id": str(meta.get("id") or ""),
                "label": label,
                "group": str(meta.get("group") or item.get("group") or ""),
                "score": max(0.0, min(1.0, score)),
            }
        )

    if not normalized_labels:
        raise RuntimeError("Gemini 未返回有效标签")

    groups: dict[str, list[str]] = {}
    for item in normalized_labels:
        groups.setdefault(item["group"], []).append(item["label"])

    primary = str(raw.get("primary") or "").strip()
    if primary not in groups.get("类目", []):
        primary = groups.get("类目", [normalized_labels[0]["label"]])[0]

    secondary = str(raw.get("secondary") or "").strip()
    all_labels = [item["label"] for item in normalized_labels]
    if secondary not in all_labels or secondary == primary:
        secondary = next((item["label"] for item in normalized_labels if item["label"] != primary), primary)

    generated_name = str(raw.get("generatedClusterName") or "").strip() or f"{primary} · {secondary}"
    summary = str(raw.get("generatedSummary") or "").strip() or f"{primary} / {secondary}"

    tags = [str(t).strip() for t in (raw.get("tags") or []) if str(t).strip()]
    if not tags:
        tags = [f"主类目 {primary}", f"核心风格 {secondary}"]

    return {
      "generatedClusterName": generated_name,
      "generatedSummary": summary,
      "primary": primary,
      "secondary": secondary,
      "labels": normalized_labels[:8],
      "tags": tags[:8],
      "groups": groups,
    }


def annotate_clusters(payload: dict[str, Any]) -> dict[str, Any]:
    client = _get_client()
    clusters = payload.get("clusters") or []
    labels = payload.get("allowedLabels") or []
    model = str(payload.get("model") or "models/gemini-3-pro-image-preview")

    results: list[dict[str, Any]] = []
    for cluster in clusters:
        if not isinstance(cluster, dict):
            continue
        parts: list[types.Part] = [types.Part.from_text(text=_cluster_prompt(cluster, labels))]
        for url in (cluster.get("imageUrls") or [])[:3]:
            if not isinstance(url, str) or not url.strip():
                continue
            part = _fetch_image_part(url.strip())
            if part:
                parts.append(types.Part.from_text(text="cluster 样本图"))
                parts.append(part)
        res = client.models.generate_content(
            model=model,
            contents=[types.Content(role="user", parts=parts)],
        )
        raw = _parse_json_text(getattr(res, "text", ""))
        normalized = _normalize_semantic(raw, labels)
        results.append({"styleId": cluster.get("styleId"), "semantic": normalized})

    return {"ok": True, "results": results}


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini cluster semantic tool")
    parser.add_argument("--payload-file", type=str, required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.payload_file).read_text(encoding="utf-8"))
    action = str(payload.get("action") or "annotate_clusters")
    if action != "annotate_clusters":
        raise RuntimeError(f"unsupported action: {action}")
    print(json.dumps(annotate_clusters(payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
