# 大促操盘管线 — 设计规格

## 概述

将现有 Skill 3（智能定价）和 Skill 6（活动促销）升级为一个 6 步管线页面「大促操盘」，为淘宝中小卖家提供单品级的促销定价全链路 AI 助手。

**核心区别**：我们面向个体卖家做单品定价+促销素材生成。采用管线流、收敛图、Agent Stream 等交互范式，业务逻辑完全针对单品场景设计。

**路由**：`/campaign`（新建），保留原 `/skills/pricing` 和 `/skills/promo` 作为精简入口。

---

## 架构

### 页面结构

```
/campaign
├── Sidebar（左侧）
│   ├── AI 操盘中枢（管线入口）
│   ├── 折扣洞察分析（未来扩展）
│   └── 历史任务列表（最近创建的管线任务）
├── TopBar（顶部状态栏）
│   ├── 任务名称 + 状态标签（执行中/待审核/已完成）
│   ├── 任务 hash + 步骤进度 (n/6)
│   └── 实时操作提示
├── PipelineStepper（6 步管线进度条）
│   └── 6 个圆形图标 + 渐变连线（已完成→绿 / 进行中→琥珀 / 待做→灰）
├── StepContent（步骤内容区，根据当前步骤渲染）
│   ├── Step1Intent
│   ├── Step2DataProfile
│   ├── Step3Pricing
│   ├── Step4RiskReview
│   ├── Step5Assets
│   └── Step6Deploy
└── AgentStream（底部终端面板，可折叠）
    └── 模拟后端日志流（SYS_CALC [ELASTICITY]、[OPTIMIZATION] 等）
```

### 状态管理

扩展 Zustand store，新增 `campaignPipeline` 切片：

```typescript
interface CampaignPipeline {
  // 任务元数据
  taskId: string
  taskName: string
  status: 'draft' | 'running' | 'review' | 'done'
  currentStep: 1 | 2 | 3 | 4 | 5 | 6

  // Step 1: 促销意图
  intent: {
    eventType: '618' | 'double11' | 'daily' | 'clearance' | 'custom'
    targetMargin: number      // 0.15 ~ 0.70
    maxDiscount: number       // 0.5 ~ 0.95 (5折~95折)
    salesTarget: number       // 目标销量
    inventoryLimit: number    // 可售库存
  } | null

  // Step 2: 数据画像
  dataProfile: {
    recentSales: { date: string; qty: number; revenue: number }[]
    competitorPrices: { name: string; price: number }[]
    elasticityBeta: number
    elasticityMethod: 'DID' | 'LGBM'
    inventoryDays: number
    historyPromoEffect: { event: string; discount: number; salesLift: number }[]
  } | null

  // Step 3: 智能定价
  pricing: {
    iterations: { round: number; price: number; margin: number; dailySales: number; gmv: number }[]
    converged: boolean
    dailyPrice: number
    promoPrice: number
    floorPrice: number
    profitScenarios: { label: string; dailySales: number; totalProfit: number; note: string }[]
  } | null

  // Step 4: 风控确认
  riskReview: {
    checks: { type: 'block' | 'warn' | 'pass'; label: string; detail: string; resolved: boolean }[]
    userConfirmed: boolean
    adjustedPrice: number | null   // 用户手动调整后的价格，null 表示接受建议
  } | null

  // Step 5: 促销素材
  assets: {
    items: {
      id: string
      type: 'main_image' | 'coupon_overlay' | 'detail_header' | 'promo_badge' | 'video_cover'
      label: string
      status: 'pending' | 'generating' | 'done' | 'error'
      imageUrl: string | null
      score: number | null
    }[]
    phonePreviewReady: boolean
  } | null

  // Step 6: 确认执行
  deployment: {
    checklist: { action: string; scheduledDate: string; done: boolean }[]
    savedToProductLibrary: boolean
  } | null

  // Agent Stream 日志
  agentLogs: { timestamp: string; tag: string; level: 'info' | 'success' | 'error'; message: string }[]
}
```

### 数据流

```
已有 Skill 1~5 数据（store 中）
        │
        ▼
Step 1: 促销意图 ← 用户配置约束参数
        │
        ▼
Step 2: 数据画像 ← 从 store 读取 + 生成 mock 销售趋势/竞品数据
        │
        ▼
Step 3: 智能定价 ← Step 1 约束 + Step 2 弹性数据 → Lagrangian 优化（mock）
        │
        ▼
Step 4: 风控确认 ← Step 3 价格方案 → 三层检查 → 用户确认/调整
        │
        ▼
Step 5: 促销素材 ← Step 4 确认价格 → AI 生图（先 mock，后接真实 API）
        │
        ▼
Step 6: 确认执行 ← 汇总全部决策 → 保存商品库
```

