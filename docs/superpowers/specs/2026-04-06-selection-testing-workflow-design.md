# AI 选款测款业务流程设计

**日期**: 2026-04-06
**状态**: Draft
**方案**: 视觉归簇 + 用户数据闭环（方案 C）

---

## 1. 背景与问题

### 目标用户
淘宝中小商家（非品牌商、非工厂型），主要经营女装品类。

### 核心场景（按频率排序）
1. **爆品跟款**（最高频）：在抖音/小红书/速卖通/1688 看到一个卖得好的款，想判断能不能跟、怎么跟
2. **供应商筛款**：1688 供应商推了一批新款，要从中挑出最有潜力的
3. **模糊找款**：知道想做某个品类/风格，但还没确定具体款式

### 现有系统的问题
当前系统是"库存导向"——先展示 12 个簇让用户浏览选择。但用户的真实起点是"单品导向"：已经有一个具体的款，需要判断该不该跟。聚类模型应该是幕后分析引擎，而非前台入口。

---

## 2. 核心用户旅程

四步漏斗：**发现 → 评估 → 测试 → 决策**

### Step 1: 发现（贴图/贴链接）

用户贴一张商品主图或链接。

**系统处理流程：**
1. 提取主图（如果是链接，解析出图片 URL）
2. OpenCLIP (ViT-L-14) 生成 768 维 embedding
3. 计算与所有簇 centroid 的余弦相似度
4. 返回 top-3 最近簇 + 距离值
5. 距离阈值判断：若 max similarity 低于阈值，标记为"新兴款式/无匹配簇"
   - 阈值需用现有 933 条数据集做校准（OpenCLIP 服装图像余弦相似度通常在 0.5-0.8 区间），MVP 阶段先用 P10 分位数作为初始阈值，后续根据用户反馈调优

**链接解析 & 降级策略：**
- 支持的输入方式（优先级）：直接上传图片 > 粘贴图片 URL > 粘贴商品链接
- 链接解析失败（反爬、链接过期、平台不支持）时：提示用户截图/保存主图后直接上传
- 不做自动抓取商品页面，避免合规风险

**图片预处理：**
- 统一 resize 到 224×224（OpenCLIP ViT-L-14 标准输入尺寸）
- RGB 归一化（mean=[0.48, 0.46, 0.41], std=[0.27, 0.26, 0.28]）
- 预处理步骤对相似度得分有显著影响，必须与簇 centroid 构建时的预处理保持一致

**已有基础：**
- `app/api/embed-query-image/route.ts` — OpenCLIP embedding 接口
- `lib/finder-cluster-rank.ts` — visual sort 逻辑（cosine similarity with centroid）
- `lib/taobao-url.ts` — 淘宝链接解析

**需要改造：** 将"视觉排序整个簇列表"改为"单品归簇查询"接口。

### Step 2: 评估（簇级洞察）

归簇后，系统展示该簇的群体智慧：

| 信息维度 | 内容 | 数据来源 |
|---------|------|---------|
| 簇画像 | 代表款式 mosaic、风格关键词、价带分布 | 现有 cluster-data.json |
| 簇表现 | 平均 CTR/CVR/日销（分位数分布） | 群体回流数据 / 冷启动锚点 |
| S/A/B 评级 | 基于簇级群体数据的动态评级 | 群体数据驱动（替代现有静态规则） |
| 跟款建议 | 上升期/成熟期/衰退期判断 | 趋势分析（近 30 天数据变化） |
| 差异化方向 | 簇内哪些子方向还有空间 | MVP 后迭代 |

**数据置信度标签（对用户透明）：**

| 簇内回流数据量 | 展示内容 | 信心标签 |
|---------------|---------|---------|
| 0 条 | 模型预测 + 跨境趋势参考 + 锚点判断 | "AI 分析" |
| 1-9 条 | 模型预测 + 少量真实数据点 | "早期数据" |
| 10+ 条 | 群体数据驱动的统计值 | "群体验证" |

### Step 3: 测试（用户上架后回传数据）

用户决定跟款后：
1. 系统生成测款 SOP（已有 TestPlan 模块：SKU 角色、观察窗口、止损线）
2. 用户上架并开始投放
3. 用户回传实际数据（表单，复用现有 testing 页面改造）

### Step 4: 决策（加推 or 放弃）

1. 融合模型对比簇级 benchmark
2. 输出明确判断：加推 / 优化后再观察 / 放弃
3. 用户确认实际决策
4. **数据回流**：该条记录更新簇级统计

---

## 3. 冷启动策略

### Layer 1: 种子数据（Day 0）

