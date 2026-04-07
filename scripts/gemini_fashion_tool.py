from __future__ import annotations

import argparse
import base64
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


def _load_image_bytes_from_url(url: str) -> tuple[bytes, str]:
    resp = requests.get(url, timeout=25)
    resp.raise_for_status()
    mime = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip() or "image/jpeg"
    return resp.content, mime


def _load_image_bytes_from_data_url(data_url: str) -> tuple[bytes, str]:
    m = re.match(r"^data:(image/[\w.+-]+);base64,(.+)$", data_url, re.I | re.S)
    if not m:
        raise ValueError("invalid image data url")
    mime = m.group(1)
    data = base64.b64decode(m.group(2))
    return data, mime


def _load_named_image(payload: dict[str, Any], url_key: str, data_key: str) -> tuple[bytes, str] | None:
    if payload.get(data_key):
        return _load_image_bytes_from_data_url(str(payload[data_key]))
    if payload.get(url_key):
        return _load_image_bytes_from_url(str(payload[url_key]))
    return None


def _part_from_named_image(label: str, image_blob: tuple[bytes, str]) -> list[types.Part]:
    data, mime = image_blob
    return [
        types.Part.from_text(text=label),
        types.Part.from_bytes(data=data, mime_type=mime),
    ]


def _extract_image_data_url(result: Any) -> tuple[str | None, str]:
    texts: list[str] = []
    image_b64: str | None = None
    mime: str = "image/png"

    for cand in getattr(result, "candidates", []) or []:
        content = getattr(cand, "content", None)
        for part in getattr(content, "parts", []) or []:
            text = getattr(part, "text", None)
            if text:
                texts.append(text)
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                mime = getattr(inline, "mime_type", None) or mime
                image_b64 = base64.b64encode(inline.data).decode("utf-8")

    return (
        f"data:{mime};base64,{image_b64}" if image_b64 else None,
        "\n".join([t.strip() for t in texts if t and t.strip()]),
    )


def run_image_edit(payload: dict[str, Any]) -> dict[str, Any]:
    client = _get_client()
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("missing prompt")

    model = str(payload.get("model") or "models/gemini-3-pro-image-preview")
    source = _load_named_image(payload, "sourceImageUrl", "sourceImageDataUrl")
    if not source:
        raise ValueError("missing source image")

    parts: list[types.Part] = [types.Part.from_text(text=prompt)]
    parts.extend(_part_from_named_image("原图（需要被延伸/改款的商品图）", source))

    mask = _load_named_image(payload, "maskImageUrl", "maskImageDataUrl")
    if mask:
        parts.extend(_part_from_named_image("服装前景蒙版（仅在该区域改动；背景不要变化）", mask))

    for i, ref in enumerate(payload.get("referenceImages") or [], start=1):
        if not isinstance(ref, dict):
            continue
        label = str(ref.get("label") or f"参考图 {i}")
        image_blob = _load_named_image(ref, "imageUrl", "imageDataUrl")
        if image_blob:
            parts.extend(_part_from_named_image(label, image_blob))

    result = client.models.generate_content(
        model=model,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
    )

    image_data_url, text = _extract_image_data_url(result)
    return {
        "ok": bool(image_data_url),
        "imageDataUrl": image_data_url,
        "text": text,
        "model": model,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini fashion tool")
    parser.add_argument("--payload-file", type=str, required=True)
    args = parser.parse_args()

    payload_path = Path(args.payload_file)
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    action = str(payload.get("action") or "image_edit")

    if action != "image_edit":
        raise RuntimeError(f"unsupported action: {action}")

    result = run_image_edit(payload)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