---

## Step 1: 促销意图

**目的**：卖家设定促销目标和约束，系统自动融合已有 Skill 数据。

**UI 组成**：
1. **活动类型选择器**：618/双11/日常打折/清仓/自定义，横排 Chip 按钮
2. **商品上下文卡片**：自动从 store 读取商品名、日常价、成本、弹性 β、竞品均价、库存，不可编辑（只展示）
3. **约束滑块**（两个）：
   - 目标毛利率：15%~70%，默认 40%
   - 最大折扣力度：5折~95折，默认 7折
4. **补充信息行**：库存约束（自动计算可支撑天数）、销量目标（可编辑输入框）
5. **启动按钮**：「启动 AI 智能定价」

**交互**：选择活动类型后，约束滑块预设值自动调整（如"清仓"默认毛利 15%、折扣 5折）。点击启动后进入 Step 2。

---

## Step 2: 数据画像

**目的**：模拟 BI 数据拉取和特征工程过程，展示该商品的数据全貌。

**UI 组成**：
1. **数据拉取动画**：依次点亮数据源标签（近期销售、竞品价格、库存/库龄、历史促销、价格弹性），每个带 ✓ 完成状态
2. **弹性估计面板**：
   - 方法标签：DID 或 LGBM
   - 弹性中位数（如 β=-1.8）
   - MAE 训练曲线小图（模拟 epoch 收敛）
3. **商品画像摘要卡片**（网格布局）：
   - 近 7 天日均销量 + 趋势箭头
   - 竞品价格区间
   - 库龄/库存健康度
   - 历史大促效果（上次 618 销量提升 x%）

**动画**：数据源依次加载（0.5s 间隔），日志流同步输出到 Agent Stream。弹性估计完成后自动进入 Step 3。

---

## Step 3: 智能定价

**目的**：Lagrangian 约束优化求解，可视化收敛过程，输出三档价格方案。

**UI 组成**：
1. **求解面板**（左侧）：
   - 目标函数 + 约束条件（数学公式展示）
   - 迭代日志（逐行出现：迭代 n → price=¥x, 毛利 y%, 日销 z件, GMV ¥w）
   - 收敛标记（最后一行高亮 ← 收敛 ✓）
2. **收敛图**（右侧）：
   - 双轴折线图：GMV（绿线）vs 毛利率（琥珀线）
   - 目标毛利虚线参考线
   - X 轴为价格档位，收敛点标星
3. **三档价格卡片**：
   - 日常价（维持 Skill 3 建议）
   - 大促价（推荐，高亮+发光边框）
   - 极限底价（7折底线，带库存警告）
4. **三情景利润预测**：悲观 P10 / 中性 P50 / 乐观 P90，含日销、总利润、达标状态

**动画**：迭代日志逐行追加（0.3s 间隔），收敛图数据点同步出现，完成后三档卡片淡入。

---

## Step 4: 风控确认

**目的**：三层风控检查 + 人工确认/调整定价方案。

**UI 组成**：
1. **风控摘要栏**：通过 n 项 / 预警 n 项 / 拦截 n 项（绿/黄/红色标签）
2. **检查项列表**：
   - 每项：类型标签（通过/预警/拦截）+ 检查名称 + 详情说明 + 操作按钮
   - 拦截项：红色底，需要「采纳建议」或「忽略」
   - 预警项：黄色底，可展开查看详情
   - 通过项：绿色底，折叠展示
3. **价格调整区**（如果用户想手动调整）：
   - 当前建议价展示
   - 「手动调整价格」输入框
   - 实时计算调整后毛利率、日销预测
4. **确认按钮**：「确认定价方案 → 生成素材」

**风控规则**（mock 数据）：
- Hard Block：大促价 < 成本价 → 拦截
- 预警：大促价低于竞品均价 20% 以上 → 可能触发价格战
- 预警：库存 < 目标销量 → 可能断货
- 通过：毛利率达标、价格在合理区间

---

## Step 5: 促销素材生成

**目的**：基于确认后的定价方案，AI 生成单品促销素材，手机端预览。

**UI 组成**（左右分栏）：

**左侧 — 素材生成列表**：
1. 子步骤条：解析方案 → 确认素材类型 → 并行生成 → 预览确认
2. 进度条 + 完成计数（n/5 张）
3. 素材卡片列表（5 种）：
   - 活动主图：618 限时特惠 + 到手价
   - 优惠券贴片：满减券样式
   - 详情页头图：活动氛围 + 倒计时
   - 促销角标：主图角标（8.2折 + 到手价）
   - 短视频封面：竖版视频封面图
   - 每个素材：缩略图 + 类型标签 + 标题 + 质量分 + 重新生成按钮

