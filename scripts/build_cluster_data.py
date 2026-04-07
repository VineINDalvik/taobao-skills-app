#!/usr/bin/env python3
"""
AI 找款 · 离线聚类管线（与 app/skills/finder 数据流对齐）

数据来源
  1) HuggingFace: tonyassi/clothing-sales-data-embeddings（预计算 CLIP 768 维）
  2) 人工导入: CSV / JSON（淘宝/自有爬虫导出 → 见下方列说明；需本机算向量时加 OpenCLIP）

聚类
  - UMAP(10D, cosine) + HDBSCAN（默认）或 KMeans（固定 K，更可控、更细）
  - --preset fine|medium|coarse 快速调 HDBSCAN 粒度

全量更新
  - --download-mode force_redownload 强制从 Hub 重拉（需联网）
  - 默认 reuse_cache_if_exists

用法示例
  pip install -r scripts/requirements-cluster.txt
  pip install -r scripts/requirements-cluster-openclip.txt   # 仅导入图/无向量时需要

  python scripts/build_cluster_data.py --full --download-mode force_redownload \\
      --method hdbscan --preset fine --top-clusters 12

  python scripts/build_cluster_data.py --import-csv scripts/examples/import.sample.csv \\
      --source import --embedding-backend openclip --method kmeans --n-clusters 8

  # HF + 自有 CSV 同一向量空间（两侧须能解码出主图；慢）
  python scripts/build_cluster_data.py --full --source merge --import-csv data/mine.csv \\
      --embedding-backend openclip --method hdbscan --preset fine --top-clusters 12

CSV 列（UTF-8）
  必填: title
  选填: price, units_sold, image_url, image_path, platform, currency(cny|usd)
  若有现成向量: embedding 列为 JSON 数组字符串或 | 分隔数字（768 维）→ 可跳过 openclip
"""
from __future__ import annotations

import argparse
import ast
import base64
import json
import re
import sys
from collections import Counter
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

STOPWORDS = {
    "dress", "women", "womens", "ladies", "summer", "casual", "plus", "size",
    "short", "long", "sleeve", "the", "and", "for", "with", "midi", "maxi",
    "mini", "a", "in", "of", "to", "at", "by", "from", "on", "style", "fashion",
    "new", "hot", "sale", "free", "shipping",
    "pour", "avec", "sans", "les", "des", "une", "dans", "sur", "aux", "par",
    "mode", "femme", "homme", "été", "hiver", "printemps", "automne",
    "de", "la", "le", "et", "en", "un", "el", "los", "las", "para", "con",
    "eau", "air", "non", "slim", "high", "quality",
}

ZH_STOP = {
    "的", "了", "和", "与", "是", "在", "有", "为", "款", "装", "女", "男", "新", "季",
    "淘宝", "天猫", "包邮", "正品", "热销", "爆款",
}

KW_CN = {
    "floral": "碎花",
    "dress": "连衣裙",
    "maxi": "长款",
    "midi": "中长",
    "mini": "短裙",
    "sleeveless": "无袖",
    "tank": "吊带",
    "halter": "挂脖",
    "bodycon": "紧身",
    "striped": "条纹",
    "solid": "纯色",
    "lace": "蕾丝",
    "chiffon": "雪纺",
    "cotton": "棉",
    "linen": "麻",
    "v-neck": "V领",
    "neck": "领",
    "off-shoulder": "露肩",
    "strapless": "抹胸",
    "wrap": "裹身",
    "shirt": "衬衫",
    "skater": "伞摆",
    "bohemian": "波西米亚",
    "elegant": "优雅",
    "sexy": "性感",
    "party": "派对",
    "cocktail": "礼服",
    "beach": "海滩",
    "boho": "波西米亚",
    "ruffle": "荷叶边",
    "pleated": "百褶",
    "denim": "牛仔",
    "knit": "针织",
    "sweater": "毛衣",
    "top": "上衣",
    "blouse": "衬衫",
    "skirt": "半裙",
    "pants": "裤",
    "romper": "连体短裤",
    "jumpsuit": "连体裤",
    "evening": "晚装",
    "wedding": "婚礼",
    "vintage": "复古",
    "modern": "现代",
    "femmes": "女装",
    "robe": "连衣裙",
    "robes": "连衣裙",
    "manches": "袖",
    "sans": "无",
    "longues": "长袖",
    "courtes": "短袖",
    "chaussures": "鞋",
    "sandales": "凉鞋",
    "bottes": "靴",
    "jupe": "半裙",
    "pantalon": "裤",
    "chemise": "衬衫",
    "gonflable": "充气",
    "piscine": "泳池",
    "ventilateur": "风扇",
}

