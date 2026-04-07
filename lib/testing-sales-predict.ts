import type { PostTestSalesFusion, StyleCluster, TestingInput, TestingOutput } from '@/lib/types'
import { tierLabel } from '@/lib/finder-cluster-model'

/** 测款前：仅选品模型（GATv2+LightGBM + 簇统计），不含测款实测 */
export function getPreTestSalesSummary(style: StyleCluster | undefined) {
  if (!style) return null
  return {
    tier: style.tier,
    trendScore: style.trendScore,
    trendReal: style.trendReal,
    p25: style.salesBand.p25,
    p50: style.salesBand.p50,
    p75: style.salesBand.p75,
    confidence: style.confidence,
    clusterSampleSize: style.clusterSampleSize,
    bandCaption: style.bandCaption,
    tierCaption: tierLabel(style.tier),
    sourceLabel: '选品模型（GATv2 + LightGBM）· 簇级校准',
  }
}

function clampBand(p25: number, p50: number, p75: number) {
  const a = Math.max(1, p25)
  const b = Math.max(a, p50)
  const c = Math.max(b, p75)
  return { p25: a, p50: b, p75: c }
}

/**
 * 测款后：结构化小模型先修正日销带，再用规则模拟「大模型」把
 * 选品结果 + 测款表单 + 修正带 压成一段综合结论（正式可替换为 qwen-max）。
 */
export function buildPostTestFusion(
  style: StyleCluster | undefined,
  test: TestingOutput,
): PostTestSalesFusion {
  const pre = style?.salesBand ?? { p25: 4, p50: 10, p75: 20 }
  const { ctr, cvr, addToCartRate, unitsSold, daysListed, dailySpend } = test.input
  const { verdict, score, dimensionScores } = test

  const ctrBoost = Math.min(1.35, 1 + Math.max(0, ctr - 2.5) * 0.04)
  const cvrBoost = Math.min(1.3, 1 + Math.max(0, cvr - 0.8) * 0.12)
  const addBoost = Math.min(1.15, 1 + Math.max(0, addToCartRate - 5.4) * 0.02)
  let factor = ctrBoost * cvrBoost * addBoost
  if (verdict === 'pivot') factor *= 0.62 + (score / 500)
  factor *= verdict === 'scale' ? 1.05 : 1
  factor = Math.min(1.45, Math.max(0.45, factor))

  const raw = {
    p25: Math.round(pre.p25 * factor),
    p50: Math.round(pre.p50 * factor),
    p75: Math.round(pre.p75 * factor),
  }
  const modelAdjustedBand = clampBand(raw.p25, raw.p50, raw.p75)

  const modelAdjustmentNote =
    verdict === 'scale'
      ? `实测 CTR ${ctr}% / CVR ${cvr}% / 加购 ${addToCartRate}% 优于基准，在小模型中对簇级先验区间上调约 ${Math.round((factor - 1) * 100)}%（封顶保护已启用）。`
      : `综合评分偏低，小模型对原簇级区间下调，反映测款表现未支撑原 ${style?.tier ?? '—'} 档乐观假设。`

  const tier = style?.tier ?? '—'
  const tierCap = tierLabel(style?.tier ?? 'B')
  const days = Math.max(1, daysListed)
  const impliedDaily = Math.round(unitsSold / days)

  const llmNarrative = [
    `【测款后综合研判 · Demo 由规则模拟 LLM，正式可换通义 qwen-max】`,
    ``,
    `**输入摘要**`,
    `- 选品阶段：本簇模型分级 **${tier}**（${tierCap}），趋势分 **${style?.trendScore ?? '—'}**，测款前簇级日销带 **P25–P75 = ${pre.p25}–${pre.p75} 件/天**（P50=${pre.p50}）。`,
    `- 测款实测：上架 **${daysListed}** 天，累计售出 **${unitsSold}** 件，约合 **${impliedDaily} 件/天**；直通车约 **¥${dailySpend}/日**，ROI **${dimensionScores.roiActual}**。`,
    `- 小模型修正带（结构化后处理）：**P25=${modelAdjustedBand.p25} · P50=${modelAdjustedBand.p50} · P75=${modelAdjustedBand.p75} 件/天**。`,
    ``,
    `**综合判断**`,
    verdict === 'scale'
      ? `测款数据与选品先验方向一致：流量效率（CTR）与转化（CVR）支撑在修正区间内取 **P50 偏上** 做备货与投放规划；若供应链跟得上，可优先按 SOP 加码，并持续把实测 CVR 回灌定价与推广模型。`
      : `测款表现弱于选品先验：建议在 **修正带下沿（P25 附近）** 或更低预期备货，优先排查主图/价带/人群是否与簇内爆款结构错位；若两周内无法拉近行业均值，宜执行止损或换款。`,
    ``,
    `*说明：测款前预测仅来自选品小模型；测款后为「修正带 + LLM 叙事」融合，非单一子模型结论。*`,
  ].join('\n')

  const unifiedVerdict =
    verdict === 'scale'
      ? `测款后预期：稳定日销约 ${modelAdjustedBand.p50} 件/天（区间 ${modelAdjustedBand.p25}–${modelAdjustedBand.p75}），较测款前 P50=${pre.p50} 已按实测上调/校准，建议按修正带安排补货与预算。`
      : `测款后预期：日销大概率落在 ${modelAdjustedBand.p25}–${modelAdjustedBand.p50} 件/天区间下沿，低于选品阶段中位假设；先优化素材与价带，勿按原 ${tier} 档满额备货。`

  return {
    modelAdjustedBand,
    modelAdjustmentNote,
    llmNarrative,
    unifiedVerdict,
  }
}

/** 由表单构造 TestingInput（测款页提交） */
export function parseTestingForm(form: Record<string, string>): TestingInput {
  const n = (k: string, d: number) => {
    const v = Number(form[k])
    return Number.isFinite(v) ? v : d
  }
  return {
    daysListed: n('daysListed', 7),
    ctr: n('ctr', 2.5),
    cvr: n('cvr', 0.8),
    addToCartRate: n('addToCartRate', 5.4),
    favoriteRate: n('favoriteRate', 3),
    unitsSold: n('unitsSold', 0),
    dailySpend: n('dailySpend', 80),
    costPrice: n('costPrice', 68),
  }
}