**右侧 — 淘宝商品详情页模拟器**：
1. 手机壳外框（模拟 iPhone）
2. 淘宝 App 顶部导航栏（橙色）
3. 商品主图区（含角标覆盖层）
4. 优惠券栏
5. 商品标题（含 618 标签）
6. 活动氛围图（倒计时）
7. 底部操作栏（立即购买 / 加购物车）
8. 价格标签自动从 Step 4 确认价格填充

**图片生成策略**：
- Phase 1（当前）：使用 mock 图片 URL + 渐进加载动画模拟生成过程
- Phase 2（后续）：接入真实 AI 图像生成 API（Seedream/Flux/Gemini）

---

## Step 6: 确认执行

**目的**：汇总全部决策，生成执行清单，保存到商品库。

**UI 组成**：
1. **决策总览卡片**：
   - 活动类型 + 商品名
   - 定价：日常价 → 大促价（折扣力度、毛利率）
   - 素材：n 张已生成
   - 风控：全部通过 / n 项已处理
2. **执行 Checklist**（时间线形式）：
   - T-7天：上传活动主图到淘宝后台
   - T-3天：设置优惠券
   - T-1天：切换促销价
   - T+0天：活动开始，监控销量
   - T+n天：活动结束，恢复日常价
3. **操作按钮**：
   - 「保存至商品库」→ 写入 store 的 productHistory
   - 「下载素材包」→ 打包所有生成图片
   - 「分析下一个商品」→ 返回首页

---

## 组件清单

### 新建组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `CampaignPage` | `app/campaign/page.tsx` | 管线页面主入口 |
| `CampaignSidebar` | `components/campaign/CampaignSidebar.tsx` | 左侧导航 + 历史任务 |
| `PipelineStepper` | `components/campaign/PipelineStepper.tsx` | 6 步进度条 |
| `AgentStream` | `components/campaign/AgentStream.tsx` | 底部日志终端面板 |
| `Step1Intent` | `components/campaign/Step1Intent.tsx` | 促销意图配置 |
| `Step2DataProfile` | `components/campaign/Step2DataProfile.tsx` | 数据画像 |
| `Step3Pricing` | `components/campaign/Step3Pricing.tsx` | 运筹定价 |
| `Step4RiskReview` | `components/campaign/Step4RiskReview.tsx` | 风控审核 |
| `Step5Assets` | `components/campaign/Step5Assets.tsx` | 素材生成 + 手机预览 |
| `Step6Deploy` | `components/campaign/Step6Deploy.tsx` | 确认执行 |
| `PhonePreview` | `components/campaign/PhonePreview.tsx` | 淘宝详情页手机模拟器 |
| `ConvergenceChart` | `components/campaign/ConvergenceChart.tsx` | 拉格朗日收敛图（Recharts） |
| `RiskCheckList` | `components/campaign/RiskCheckList.tsx` | 风控检查项列表 |

### 复用现有组件

- `MetricCard` — 数据展示卡片
- `AlgorithmStepper` — 算法步骤可视化（Step 2 弹性估计）
- `LoadingSteps` — 加载动画（各步骤过渡时使用）
- `Badge` / `Card` / `Progress` / `Tabs` — shadcn/ui 基础组件

### 新增 Mock 数据

| 文件 | 内容 |
|------|------|
| `lib/mock-campaign.ts` | 完整管线 mock 数据（6 步全覆盖） |

---

## Agent Stream 设计

底部固定面板，高度 ~160px，可通过左侧箭头按钮折叠/展开。

**日志格式**：
```
23:38:48  SYS_CALC  [ELASTICITY]
          正在基于历史数据估计价格弹性系数...

23:38:54  SYS_CALC  [ELASTICITY]
          ✅ 弹性估计 完成 · 中位数: -1.80

23:38:55  SYS_CALC  [OPTIMIZATION]
          🔧 执行 策略方案生成(target_margin=0.4, max_discount=0.7)
```

**实现**：不需要真实后端，前端用 `setTimeout` 序列模拟日志追加，每条日志 300-500ms 间隔。日志数组存在 `campaignPipeline.agentLogs` 中。面板自动滚动到底部，用户手动上滚时暂停自动滚动。

---

## 动画与过渡