EMOJIS = ["✨", "👗", "💃", "🌸", "🛍️", "📦", "🎯", "💫"]
PLATFORMS_ROT = ["Shein", "AliExpress", "Temu", "淘宝", "1688"]


def parse_emb(x) -> np.ndarray:
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return np.zeros(768, dtype=np.float32)
    if isinstance(x, (list, np.ndarray)):
        return np.asarray(x, dtype=np.float32)
    if isinstance(x, str):
        s = x.strip()
        if s.startswith("[") or s.startswith("("):
            return np.array(ast.literal_eval(s), dtype=np.float32)
        if "|" in s:
            return np.array([float(z) for z in s.split("|")], dtype=np.float32)
        return np.array(ast.literal_eval(s), dtype=np.float32)
    return np.asarray(x, dtype=np.float32)


def top_keywords(titles: pd.Series, n: int = 8) -> list[str]:
    words: list[str] = []
    for t in titles:
        text = str(t)
        toks = re.findall(r"[a-zA-Z]+", text.lower())
        words += [w for w in toks if w not in STOPWORDS and len(w) > 2]
        zh = re.findall(r"[\u4e00-\u9fff]{2,4}", text)
        words += [w for w in zh if w not in ZH_STOP]
    return [w for w, _ in Counter(words).most_common(n)]


def kw_to_cluster_name(kws: list[str]) -> tuple[str, str]:
    cn_parts = []
    for k in kws[:3]:
        if re.match(r"^[\u4e00-\u9fff]+$", k):
            cn_parts.append(k)
        else:
            cn_parts.append(KW_CN.get(k.lower(), k))
    name = "·".join(cn_parts) if cn_parts else "未命名簇"
    cn_desc = f"{name}·多源聚合"
    return name, cn_desc


def pil_image_to_data_uri(img, size: int = 200, quality: int = 70) -> str | None:
    from PIL import Image as PILImage

    try:
        if isinstance(img, dict) and "bytes" in img:
            im = PILImage.open(BytesIO(img["bytes"]))
        elif isinstance(img, bytes):
            im = PILImage.open(BytesIO(img))
        else:
            im = img
        im = im.convert("RGB").resize((size, size))
        buf = BytesIO()
        im.save(buf, format="JPEG", quality=quality)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


def row_image_to_data_uri(row: pd.Series) -> str | None:
    if "image" in row.index and row["image"] is not None and not (
        isinstance(row["image"], float) and pd.isna(row["image"])
    ):
        u = pil_image_to_data_uri(row["image"])
        if u:
            return u
    return None


def fetch_url_to_pil(url: str, timeout: int = 20):
    import requests
    from PIL import Image as PILImage

    headers = {"User-Agent": "Mozilla/5.0 (compatible; TaobaoSkillsClusterBot/1.0)"}
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return PILImage.open(BytesIO(r.content)).convert("RGB")


def load_hf_frame(
    dataset: str,
    split: str,
    download_mode: str,
    log=print,
) -> pd.DataFrame:
    from datasets import load_dataset

    log(f"Loading HF {dataset!r} split={split!r} download_mode={download_mode} …")
    ds = load_dataset(dataset, split=split, download_mode=download_mode)
    df = ds.to_pandas()
    df["_source"] = "hf"
    if "currency" not in df.columns:
        df["currency"] = "usd"
    return df


def load_import_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig")
    return normalize_import_df(df)


def load_import_json(path: Path) -> pd.DataFrame:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "items" in raw:
        raw = raw["items"]
    df = pd.DataFrame(raw)
    return normalize_import_df(df)


