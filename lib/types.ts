// ============================================================
// 全链路数据类型定义 — 每个 Skill 的输入输出
// 商家输入一次，数据自动流转到下游 Skill
// ============================================================

export interface ProductInput {
  category: string          // 类目（如：女装-连衣裙）
  priceRange: string        // 价格带（如：100-300）
  styleKeywords: string[]   // 风格关键词
  imageUrl?: string         // 灵感图
  costPrice?: number        // 采购成本
  /** 从商品链接解析（仅 id，无 API 时无标题价） */
  taobaoItemId?: string
  taobaoSkuId?: string
}

// Skill 1: AI 找款（跟爆款 → 对齐淘宝簇 → 簇级预期 → 测款 SOP）
export interface ClusterSalesBand {
  /** 同簇同价带在淘宝侧观测到的日销分位（件/天），非单 SKU 承诺销量 */
  p25: number
  p50: number
  p75: number
}

export interface TestPlan {
  /** 测款 SKU 角色：引流 / 利润 / 形象 等 */
  skuRoles: { role: string; spec: string }[]
  /** 观察窗口：首段看互动、次段看转化（天） */
  observePhase1Days: number
  observePhase2Days: number
  /** 直通车/场景等预算量级建议（文案） */
  budgetHint: string
  /** 止损与加码规则 */
  stopRules: string[]
}

export interface SupplyHint {
  /** 1688/外站货源匹配程度（与淘宝可卖性解耦） */
  status: 'matched' | 'weak' | 'unknown'
  note: string
}

export interface StyleCluster {
  id: string
  name: string              // 款式名（如：法式碎花V领连衣裙）
  tier: 'S' | 'A' | 'B'   // 爆款评分
  trendScore: number        // 趋势分 0-100
  trendReal: boolean        // 是否真实趋势（非假象）
  attributes: {
    neckline: string
    fabric: string
    length: string
    pattern: string
    season: string
  }
  trendSignals: string[]    // 趋势信号（如：近30天搜索+180%）
  designGenes: string[]     // 爆款基因（为什么好卖）
  priceRange: string        // 建议价格带
  riskNote: string
  extensions: Extension[]   // 延伸款方向
  imageUrl: string
  /** 落入该风格簇的淘宝侧有效样本数（相似款聚合） */
  clusterSampleSize: number
  /** 样本量与对齐质量综合置信度 */
  confidence: 'high' | 'mid' | 'low'
  salesBand: ClusterSalesBand
  /** 相对同类簇/同价带的表现位置描述 */
  bandCaption: string
  testPlan: TestPlan
  supplyHint: SupplyHint
}

export interface Extension {
  direction: 'A' | 'B' | 'C'
  risk: 'low' | 'mid' | 'high'
  description: string
  change: string
  /** 爆款延伸 · 款式线（品类/廓形/设计线，写入生图提示词） */
  styleLine?: string
  /** 爆款延伸 · 面料（材质、克重、垂感等） */
  fabric?: string
  /** 爆款延伸 · 版型（腰线、肩袖、裙长比例等结构约束） */
  fitSilhouette?: string
}

export interface Skill1Output {
  recommendations: StyleCluster[]
  marketOverview: {
    categoryGrowth: string
    avgPrice: number
    topKeywords: string[]
    competitionLevel: 'low' | 'mid' | 'high'
  }
}

// Skill 2: 上架优化
export interface Skill2Output {
  titles: {
    search: string          // 搜索导向
    seeding: string         // 种草导向
    promo: string           // 活动导向
  }
  mainImagePlan: MainImagePlan[]
  detailCopy: {
    hook: string            // 吸引眼球的开头
    features: string[]      // 核心卖点（3-5个）
    scene: string           // 场景描述
    faq: string[]           // 常见问题
  }
  skuSuggestion: {
    colors: string[]
    sizes: string[]
    hotCombo: string        // 预测最热 SKU
  }
  keywords: string[]        // 直通车初始关键词
}