1. **步骤切换**：Stepper 进度线渐变动画（0.6s ease），当前步骤图标放大+发光
2. **数据拉取（Step 2）**：数据源标签依次亮起（0.5s 间隔），配合 Agent Stream 日志
3. **迭代求解（Step 3）**：迭代日志逐行追加（0.3s），收敛图数据点同步出现
4. **素材生成（Step 5）**：素材卡片逐个从 pending → generating（spinner） → done（缩略图淡入）
5. **通用**：使用 Framer Motion 的 `AnimatePresence` + `motion.div` 做进出场动画

---

## Store 集成

### 与现有 PipelineStore 的关系

`campaignPipeline` 是 Zustand store 中与 `PipelineSession` 并列的独立切片。它**读取**已有 Skill 数据作为输入，但**不修改**它们：

- Step 1 读取 `store.skill3.priceSchedule.dailyPrice`（日常价）、`store.skill3.elasticityBeta`（弹性系数）、`store.productInput`（商品信息）
- Step 2 的弹性数据引用 `store.skill3.elasticityBeta`，竞品数据引用 `store.skill3.competitorRange`
- Step 6 保存时调用已有 `store.saveCurrentProduct()`，同时将 `campaignPipeline` 写入 `ProductRecord.campaignSnapshot`

campaign pipeline 不回写 `skill3` 或 `skill6`。两套数据独立存在，原 Skill 3/6 页面不受影响。

### Zustand Actions

```typescript
interface CampaignActions {
  // 初始化
  createCampaign: (name: string) => void
  loadCampaign: (taskId: string) => void

  // 步骤推进
  advanceStep: () => void
  goToStep: (step: 1|2|3|4|5|6) => void  // 仅允许回到已完成步骤

  // Step 1
  setCampaignIntent: (intent: CampaignPipeline['intent']) => void

  // Step 2 (auto-run)
  runDataProfile: () => void

  // Step 3 (auto-run after Step 2)
  runPricing: () => void

  // Step 4
  confirmRiskReview: (adjustedPrice?: number) => void

  // Step 5
  generateAssets: () => void
  regenerateAsset: (assetId: string) => void

  // Step 6
  deployCampaign: () => void

  // Agent Stream
  appendLog: (log: AgentLog) => void
}
```

### 步骤导航规则

- **前进**：仅当前步骤完成后可进入下一步（`advanceStep` 校验）
- **后退**：可回到任意已完成步骤（`goToStep` 允许 step ≤ currentStep）
- **回退失效**：回到 Step 1 修改参数后，Steps 2-6 数据重置为 null，需重新运行
- **自动推进**：Step 2 完成后自动进入 Step 3；Step 5 全部素材生成后自动展示预览确认

### 确认价格的规范路径

```typescript
// 唯一的"确认价格"来源
const confirmedPrice = campaignPipeline.riskReview?.adjustedPrice
  ?? campaignPipeline.pricing?.promoPrice
```

Step 5 素材中的所有价格标签均从此派生。

---

## 布局方案

使用 Next.js route group 避免全局 Sidebar 冲突：

```
app/
├── (main)/              # 现有路由组
│   ├── layout.tsx       # 全局 Sidebar
│   ├── page.tsx
│   ├── products/
│   └── skills/
└── (campaign)/          # 新路由组
    ├── layout.tsx       # CampaignSidebar + AgentStream 布局
    └── campaign/
        └── page.tsx
```

`(campaign)/layout.tsx` 渲染 CampaignSidebar（左侧）和 AgentStream（底部），不使用全局 Sidebar。

**响应式**：Phase 1 仅支持桌面端（≥1024px）。窄屏显示提示"请在桌面端使用大促操盘功能"。

---

## 错误与边界状态

- **无商品时进入 /campaign**：显示空状态引导卡片，提示先在首页选择/输入商品
- **Skill 3 未运行**：Step 1 商品上下文卡片中标注"日常价未设定"，使用默认竞品均价填充
- **Step 1 表单校验**：目标毛利率、最大折扣为必填（滑块有默认值，不会为空）；销量目标可选（默认根据历史日销 ×3）
- **Mock 模拟"失败"**：不模拟失败状态，所有 mock 流程保证成功完成

---

## 不做的事情

- 不做真实后端 API 调用（全部 mock 数据 + 前端模拟）
- 不做用户登录/鉴权
- 不做多商品批量操作（保持单品焦点）
- 不做 Agent Stream 的 WebSocket 连接（纯前端 setTimeout 模拟）
- Phase 1 不接入真实 AI 图像生成（mock 图片 URL）
- 不替换原有 Skill 3/6 页面（保留为精简入口）
- 不做移动端适配（桌面端优先）