def normalize_import_df(df: pd.DataFrame) -> pd.DataFrame:
    colmap = {c.lower().strip(): c for c in df.columns}
    def pick(*names: str):
        for n in names:
            if n in df.columns:
                return df[n]
            if n.lower() in colmap:
                return df[colmap[n.lower()]]
        return None

    title = pick("title", "商品标题", "name")
    if title is None:
        raise SystemExit("导入表必须包含 title（或 商品标题）列")
    out = pd.DataFrame({"title": title.astype(str)})
    out["price"] = pick("price", "价格", "成交价") if pick("price", "价格", "成交价") is not None else 0.0
    out["units_sold"] = pick("units_sold", "销量", "月销", "付款人数") if pick("units_sold", "销量", "月销", "付款人数") is not None else 0
    out["platform"] = pick("platform", "平台") if pick("platform", "平台") is not None else "淘宝"
    cur = pick("currency", "币种")
    out["currency"] = cur.astype(str).str.lower() if cur is not None else "cny"
    out["image_url"] = pick("image_url", "主图", "pic", "image") if pick("image_url", "主图", "pic", "image") is not None else None
    out["image_path"] = pick("image_path", "本地图片") if pick("image_path", "本地图片") is not None else None
    emb_col = pick("embedding", "embeddings", "vector")
    if emb_col is not None:
        out["embedding_raw"] = emb_col
    out["_source"] = "import"
    return out


def resolve_import_images(df: pd.DataFrame) -> pd.DataFrame:
    from PIL import Image as PILImage

    images: list[Any] = []
    for _, row in df.iterrows():
        im = None
        p = row.get("image_path")
        u = row.get("image_url")
        try:
            if pd.notna(p) and str(p).strip():
                im = PILImage.open(Path(str(p)).expanduser()).convert("RGB")
            elif pd.notna(u) and str(u).strip().startswith("http"):
                im = fetch_url_to_pil(str(u).strip())
        except Exception as e:
            print(f"  [warn] skip image for row: {e}", file=sys.stderr)
        images.append(im)
    df = df.copy()
    df["image"] = images
    return df