- HuggingFace 数据集（933 条 clothing-sales-data）→ 12 簇基线
- 对每个簇手动标注锚点判断：阶段（上升/成熟/衰退）、典型价带、竞争度、适合的商家类型
- 跨境数据（速卖通/Shein 公开趋势）作为外站参考信号

### Layer 2: 早期用户回流（Day 1-30）

- 免费换数据：测款工具免费使用，需回传测款结果
- 匿名聚合：只聚合到簇级，不暴露个人数据
- 即时反馈：回传数据后展示"你在这个簇里排第 X 名"

### Layer 3: 群体智慧成熟（Day 30+）

- S/A/B 评级从模型预测切换为群体数据驱动
- CTR/CVR benchmark 从行业平均值切换为簇级真实分布
- 新用户看到同行真实表现

---

## 4. 技术架构

### 现有能力映射

| 现有模块 | 新流程角色 |
|---------|-----------|
| OpenCLIP embedding | Step 1: 归簇引擎 |
| UMAP + HDBSCAN/KMeans | 簇库构建 & 增量重建（含站外新趋势发现） |
| `finder-cluster-rank.ts` | Step 2: 簇级排序展示 |
| `finder-cluster-model.ts` | Step 2: S/A/B 评级（改为数据驱动） |
| `testing-sales-predict.ts` | Step 4: 测后决策融合 |
| 12 结构轴语义标签 | Step 2: 簇画像风格描述 |
| 跨境聚类 skill | 站外爆品采集 → 新兴趋势簇发现 |

### 需新建模块

#### 4.0 两层簇架构（结构簇 + 趋势簇）

簇不再是固定 12 个。分为两层：

**结构簇（Structural Clusters）**：基于品类结构的稳定簇（连衣裙/T恤/裤装等），由初始 HF 数据集 + 历史积累构建，变化缓慢。对应现有 12 个簇。

**趋势簇（Trend Clusters）**：由站外爆品数据和用户提交的"无匹配"商品自动催生，捕捉新兴风格趋势。生命周期短，可能几周后被吸收进结构簇或消亡。

**趋势簇催生机制：**

1. 用户贴图归簇时，若 `isNovelStyle = true`（与所有现有簇距离都很远），该 embedding 进入 **待归池（pending pool）**，存储到 `data/pending-embeddings/`
2. 站外爆品数据（通过 cross-border-bestseller-cluster skill 采集的 CSV）导入时，同样先尝试归入现有簇，无法归入的进入待归池
3. **定期扫描**（每周或待归池达到 N=20 条时触发）：对待归池跑 HDBSCAN
   - 若发现密集子簇（min_cluster_size=5），自动创建趋势簇
   - 趋势簇自动生成：centroid embedding、mosaic 图、临时风格标签
   - 未成簇的散点继续留在待归池
4. **趋势簇生命周期**：
   - 创建时标记 `type: 'trend'`，带创建时间戳
   - 若 30 天内有 3+ 用户对该簇内的款进行测款 → 升级为结构簇
   - 若 60 天内无新数据流入 → 标记为"冷却"，不再在首页推荐

**对 MVP 的影响：**
- 结构簇 12 个保持不变，MVP 第一天就可用
- 趋势簇催生是 MVP 的第 6 个功能点（不是"后续迭代"，而是核心差异化）
- 实现复杂度可控：你已有 HDBSCAN pipeline，只需加一个 pending pool + 定期触发

#### 4.1 单品归簇 API

```typescript
// POST /api/classify-product
// Input: { imageUrl: string } | { imageBase64: string }
// Output: {
//   topClusters: Array<{
//     clusterId: number
//     clusterName: string
//     clusterType: 'structural' | 'trend'
//     similarity: number  // 0-1
//     tier: 'S' | 'A' | 'B'
//   }>
//   isNovelStyle: boolean  // 低于校准阈值 → embedding 进入待归池
// }
```

#### 4.2 测款数据收集

```typescript
interface TestFeedback {
  clusterId: number
  productImageEmbedding: number[]  // 768-dim
  testMetrics: {
    daysListed: number
    ctr: number
    cvr: number
    addToCartRate: number
    favoriteRate: number
    unitsSold: number
    dailySpend: number
    avgPrice: number
  }
  verdict: 'scale' | 'optimize' | 'pivot'
  timestamp: string
}
```

#### 4.3 簇级统计聚合

```typescript
interface ClusterStats {
  clusterId: number
  sampleCount: number
  dataConfidence: 'ai' | 'early' | 'verified'
  metrics: {
    ctr: { p25: number, p50: number, p75: number }
    cvr: { p25: number, p50: number, p75: number }
    dailySales: { p25: number, p50: number, p75: number }
    scaleRate: number   // 加推占比
    pivotRate: number   // 放弃占比
  }
  trend: 'rising' | 'stable' | 'declining'
  lastUpdated: string
}
```

