#!/usr/bin/env python3
"""单图 CLIP 向量（与 build_cluster_data OpenCLIP ViT-L-14 一致），供本地 Next API 调用。

用法: python3 scripts/embed_image_openclip.py <图片路径>
stdout 仅输出一行 JSON: {"ok":true,"embedding":[...]} 或 {"ok":false,"error":"..."}
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: embed_image_openclip.py <image_path>"}))
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.is_file():
        print(json.dumps({"ok": False, "error": "file not found"}))
        sys.exit(1)
    try:
        import numpy as np
        import torch
        import open_clip
        from PIL import Image
    except ImportError as e:
        print(json.dumps({"ok": False, "error": f"import: {e}"}))
        sys.exit(1)

    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-L-14", pretrained="laion2b_s32b_b82k"
    )
    try:
        model = model.cuda()
        device = "cuda"
    except Exception:
        device = "cpu"
    model.eval()

    im = Image.open(path).convert("RGB")
    t = preprocess(im).unsqueeze(0).to(device)
    with torch.no_grad():
        feat = model.encode_image(t)
        feat = feat / feat.norm(dim=-1, keepdim=True)
    vec = feat.float().cpu().numpy().flatten()
    out = [round(float(x), 5) for x in vec.tolist()]
    print(json.dumps({"ok": True, "embedding": out}))


if __name__ == "__main__":
    main()