export interface MainImagePlan {
  index: number
  role: string              // 主图角色（首图/细节/尺码/场景/促销）
  compositionGuide: string  // 构图建议
  copyText: string          // 图上文字
  bgStyle: string           // 背景风格
}

// Skill 3: 智能定价
export interface PricingOutput {
  currentStage: 'launch' | 'growth' | 'clearance'
  optimalPrice: number
  elasticityBeta: number    // 价格弹性
  elasticityConfidence: 'high' | 'mid' | 'low'
  priceSchedule: {
    launchPrice: number     // 新品引流价
    dailyPrice: number      // 日常价
    promoFloor: number      // 大促底价
  }
  profitSimulation: {
    price: number
    dailySales: number
    monthlyProfit: number
  }[]
  competitorRange: { min: number; avg: number; max: number }
  riskAlerts: string[]
}

// Skill 4: 评价诊断
export interface ReviewIssue {
  priority: 'P0' | 'P1' | 'P2'
  problem: string
  count: number
  fix: string
  fixTemplate: string       // 可直接复制的修复模板
  impact: string            // 预期改善效果
}

export interface Skill4Output {
  totalReviews: number
  positiveRate: number
  sentimentTrend: string
  dimensions: Record<string, { score: number; issues: string[] }>
  actionItems: ReviewIssue[]
  goodKeywords: string[]    // 好评关键词（回传 Skill 2）
}

// Skill 5: 推广诊断
export interface KeywordAction {
  keyword: string
  spend: number
  orders: number
  roi: number
  action: 'pause' | 'raise' | 'keep' | 'add'
  suggestion: string
}

export interface Skill5Output {
  healthScore: number
  overallROI: number
  industryROI: number
  diagnosis: string
  keywordActions: KeywordAction[]
  budgetSuggestion: {
    dailyBudget: number
    maxPPC: number
    peakHours: string[]
  }
  projectedImprovement: string
}

// Skill 6: 活动促销
export interface Skill6Output {
  eventType: string
  optimalDiscount: number
  optimalPrice: number
  marginAtOptimal: number
  expectedGMV: number
  timeline: {
    phase: 'warmup' | 'peak' | 'aftermath'
    dates: string
    action: string
  }[]
  profitScenarios: {
    label: string
    sales: number
    revenue: number
    profit: number
  }[]
  riskWarning?: string
}

// 全链路会话（跨 Skill 共享）
export interface PipelineSession {
  productInput: ProductInput
  skill1?: Skill1Output
  selectedStyle?: StyleCluster   // 从 Skill 1 选中的款
  skillTesting?: TestingOutput   // 测款结果
  skill2?: Skill2Output
  skill3?: PricingOutput
  skill4?: Skill4Output
  skill5?: Skill5Output
  skill6?: Skill6Output
}

// ============================================================
// 测款验证（选款 → 测款 → 放量 决策节点）
// ============================================================
export interface TestingInput {
  daysListed: number        // 上架天数
  ctr: number               // 点击率 %
  cvr: number               // 转化率 %
  addToCartRate: number     // 加购率 %
  favoriteRate: number      // 收藏率 %
  unitsSold: number         // 已售件数
  dailySpend: number        // 日均直通车花费（元）
  costPrice: number         // 采购成本（元）— 从首页移过来
}

/** 测款后：小模型修正区间 + 大模型综合叙述（正式环境接 qwen-max 等） */
export interface PostTestSalesFusion {
  /** 在测款前簇级区间上，按实测 CTR/CVR/ verdict 做的数值修正（结构化小模型） */
  modelAdjustedBand: { p25: number; p50: number; p75: number }
  modelAdjustmentNote: string
  /** LLM 读取：选品 S/A/B、原区间、测款表单、小模型修正带 → 输出经营语义 */
  llmNarrative: string
  /** 一句话：测款后日销预期判断 */
  unifiedVerdict: string
}

