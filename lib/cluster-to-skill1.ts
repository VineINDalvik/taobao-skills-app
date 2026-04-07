import type { ClusterDataRow } from './cluster-data-types'
import type { Skill1Output, StyleCluster } from './types'

/** Next/Image 友好：data URI 不用作 imageUrl，改用占位图 */
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
]

function pickImageUrl(c: ClusterDataRow, index: number): string {
  const first = c.competitors[0]?.image ?? c.mosaicImages[0]
  if (first && first.startsWith('http')) return first
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]
}

function clusterToStyleCluster(c: ClusterDataRow, index: number): StyleCluster {
  const id = `style-${String(index + 1).padStart(3, '0')}`
  const tier: StyleCluster['tier'] =
    c.demandPct > 12 ? 'S' : c.demandPct > -5 ? 'A' : 'B'
  const trendScore = Math.min(96, Math.max(52, 58 + Math.round(c.demandPct)))
  const conf: StyleCluster['confidence'] =
    c.hotCount >= 80 ? 'high' : c.hotCount >= 35 ? 'mid' : 'low'
  const avgRmb = Math.round(c.avgPrice * 7.2)
  const low = Math.max(29, Math.round(avgRmb * 0.75))
  const high = Math.round(avgRmb * 1.35)

  return {
    id,
    name: c.name,
    tier,
    trendScore,
    trendReal: true,
    attributes: {
      neckline: '依簇内主图观测',
      fabric: '依簇内主图观测',
      length: '依簇内主图观测',
      pattern: c.cnDesc.split('·')[0] ?? '混合',
      season: '当季',
    },
    trendSignals: [
      `簇内相对需求指数 ${c.demandGrowth}（相对全量样本基准）`,
      `有效样本约 ${c.hotCount} 条相似款聚合`,
      c.insight.slice(0, 80) + (c.insight.length > 80 ? '…' : ''),
    ],
    designGenes: [
      `簇标签：${c.cnDesc}`,
      `竞争强度：${c.competition}（簇内款数 ${c.hotCount}）`,
      '具体基因请结合簇内主图与标题人工复核',
    ],
    priceRange: `${low}–${high}`,
    riskNote:
      c.competition === '高'
        ? '簇内竞品密集，建议强差异化主图与卖点再测款'
        : c.hotCount < 30
          ? '簇样本偏少，区间为宽估计，务必小单验证'
          : '建议按测款 SOP 分阶段看加购与转化',
    imageUrl: pickImageUrl(c, index),
    extensions: [
      {
        direction: 'A',
        risk: 'low',
        description: '同簇微创新',
        change: '保留主视觉结构，改色或改细节工艺',
        styleLine: `延续簇内「${c.name}」主廓形与长度感`,
        fabric: '面料质感接近簇内主销（垂坠/厚薄一致），主做配色变化',
        fitSilhouette: '肩腰摆比例与参考主图一致',
      },
      {
        direction: 'B',
        risk: 'mid',
        description: '跨簇借鉴',
        change: '引入相邻簇元素做 A/B 主图测试',
        styleLine: `在「${c.name}」基础上融合相邻视觉元素（图案/领型线索）`,
        fabric: '底布可同档替换，注意印花与面料克重匹配',
        fitSilhouette: '主体结构暂稳，可做领深、袖长等中度调整',
      },
      {
        direction: 'C',
        risk: 'high',
        description: '结构改款',
        change: '版型/品类级改动需单独建模与备货评估',
        styleLine: '可探索同 Mood 下的裙长档、袖型或腰线变体',
        fabric: '随版型变化评估用料与工艺可行性',
        fitSilhouette: '版型为延伸核心，需纸样/试穿验证后再备货',
      },
    ],
    clusterSampleSize: c.hotCount,
    confidence: conf,
    salesBand: {
      p25: Math.max(1, Math.round(c.avgSales * 0.12)),
      p50: Math.max(2, Math.round(c.avgSales * 0.22)),
      p75: Math.max(4, Math.round(c.avgSales * 0.38)),
    },
    bandCaption: `基于簇内历史均销约 ${Math.round(c.avgSales)} 件的粗粒度分位示意（非承诺销量）`,
    testPlan: {
      skuRoles: [
        { role: '主测 SKU', spec: '先上 1 个与簇中心视觉最接近的款' },
        { role: '对照 SKU', spec: '可选 1 个相邻价带或相邻簇元素做对照' },
      ],
      observePhase1Days: 5,
      observePhase2Days: 14,
      budgetHint: '冷启动建议小预算试投，以加购率与 CTR 为先验指标',
      stopRules: [
        '首段观察期加购率持续低于店内同类均值 → 优先优化主图与标题',
        '样本不足时任何模型输出仅作参考，以店铺真实数据为准',
      ],
    },
    supplyHint: {
      status: 'unknown',
      note: '货源需 1688/线下以图搜；导入数据与淘宝可卖性需自行合规核验',
    },
  }
}

/** 与 cluster-data.json 条数一致，保证每个视觉簇都有对应 recommendation */
export function buildSkill1FromClusterData(rows: ClusterDataRow[]): Skill1Output {
  const recommendations = rows.map((row, i) => clusterToStyleCluster(row, i))
  const avgPrice =
    rows.length === 0
      ? 189
      : Math.round(rows.reduce((s, r) => s + r.avgPrice * 7.2, 0) / rows.length)
  const topKeywords = Array.from(
    new Set(
      rows
        .flatMap((r) => r.name.split('·'))
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8)
  const compHigh = rows.filter((r) => r.competition === '高').length
  const competitionLevel: Skill1Output['marketOverview']['competitionLevel'] =
    compHigh > rows.length / 2 ? 'high' : compHigh > 0 ? 'mid' : 'low'

  return {
    recommendations,
    marketOverview: {
      categoryGrowth: rows.length ? `簇数 ${rows.length} · 样本合计 ${rows.reduce((s, r) => s + r.hotCount, 0)}` : '+12% YoY',
      avgPrice,
      topKeywords: topKeywords.length ? topKeywords : ['簇分析', '测款', '相似款'],
      competitionLevel,
    },
  }
}