def openclip_embedding_matrix(df: pd.DataFrame, batch_size: int) -> np.ndarray:

    try:
        import torch
        import open_clip
    except ImportError as e:
        raise SystemExit("未安装 open_clip/torch，请 pip install -r scripts/requirements-cluster-openclip.txt") from e

    # ViT-L-14 → 768 维，与 HF 服装 embedding 维度一致，便于 hf+import 合并聚类
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-L-14", pretrained="laion2b_s32b_b82k"
    )
    try:
        model = model.cuda()
        device = "cuda"
    except Exception:
        device = "cpu"
    model.eval()

    tensors = []
    from PIL import Image as PILImage

    def row_to_pil(row: pd.Series):
        im = row.get("image")
        if im is None or (isinstance(im, float) and pd.isna(im)):
            return None
        if isinstance(im, PILImage.Image):
            return im.convert("RGB")
        if isinstance(im, dict) and "bytes" in im:
            return PILImage.open(BytesIO(im["bytes"])).convert("RGB")
        if isinstance(im, bytes):
            return PILImage.open(BytesIO(im)).convert("RGB")
        try:
            return im.convert("RGB")
        except Exception:
            return None

    for _, row in df.iterrows():
        im = row_to_pil(row)
        tensors.append(preprocess(im) if im is not None else None)

    valid_idx = [i for i, t in enumerate(tensors) if t is not None]
    if len(valid_idx) < max(10, len(df) // 5):
        raise SystemExit("有效图片过少，无法稳定算 CLIP 向量；请检查 image_url/image_path")

    with torch.no_grad():
        probe = torch.stack([tensors[i] for i in [valid_idx[0]]]).to(device)
        dim = int(model.encode_image(probe).shape[-1])
    out = np.zeros((len(df), dim), dtype=np.float32)
    with torch.no_grad():
        for start in range(0, len(valid_idx), batch_size):
            chunk = valid_idx[start : start + batch_size]
            batch = torch.stack([tensors[i] for i in chunk]).to(device)
            feat = model.encode_image(batch)
            feat = feat / feat.norm(dim=-1, keepdim=True)
            out[chunk] = feat.float().cpu().numpy()
    nonzero = out.sum(axis=1) != 0
    mean_emb = out[nonzero].mean(axis=0) if nonzero.any() else np.random.randn(dim).astype(np.float32)
    for i in range(len(df)):
        if out[i].sum() == 0:
            out[i] = mean_emb
    return out


def matrix_from_hf_embeddings(df: pd.DataFrame) -> np.ndarray:
    return np.vstack(df["embeddings"].apply(parse_emb).values)


def matrix_from_import_embeddings(df: pd.DataFrame) -> np.ndarray:
    return np.vstack(df["embedding_raw"].apply(parse_emb).values)


def matrix_merge_dataset_embeddings(df: pd.DataFrame) -> np.ndarray:
    rows: list[np.ndarray] = []
    for _, r in df.iterrows():
        if r["_source"] == "hf":
            rows.append(parse_emb(r["embeddings"]))
        else:
            rows.append(parse_emb(r["embedding_raw"]))
    return np.vstack(rows)


def preset_hdbscan(preset: str) -> tuple[int, int]:
    if preset == "fine":
        return 8, 3
    if preset == "coarse":
        return 35, 10
    return 15, 5  # medium


def format_price_str(price: float, currency: str) -> str:
    c = (currency or "usd").lower()
    if c in ("cny", "rmb", "元", "cn"):
        return f"¥{price:.2f}"
    return f"${price:.2f}"


def build_output_rows(
    cluster_df: pd.DataFrame,
    top_cluster_ids: list[int],
    global_avg: float,
    cluster_labels: dict[int, list[str]],
    log=print,
    emb_matrix: np.ndarray | None = None,
    labeled_df: pd.DataFrame | None = None,
    include_centroid_embedding: bool = True,
) -> list[dict]:
    output: list[dict] = []
    for rank, cid in enumerate(top_cluster_ids):
        cid = int(cid)
        sub = cluster_df[cluster_df["cluster"] == cid]
        kws = cluster_labels[cid]
        name_cn, cn_desc = kw_to_cluster_name(kws)
        rel_pct = (float(sub["units_sold"].mean()) / float(global_avg) - 1.0) * 100.0 if global_avg > 0 else 0.0
        demand_pct = round(rel_pct, 1)
        demand_growth = f"{demand_pct:+.0f}%"
        comp_level: Any = "低" if len(sub) < 50 else "中" if len(sub) < 120 else "高"

        top_products = sub.nlargest(8, "units_sold")
        mosaic_images: list[str] = []
        for _, row in top_products.head(4).iterrows():
            uri = row_image_to_data_uri(row)
            if uri:
                mosaic_images.append(uri)
        while len(mosaic_images) < 4 and mosaic_images:
            mosaic_images.append(mosaic_images[-1])

        competitors: list[dict] = []
        for i, (_, row) in enumerate(top_products.head(6).iterrows()):
            img_uri = row_image_to_data_uri(row)
            if not img_uri and mosaic_images:
                img_uri = mosaic_images[0]
            if not img_uri:
                continue
            price_f = float(row["price"])
            cur = str(row.get("currency", "usd")).lower()
            plat = str(row.get("platform", PLATFORMS_ROT[i % len(PLATFORMS_ROT)]))
            competitors.append(
                {
                    "name": str(row["title"])[:72],
                    "price": format_price_str(price_f, cur),
                    "sales": format_sales(int(row["units_sold"])),
                    "image": img_uri,
                    "platform": plat,
                    "trend": i < 2,
                }
            )

        cur0 = str(sub["currency"].iloc[0]) if "currency" in sub.columns else "usd"
        insight = (
            f"本簇 {len(sub)} 款，均价 {format_price_str(float(sub['price'].mean()), cur0)}，"
            f"均销 {float(sub['units_sold'].mean()):.0f}（相对基准 {demand_growth}）。"
            f"建议小单测款。（结构维度标签由前端按 12 轴与簇名/描述/竞品标题对齐计算，非本段词频。）"
        )

        entry: dict[str, Any] = {
            "styleId": f"style-{rank + 1:03d}",
            "clusterId": cid,
            "name": name_cn,
            "emoji": EMOJIS[cid % len(EMOJIS)],
            "cnDesc": cn_desc,
            "demandGrowth": demand_growth,
            "demandPct": demand_pct,
            "competition": comp_level,
            "hotCount": int(len(sub)),
            "avgPrice": round(float(sub["price"].mean()), 2),
            "avgSales": round(float(sub["units_sold"].mean()), 1),
            "mosaicImages": mosaic_images,
            "competitors": competitors,
            "insight": insight,
        }
        if (
            include_centroid_embedding
            and emb_matrix is not None
            and labeled_df is not None
            and len(emb_matrix) == len(labeled_df)
        ):
            mask = (labeled_df["cluster"].values == cid) & (labeled_df["cluster"].values != -1)
            if mask.any():
                cen = emb_matrix[mask].mean(axis=0)
                entry["centroidEmbedding"] = [round(float(x), 5) for x in cen.tolist()]
        output.append(entry)
        if log:
            log(f"  #{rank + 1} cluster {cid}: {name_cn} | n={len(sub)} | avg_sales={entry['avgSales']}")
    return output


def format_sales(units: int) -> str:
    if units >= 10000:
        return f"月销 ~{units // 10000}万+"
    if units >= 1000:
        return f"月销 ~{units // 1000}k"
    return f"月销 ~{units:,}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build cluster-data.json (AI 找款)")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="输出 JSON；省略且未 --stdout-json 时默认 lib/cluster-data.json",
    )
    parser.add_argument("--dataset", default="tonyassi/clothing-sales-data-embeddings")
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--max-samples", type=int, default=50_000, help="HF 子集上限（仅当未指定 --full）")
    parser.add_argument("--download-mode", default="reuse_cache_if_exists", choices=["reuse_cache_if_exists", "force_redownload"])
    parser.add_argument("--source", choices=["hf", "import", "merge"], default="hf")
    parser.add_argument("--import-csv", type=Path, default=None)
    parser.add_argument("--import-json", type=Path, default=None)
    parser.add_argument("--embedding-backend", choices=["dataset", "openclip"], default="dataset")
    parser.add_argument("--openclip-batch-size", type=int, default=32)
    parser.add_argument("--method", choices=["hdbscan", "kmeans"], default="hdbscan")
    parser.add_argument("--preset", choices=["fine", "medium", "coarse"], default="fine", help="HDBSCAN min_cluster_size / min_samples 预设")
    parser.add_argument("--min-cluster-size", type=int, default=None)
    parser.add_argument("--min-samples", type=int, default=None)
    parser.add_argument("--n-clusters", type=int, default=18, help="KMeans 簇数（仅 method=kmeans）")
    parser.add_argument("--top-clusters", type=int, default=12, help="导出时保留均销量最高的 K 个簇")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--umap-neighbors", type=int, default=15)
    parser.add_argument(
        "--omit-centroid-embedding",
        action="store_true",
        help="不写 centroidEmbedding（减小 JSON；前端将无法用灵感图算视觉相似）",
    )
    parser.add_argument(
        "--stdout-json",
        action="store_true",
        help="将簇 JSON 数组打印到 stdout（供 API 调用）；默认不写 lib 文件，除非同时指定 --output",
    )
    args = parser.parse_args()

    import hdbscan
    import umap
    from sklearn.cluster import KMeans

    default_lib = Path(__file__).resolve().parent.parent / "lib" / "cluster-data.json"
    quiet = args.stdout_json
    log = (lambda *a, **k: None) if quiet else print

    dfs: list[pd.DataFrame] = []

    if args.source in ("hf", "merge"):
        split = "train" if args.full else f"train[:{args.max_samples}]"
        hf_df = load_hf_frame(args.dataset, split, args.download_mode, log=log)
        log(f"HF rows: {len(hf_df)}")
        dfs.append(hf_df)

    if args.source in ("import", "merge"):
        if args.import_csv:
            dfs.append(load_import_csv(args.import_csv))
        elif args.import_json:
            dfs.append(load_import_json(args.import_json))
        else:
            raise SystemExit("--source import|merge 时需要 --import-csv 或 --import-json")

    if not dfs:
        raise SystemExit("No data")

    df = pd.concat(dfs, ignore_index=True)

    if args.source == "import":
        df = resolve_import_images(df)
    elif args.source == "merge":
        hf_part = df[df["_source"] == "hf"].copy()
        imp_part = df[df["_source"] == "import"].copy()
        if len(imp_part):
            imp_part = resolve_import_images(imp_part)
        df = pd.concat([hf_part, imp_part], ignore_index=True)

    if args.embedding_backend == "openclip":
        log("OpenCLIP ViT-L-14：对可解码主图统一编码 …")
        X = openclip_embedding_matrix(df, args.openclip_batch_size)
    elif args.source == "hf":
        log("解析 HF 预计算 embeddings …")
        X = matrix_from_hf_embeddings(df)
    elif args.source == "import":
        if "embedding_raw" not in df.columns or df["embedding_raw"].isna().all():
            raise SystemExit("纯导入且未指定 openclip 时，CSV/JSON 需提供 embedding 列（768 维 JSON 或 | 分隔）")
        log("解析导入 embedding 列 …")
        X = matrix_from_import_embeddings(df)
    elif args.source == "merge":
        if "embedding_raw" not in df.columns or df.loc[df["_source"] == "import", "embedding_raw"].isna().all():
            raise SystemExit(
                "merge 且不用 openclip 时，导入行须含 embedding，且维数与 HF 一致；"
                "否则请加 --embedding-backend openclip"
            )
        emb_imp = matrix_from_import_embeddings(df[df["_source"] == "import"])
        emb_hf = matrix_from_hf_embeddings(df[df["_source"] == "hf"])
        if emb_imp.shape[1] != emb_hf.shape[1]:
            raise SystemExit(
                f"导入 embedding 维数 {emb_imp.shape[1]} ≠ HF {emb_hf.shape[1]}，请改用 openclip。"
            )
        log("合并 HF 与导入的预计算向量 …")
        X = matrix_merge_dataset_embeddings(df)

    log(f"Embedding matrix: {X.shape}")

    n_comp = min(10, X.shape[1])
    log(f"UMAP → {n_comp}D (cosine)…")
    reducer = umap.UMAP(
        n_components=n_comp,
        n_neighbors=args.umap_neighbors,
        min_dist=0.0,
        metric="cosine",
        random_state=args.seed,
        verbose=not quiet,
    )
    X_red = reducer.fit_transform(X)

    if args.method == "hdbscan":
        mcs = args.min_cluster_size or preset_hdbscan(args.preset)[0]
        ms = args.min_samples or preset_hdbscan(args.preset)[1]
        log(f"HDBSCAN min_cluster_size={mcs} min_samples={ms} …")
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=mcs,
            min_samples=ms,
            metric="euclidean",
            cluster_selection_method="eom",
        )
        labels = clusterer.fit_predict(X_red)
    else:
        k = min(args.n_clusters, len(df))
        log(f"KMeans n_clusters={k} …")
        labels = KMeans(n_clusters=k, random_state=args.seed, n_init=10).fit_predict(X_red)

    df = df.copy()
    df["cluster"] = labels
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_pct = (labels == -1).mean() * 100 if -1 in labels else 0.0
    log(f"Clusters: {n_clusters} | Noise: {noise_pct:.1f}%")

    cluster_df = df[df["cluster"] != -1].copy() if -1 in labels else df
    if cluster_df.empty:
        raise SystemExit("无有效簇。尝试减小 --min-cluster-size、增大样本，或改用 --method kmeans")

    global_avg = cluster_df["units_sold"].astype(float).mean()
    if global_avg <= 0:
        global_avg = 1.0

    stats = cluster_df.groupby("cluster").agg(
        count=("title", "count"),
        avg_price=("price", "mean"),
        avg_sales=("units_sold", "mean"),
    )
    stats = stats.sort_values("avg_sales", ascending=False)
    top_idx = stats.head(args.top_clusters).index.tolist()

    cluster_labels: dict[int, list[str]] = {}
    for cid in sorted(cluster_df["cluster"].unique()):
        sub_t = cluster_df.loc[cluster_df["cluster"] == cid, "title"]
        cluster_labels[int(cid)] = top_keywords(sub_t)

    if "currency" not in cluster_df.columns:
        cluster_df["currency"] = "usd"

    output = build_output_rows(
        cluster_df,
        top_idx,
        global_avg,
        cluster_labels,
        log=log,
        emb_matrix=X,
        labeled_df=df,
        include_centroid_embedding=not args.omit_centroid_embedding,
    )

    out_path = args.output
    if out_path is None and not args.stdout_json:
        out_path = default_lib
    if out_path is not None:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
        log(f"Wrote {len(output)} clusters → {out_path}")

    if args.stdout_json:
        sys.stdout.write(json.dumps(output, ensure_ascii=False))
        sys.stdout.flush()


if __name__ == "__main__":
    main()
