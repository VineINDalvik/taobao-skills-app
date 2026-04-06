import type { CampaignPipeline, AgentLog, CampaignTaskSummary } from './campaign-types'

export const MOCK_CAMPAIGN: CampaignPipeline = {
  taskId: 'campaign-618-001',
  taskName: '618 女装大促 · 法式碎花连衣裙',
  status: 'review',
  currentStep: 5,

  intent: {
    eventType: '618',
    targetMargin: 0.4,
    maxDiscount: 0.7,
    salesTarget: 200,
    inventoryLimit: 320,
  },

  dataProfile: {
    recentSales: [
      { date: '2026-03-23', qty: 8, revenue: 1352 },
      { date: '2026-03-24', qty: 11, revenue: 1859 },
      { date: '2026-03-25', qty: 7, revenue: 1183 },
      { date: '2026-03-26', qty: 13, revenue: 2197 },
      { date: '2026-03-27', qty: 9, revenue: 1521 },
      { date: '2026-03-28', qty: 15, revenue: 2535 },
      { date: '2026-03-29', qty: 18, revenue: 3042 },
      { date: '2026-03-30', qty: 10, revenue: 1690 },
      { date: '2026-03-31', qty: 12, revenue: 2028 },
      { date: '2026-04-01', qty: 14, revenue: 2366 },
      { date: '2026-04-02', qty: 16, revenue: 2704 },
      { date: '2026-04-03', qty: 11, revenue: 1859 },
      { date: '2026-04-04', qty: 19, revenue: 3211 },
      { date: '2026-04-05', qty: 22, revenue: 3718 },
    ],
    competitorPrices: [
      { name: '韩都衣舍旗舰店', price: 159 },
      { name: '拉夏贝尔官方', price: 179 },
      { name: 'MG小象女装', price: 129 },
      { name: '茵曼旗舰店', price: 149 },
      { name: '裂帛官方店', price: 139 },
    ],
    elasticityBeta: -1.8,
    elasticityMethod: 'DID',
    inventoryDays: 42,
    historyPromoEffect: [
      { event: '38女王节', discount: 0.8, salesLift: 2.3 },
      { event: '双11', discount: 0.65, salesLift: 4.1 },
    ],
  },

  pricing: {
    iterations: [
      { round: 1, price: 169, margin: 0.52, dailySales: 14, gmv: 2366 },
      { round: 2, price: 155, margin: 0.46, dailySales: 19, gmv: 2945 },
      { round: 3, price: 145, margin: 0.42, dailySales: 24, gmv: 3480 },
      { round: 4, price: 139, margin: 0.40, dailySales: 28, gmv: 3892 },
      { round: 5, price: 139, margin: 0.40, dailySales: 28, gmv: 3892 },
    ],
    converged: true,
    dailyPrice: 169,
    promoPrice: 139,
    floorPrice: 119,
    profitScenarios: [
      {
        label: '保守场景',
        dailySales: 18,
        totalProfit: 12960,
        note: '日均18件，毛利率40%，持续10天',
      },
      {
        label: '基准场景',
        dailySales: 28,
        totalProfit: 20160,
        note: '日均28件，毛利率40%，持续10天',
      },
      {
        label: '乐观场景',
        dailySales: 40,
        totalProfit: 28800,
        note: '日均40件，叠加会场流量，毛利率40%',
      },
    ],
  },

  riskReview: {
    checks: [
      {
        type: 'pass',
        label: '库存充足',
        detail: '当前库存320件，预计大促消耗200件，剩余120件可支撑42天日常销售',
        resolved: true,
      },
      {
        type: 'warn',
        label: '竞品价格偏低',
        detail: 'MG小象同款定价¥129，低于促销价¥139，可能影响转化率',
        resolved: false,
      },
      {
        type: 'warn',
        label: '历史退货率偏高',
        detail: '该品类近30天退货率18.5%，高于女装均值14%，建议优化尺码描述',
        resolved: false,
      },
    ],
    userConfirmed: false,
    adjustedPrice: null,
  },

  assets: {
    items: [
      {
        id: 'asset-001',
        type: 'main_image',
        label: '主图 · 618氛围',
        status: 'done',
        imageUrl: 'https://placehold.co/800x800/FFE4E1/D63384?text=618+%E4%B8%BB%E5%9B%BE',
        score: 87,
      },
      {
        id: 'asset-002',
        type: 'coupon_overlay',
        label: '优惠券贴片',
        status: 'done',
        imageUrl: 'https://placehold.co/400x200/FFF3CD/856404?text=%E9%A2%86%E5%88%B830%E5%85%83%E5%88%B8',
        score: 92,
      },
      {
        id: 'asset-003',
        type: 'detail_header',
        label: '详情页头图',
        status: 'done',
        imageUrl: 'https://placehold.co/750x400/E8F5E9/2E7D32?text=%E8%AF%A6%E6%83%85%E9%A1%B5%E5%A4%B4%E5%9B%BE',
        score: 79,
      },
      {
        id: 'asset-004',
        type: 'promo_badge',
        label: '促销角标',
        status: 'generating',
        imageUrl: null,
        score: null,
      },
      {
        id: 'asset-005',
        type: 'video_cover',
        label: '短视频封面',
        status: 'pending',
        imageUrl: null,
        score: null,
      },
    ],
    phonePreviewReady: false,
  },

  deployment: {
    checklist: [
      { action: 'T-7: 提交活动报名材料', scheduledDate: '2026-06-11', done: true },
      { action: 'T-3: 上传促销主图 & 详情页', scheduledDate: '2026-06-15', done: false },
      { action: 'T-1: 设置优惠券 & 满减规则', scheduledDate: '2026-06-17', done: false },
      { action: 'T+0: 618开场检查 & 实时监控', scheduledDate: '2026-06-18', done: false },
      { action: 'T+n: 复盘报告 & 库存调整', scheduledDate: '2026-06-25', done: false },
    ],
    savedToProductLibrary: false,
  },

  agentLogs: [
    { timestamp: '2026-04-06T09:00:01Z', tag: 'intent', level: 'info', message: '开始创建 618 大促任务' },
    { timestamp: '2026-04-06T09:00:02Z', tag: 'intent', level: 'info', message: '目标毛利率 40%，最大折扣 7折' },
    { timestamp: '2026-04-06T09:00:03Z', tag: 'intent', level: 'success', message: '促销意图配置完成' },
    { timestamp: '2026-04-06T09:01:00Z', tag: 'data', level: 'info', message: '正在拉取近14天销售数据…' },
    { timestamp: '2026-04-06T09:01:05Z', tag: 'data', level: 'info', message: '获取到 14 天数据，日均 13.2 件' },
    { timestamp: '2026-04-06T09:01:08Z', tag: 'data', level: 'info', message: '抓取竞品价格：5 家店铺' },
    { timestamp: '2026-04-06T09:01:12Z', tag: 'data', level: 'info', message: 'DID 弹性估计 β = -1.8' },
    { timestamp: '2026-04-06T09:01:15Z', tag: 'data', level: 'success', message: '数据画像构建完成' },
    { timestamp: '2026-04-06T09:02:00Z', tag: 'pricing', level: 'info', message: '启动迭代定价引擎…' },
    { timestamp: '2026-04-06T09:02:05Z', tag: 'pricing', level: 'info', message: 'Round 1: ¥169 → margin 52%' },
    { timestamp: '2026-04-06T09:02:08Z', tag: 'pricing', level: 'info', message: 'Round 3: ¥145 → margin 42%' },
    { timestamp: '2026-04-06T09:02:12Z', tag: 'pricing', level: 'info', message: 'Round 5: ¥139 收敛，margin 40%' },
    { timestamp: '2026-04-06T09:02:15Z', tag: 'pricing', level: 'success', message: '三档定价：日常¥169 / 促销¥139 / 底价¥119' },
    { timestamp: '2026-04-06T09:03:00Z', tag: 'risk', level: 'info', message: '执行风险检查（3项）…' },
    { timestamp: '2026-04-06T09:03:05Z', tag: 'risk', level: 'info', message: '✓ 库存充足 — 320件覆盖大促需求' },
    { timestamp: '2026-04-06T09:03:08Z', tag: 'risk', level: 'info', message: '⚠ 竞品价格偏低 — MG小象 ¥129' },
    { timestamp: '2026-04-06T09:03:10Z', tag: 'risk', level: 'info', message: '⚠ 退货率偏高 — 18.5% > 14%均值' },
    { timestamp: '2026-04-06T09:04:00Z', tag: 'assets', level: 'info', message: '开始生成大促素材（5项）…' },
    { timestamp: '2026-04-06T09:04:10Z', tag: 'assets', level: 'success', message: '主图生成完成，评分 87' },
    { timestamp: '2026-04-06T09:04:15Z', tag: 'assets', level: 'success', message: '优惠券贴片完成，评分 92' },
  ],
}

export function buildMockAgentLogs(step: number): AgentLog[] {
  const allLogs = MOCK_CAMPAIGN.agentLogs
  const tagMap: Record<number, string[]> = {
    1: ['intent'],
    2: ['data'],
    3: ['pricing'],
    4: ['risk'],
    5: ['assets'],
    6: ['deploy'],
  }
  const tags = tagMap[step] ?? []
  return allLogs.filter((log) => tags.includes(log.tag))
}

export const MOCK_TASK_HISTORY: CampaignTaskSummary[] = [
  {
    id: 'campaign-prev-001',
    name: '双11 基础款T恤清仓',
    market: '男装/T恤',
    targetMargin: 0.25,
    status: 'done',
    createdAt: '2025-11-02T10:30:00Z',
  },
  {
    id: 'campaign-prev-002',
    name: '38女王节 真丝衬衫',
    market: '女装/衬衫',
    targetMargin: 0.45,
    status: 'done',
    createdAt: '2026-02-28T14:00:00Z',
  },
  {
    id: 'campaign-prev-003',
    name: '日常促销 牛仔短裤',
    market: '女装/短裤',
    targetMargin: 0.35,
    status: 'review',
    createdAt: '2026-03-15T09:00:00Z',
  },
]
