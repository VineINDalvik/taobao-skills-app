# 数据管线、淘宝爬虫与合规风险（简版）

## 公开数据「有多全」？

默认 HF 数据集 **`tonyassi/clothing-sales-data-embeddings`** 在官方页面标注 **Number of rows: 933**（约 13.9MB）。这是该数据集的**全部公开样本**，不是本地缓存截断。要更大规模请用自有 CSV/API 导入或其它许可数据集。

## 推荐技术路线（与当前 AI 找款流程一致）

1. **公开 / 授权数据**：上述 HF 集（933 条）、天池脱敏赛题、商家自有 ERP/投放导出。
2. **人工导入**：CSV/JSON（`scripts/build_cluster_data.py`）——字段见脚本顶部 docstring；支持 `image_url` / `image_path` + OpenCLIP，或直传 `embedding` 列。
3. **聚类**：UMAP 降维 + **HDBSCAN**（自适应簇数，调 `--preset fine` 更细）或 **KMeans**（`--n-clusters` 固定更可控）。
4. **前端**：`lib/cluster-data.json` → Finder 多簇展示；`runSkill1` 用 `cluster-to-skill1.ts` 自动生成与簇数一致的 recommendations。

## 「淘宝爬虫」评估

| 维度 | 说明 |
|------|------|
| **平台 ToS** | 淘宝/天猫用户协议通常禁止未经授权的自动化抓取；违反可导致封号、法律主张。 |
| **技术反爬** | 登录态、滑块/验证码、签名参数、频控与 IP 封禁；选择器频繁变更，维护成本高。 |
| **法律风险** | 未经授权大规模抓取可能涉及不正当竞争、非法获取计算机信息系统数据等（视司法辖区与情节而定）。 |
| **数据质量** | 页面结构噪声大，字段缺失、假销量展示与真实成交不一致，直接进模型易偏。 |

**更稳妥替代**：淘宝开放平台/生意参谋等**官方或授权 API**；商家**后台导出**；**人工整理小样本** CSV 导入本仓库脚本做簇分析。

## 跨境 / 自采数据注意点

- 尊重 robots、站点 ToS 与当地法律；优先使用**明确许可**的数据集。
- 导入 `image_url` 时请确认链接允许你的使用场景（版权与肖像）。

## 全量更新 HF 数据

需联网执行，例如：

```bash
python scripts/build_cluster_data.py --full --download-mode force_redownload \
  --method hdbscan --preset fine --top-clusters 12
```

若本地缓存仍是旧子集，以 Hub 实际 `train` 大小为准；脚本会打印行数。