### 数据存储（MVP）

MVP 阶段使用 JSON 文件 + Zustand：
- `lib/cluster-data.json` — 结构簇库（现有，只读）
- `lib/trend-clusters.json` — 趋势簇库（新建，由 pending pool 催生）
- `lib/cluster-stats.json` — 簇级统计（新建，初始为锚点数据）
- `data/test-feedback/` — 测款回流数据（append-only，每条记录一个 JSON 文件，文件名为 `{timestamp}-{uuid}.json`，避免并发写入冲突）
- `data/pending-embeddings/` — 待归池（无法归入现有簇的 embedding，用于催生趋势簇）

**并发安全：** 不使用单文件存储回流数据。每次提交写入独立文件，簇级统计定时重算（见下方触发策略）。

**统计聚合触发：**
- 每次用户提交 feedback 后，同步更新对应簇的内存统计（Zustand store）
- 每小时异步任务扫描 `data/test-feedback/` 目录重算 `cluster-stats.json`（确保一致性）
- MVP 阶段数据量极小（< 1000 条），全量重算无性能问题

后续迁移到 Supabase/PostgreSQL。

### 前端改造

| 改动 | 内容 |
|-----|------|
| 首页 | 从聊天框改为"贴图/贴链接"的单一输入 |
| 归簇结果页 | 新页面，展示归簇结果 + 簇级洞察；趋势簇标记"新趋势"标签 |
| Finder | 保留为二级功能（"浏览簇库"模式），结构簇和趋势簇分 tab 展示 |
| Testing | 改造为"测款跟踪"，支持多款管理 + 数据回传 |

---

## 5. MVP 范围

### 必须做

| # | 功能 | 理由 | 基础 |
|---|------|------|------|
| 1 | 贴图归簇 | 核心入口 | OpenCLIP + centroid similarity 已就绪 |
| 2 | 簇级洞察展示 | 归簇后要看到价值 | 12 簇 + S/A/B + 风格标签已有 |
| 3 | 测款 SOP 生成 | 跟款后需要执行指南 | TestPlan 模块已有 |
| 4 | 测款数据回传表单 | 数据闭环入口 | testing 页面表单改造 |
| 5 | 簇级统计更新 | 回传数据要体现价值 | 新建，逻辑简单 |
| 6 | 趋势簇催生 | 核心差异化：发现国内还没出现的新趋势 | HDBSCAN pipeline 已有，加 pending pool + 定期触发 |

### 不做（后续迭代）

| 功能 | 原因 |
|------|------|
| 批量筛款（供应商场景） | 先跑通单品流程 |
| 差异化方向推荐 | Extension Lab 已有，先不接 |
| 下游技能（Listing/定价/评论/广告/促销） | 等核心闭环验证后再开 |
| 数据库 | JSON 文件先跑，数据量很小 |

### MVP 用户旅程

```
用户贴一张爆品图
    ↓
系统 3 秒返回：「这个款属于 [法式碎花连衣裙] 簇，
  当前评级 A，簇内平均日销 XX，建议跟款」
    ↓
用户点「开始测款」→ 生成 SOP（几天测、花多少钱、看什么指标）
    ↓
用户上架后回来填写实际数据
    ↓
系统判断：加推 / 再观察 / 放弃
    ↓
这条数据默默回流到簇级统计
```

---

## 6. 性能与响应时间

- 归簇查询目标：< 5 秒端到端（含图片下载 + embedding + similarity）
- OpenCLIP 推理本身约 0.5-1 秒（GPU）/ 3-5 秒（CPU）
- 首次调用有冷启动延迟（模型加载），需预热策略或 loading 动画
- 12 个 centroid 的余弦相似度计算可忽略不计

---

## 7. 成功标准

- 归簇准确率：用户主观认可归簇结果 > 80%（通过归簇结果页的"准确/不准确"按钮收集）
- 用户回传率：使用测款 SOP 的用户中 > 30% 回传测款数据（通过测款跟踪页的完成率统计）
- 留存指标：测过一次的用户 7 日内再次贴图测款 > 40%（通过用户活跃记录统计）

---

## 7. 被拒绝的方案

### 方案 A: 纯视觉分析工具
不依赖站内数据，纯 AI 分析。被拒绝原因：没有真实数据校准，预测可信度不够，用户无法建立信任。

### 方案 B: 接入第三方数据
接入生意参谋/知瓜等数据服务。被拒绝原因：成本高、依赖第三方、合规风险，不如用户自有数据真实。