export interface TestingOutput {
  input: TestingInput
  score: number             // 综合评分 0–100
  verdict: 'scale' | 'pivot'
  confidence: 'high' | 'mid' | 'low'
  dimensionScores: {
    ctrScore: number; ctrVsBenchmark: string
    cvrScore: number; cvrVsBenchmark: string
    addToCartScore: number; addToCartVsBenchmark: string
    roiScore: number; roiActual: number
  }
  scaleEstimate?: {
    monthlyRevenue: number
    monthlyProfit: number
    breakEvenDays: number
    projectedMonthSales: number
  }
  pivotReason?: string
  recommendation: string
  nextActions: string[]
}

// ============================================================
// 模型推理步骤（加载动画用）
// ============================================================
export interface ModelStep {
  label: string           // "FAISS 向量检索中..."
  detail: string          // "扫描 2,847 款商品"
  durationMs: number      // 模拟耗时
  result?: string         // 步骤结果（完成后显示）
}

// 技术说明面板
export interface ModelInsight {
  skillId: number
  title: string
  steps: ModelStep[]       // 运行时显示的步骤
  algorithmCards: {        // 静态技术说明
    name: string           // "GATv2 图神经网络"
    desc: string           // 描述
    metric?: string        // "S_F1=0.59"
    source?: string        // 来源项目
  }[]
  dataSource: string       // 数据来源说明
}

// ============================================================
// 优化事件（闭环追踪）
// ============================================================
export interface OptimizationEvent {
  id: string
  skillId: number
  skillLabel: string
  changeType: string       // "title" | "price" | "keyword_bid" | ...
  changedAt: string        // ISO date string
  summary: string          // "修改标题 v1→v2"
  metricBefore: Record<string, number | string>
  metricAfter?: Record<string, number | string>
  impact?: string          // "CTR +28%，标题改动生效"
  nextAction?: string      // "建议优化主图"
  status: 'pending' | 'measured' | 'rolled_back'
}

// ============================================================
// 商品记录（管理看板用）
// ============================================================
export interface ProductRecord {
  id: string
  name: string
  category: string
  priceRange: string
  createdAt: string
  healthScore: number
  completedSkills: number[]
  session: PipelineSession
  changeLog: OptimizationEvent[]
  currentMetrics: {
    ctr?: number
    cvr?: number
    dailySales?: number
    positiveRate?: number
    roi?: number
  }
}

// ============================================================
// 选款归簇 + 数据闭环（MVP）
// ============================================================

export interface ClassifyClusterMatch {
  clusterId: number
  clusterName: string
  clusterType: 'structural' | 'trend'
  similarity: number
  tier: 'S' | 'A' | 'B'
}

export interface ClassifyResult {
  topClusters: ClassifyClusterMatch[]
  isNovelStyle: boolean
  /** 768-dim OpenCLIP embedding, kept for pending pool if novel */
  queryEmbedding: number[]
}

export interface TestFeedbackMetrics {
  daysListed: number
  ctr: number
  cvr: number
  addToCartRate: number
  favoriteRate: number
  unitsSold: number
  dailySpend: number
  avgPrice: number
}

export interface TestFeedback {
  id: string
  clusterId: number
  productImageEmbedding: number[]
  testMetrics: TestFeedbackMetrics
  verdict: 'scale' | 'optimize' | 'pivot'
  timestamp: string
}

export interface Percentiles {
  p25: number
  p50: number
  p75: number
}

export interface ClusterStats {
  clusterId: number
  sampleCount: number
  dataConfidence: 'ai' | 'early' | 'verified'
  metrics: {
    ctr: Percentiles
    cvr: Percentiles
    dailySales: Percentiles
    scaleRate: number
    pivotRate: number
  }
  trend: 'rising' | 'stable' | 'declining'
  lastUpdated: string
}

export interface TrendCluster {
  clusterId: number
  type: 'trend'
  name: string
  centroidEmbedding: number[]
  mosaicImages: string[]
  sampleCount: number
  createdAt: string
  status: 'active' | 'cooling'
}
