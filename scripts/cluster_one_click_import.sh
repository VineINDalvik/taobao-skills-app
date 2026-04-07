#!/usr/bin/env bash
# 从合规 CSV（含 title + image_url/path）一键生成 lib/cluster-data.json，供 AI 找款 Finder 使用。
# 用法: ./scripts/cluster_one_click_import.sh <导入.csv> [k_clusters]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CSV="${1:?用法: $0 <导入.csv> [k_clusters 默认12]}"
K="${2:-12}"

if [[ ! -f "$CSV" ]]; then
  echo "错误：找不到文件: $CSV" >&2
  exit 1
fi

cd "$ROOT"
echo "→ OpenCLIP 编码主图（首次较慢）· KMeans k=$K · 输出 lib/cluster-data.json"
python3 scripts/build_cluster_data.py \
  --import-csv "$CSV" \
  --source import \
  --embedding-backend openclip \
  --method kmeans \
  --n-clusters "$K" \
  --top-clusters "$K"
echo "→ 完成。请在仓库根目录: npm run dev 或 npm run build"
