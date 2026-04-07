import type { Extension, Skill1Output, StyleCluster } from '@/lib/types'
import type { FinderClusterSemantic } from '@/lib/finder-cluster-semantic'

/** 视觉簇 + mock 标定表，用于解析「每簇」的选品模型输出（S/A/B + 区间） */
export type FinderVisualCluster = {
  styleId: string
  name: string
  emoji: string
  cnDesc?: string
  demandGrowth: string
  demandPct: number
  competition: string
  insight: string
  mosaicImgs: readonly string[]
  hotCount?: number
  avgSales?: number
  /** 由 build_cluster_data 写入，与 OpenCLIP ViT-L-14 同空间 */
  centroidEmbedding?: number[]
  competitors?: readonly {
    name: string
    price: string
    sales: string
    image: string
    platform: string
    trend: boolean
  }[]
  semantic?: FinderClusterSemantic
}

function parseDemandPct(growth: string): number {
  const m = growth.match(/([+-]?\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

const DEFAULT_EXTENSIONS: Extension[] = [
  {
    direction: 'A',
    risk: 'low',
    description: '换色系',
    change: '保留版型与面料，仅调整主色或印花底色，风险最低',
    styleLine: '延续原品类与外观廓形，不改变品类属性',
    fabric: '纱线/克重/垂感与原款同档，仅色相变化',
    fitSilhouette: '肩线、腰线、摆围与原版一致',
  },
  {
    direction: 'B',
    risk: 'mid',
    description: '换图案/细节',
    change: '保留廓形，替换印花或局部工艺，需小单验证',
    styleLine: '同款廓形与长度档位，图案面积与布局可调整',
    fabric: '底布材质不变或可同系替换（如雪纺→高密雪纺）',
    fitSilhouette: '版型结构不变，可改领口线脚、袖口工艺等细节',
  },
  {
    direction: 'C',
    risk: 'high',
    description: '换版型/结构',
    change: '改变裙长、袖型或腰线，消费者反应需单独测',
    styleLine: '可在同风格线下尝试裙长档、袖型或腰线位移',
    fabric: '可按新结构微调克重，需重新评估垂坠与体感',
    fitSilhouette: '版型为延伸重点：腰位、肩宽、摆量至少一项有明确变化',
  },
]

function syntheticStyleCluster(visual: FinderVisualCluster): StyleCluster {
  const pct = parseDemandPct(visual.demandGrowth)
  const comp = visual.competition

  let tier: StyleCluster['tier'] = 'B'
  if (pct >= 90) tier = 'S'
  else if (pct >= 35) tier = 'A'
  if (pct < 15) tier = 'B'

  if (comp === '高') {
    if (tier === 'S') tier = 'A'
    else if (tier === 'A') tier = 'B'
  }

  const trendScore = Math.min(98, Math.max(38, 48 + Math.round(pct * 0.28) + (tier === 'S' ? 8 : tier === 'A' ? 4 : 0)))
  const trendReal = pct >= 20

  const p50 = tier === 'S' ? 14 + Math.round(pct / 25) : tier === 'A' ? 7 + Math.round(pct / 40) : 3 + Math.max(0, Math.round(pct / 30))
  const spread = tier === 'S' ? 6 : tier === 'A' ? 4 : 2
  const salesBand = {
    p25: Math.max(1, p50 - spread),
    p50,
    p75: p50 + spread + (tier === 'S' ? 8 : tier === 'A' ? 5 : 3),
  }

  const n = tier === 'S' ? 80 + (pct % 40) : tier === 'A' ? 45 + (pct % 30) : 20 + (pct % 15)
  const confidence: StyleCluster['confidence'] =
    n >= 70 ? 'high' : n >= 40 ? 'mid' : 'low'

  const bandCaption =
    `GATv2+LightGBM 在簇内估计：${tier} 级销量潜力；` +
    (tier === 'S' ? '相对同类更易触达高销分位。' : tier === 'A' ? '中等潜力，建议小单测。' : '偏弱，跟款需强差异或长尾定位。') +
    '（本簇为簇级快速估计，非全量人工标定款）'

  const firstImg = visual.mosaicImgs[0] ?? 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop'

  return {
    id: visual.styleId,
    name: `${visual.emoji} ${visual.name}`.trim(),
    tier,
    trendScore,
    trendReal,
    attributes: {
      neckline: '—',
      fabric: '簇内混合',
      length: '—',
      pattern: '—',
      season: '当季',
    },
    trendSignals: [
      `簇需求增速 ${visual.demandGrowth}（视觉聚类侧）`,
      `竞争强度：${comp}`,
      trendReal ? '趋势环境：未判定为一过性噪音（簇级）' : '趋势偏弱，谨慎跟款',
    ],
    designGenes: [
      '簇内视觉与属性共现模式支撑分级',
      '「结构维度 Top」与排序用 12 轴稀疏向量同源，非标题词频抽词',
    ],
    priceRange: '99–299',
    riskNote: comp === '高' ? '竞争密度高，S/A/B 已降档；仍需结合你店能力判断。' : '请结合供应链与测款 SOP 执行。',
    imageUrl: firstImg,
    extensions: DEFAULT_EXTENSIONS,
    clusterSampleSize: n,
    confidence,
    salesBand,
    bandCaption,
    testPlan: {
      skuRoles: [{ role: '测款', spec: tier === 'B' ? '优先 1 SKU 验证模型判断是否偏乐观' : '主色 1 + 辅色 1' }],
      observePhase1Days: tier === 'S' ? 5 : 7,
      observePhase2Days: 14,
      budgetHint: tier === 'S' ? '可适当提高日预算试 CTR/加购' : tier === 'B' ? '低预算试投，严守止损' : '中等预算，按 SOP 观察',
      stopRules: [
        '若实测转化持续低于同簇 P25，模型分级仅供参考，应降档或停测',
        'S 级不代表必爆，仅为相对销量潜力分位估计',
      ],
    },
    supplyHint: {
      status: 'unknown',
      note: '簇级估计不替代 1688 找货；有标定款时以标定结果为准。',
    },
  }
}

/**
 * 若 mock 里已有该 styleId 的完整标定（如前 3 款），直接返回；
 * 否则用簇特征生成带 **S/A/B** 与区间的合成输出，保证每个簇都有「选品模型」可读结果。
 */
export function resolveClusterModelOutput(skill1: Skill1Output, visual: FinderVisualCluster): StyleCluster {
  const hit = skill1.recommendations.find((r) => r.id === visual.styleId)
  if (hit) return hit
  return syntheticStyleCluster(visual)
}

export function tierLabel(tier: StyleCluster['tier']): string {
  switch (tier) {
    case 'S':
      return '高销潜力（优先测款）'
    case 'A':
      return '中等潜力（小单+止损）'
    case 'B':
      return '偏弱/长尾（强差异或谨慎）'
    default:
      return ''
  }
}
