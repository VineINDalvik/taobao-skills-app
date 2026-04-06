import type { ClusterStats, Percentiles, TestFeedback } from '@/lib/types'

export function computePercentiles(values: number[]): Percentiles {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 1) return { p25: sorted[0], p50: sorted[0], p75: sorted[0] }

  const interp = (p: number) => {
    const idx = p * (n - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    const frac = idx - lo
    return sorted[lo] + frac * (sorted[hi] - sorted[lo])
  }

  return { p25: interp(0.25), p50: interp(0.5), p75: interp(0.75) }
}

export function resolveConfidence(sampleCount: number): ClusterStats['dataConfidence'] {
  if (sampleCount >= 10) return 'verified'
  if (sampleCount >= 1) return 'early'
  return 'ai'
}

export function aggregateFeedbackToStats(
  clusterId: number,
  feedbacks: TestFeedback[],
): ClusterStats {
  const relevant = feedbacks.filter((f) => f.clusterId === clusterId)
  const n = relevant.length

  if (n === 0) {
    return {
      clusterId,
      sampleCount: 0,
      dataConfidence: 'ai',
      metrics: {
        ctr: { p25: 0, p50: 0, p75: 0 },
        cvr: { p25: 0, p50: 0, p75: 0 },
        dailySales: { p25: 0, p50: 0, p75: 0 },
        scaleRate: 0,
        pivotRate: 0,
      },
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    }
  }

  const ctrs = relevant.map((f) => f.testMetrics.ctr)
  const cvrs = relevant.map((f) => f.testMetrics.cvr)
  const dailySales = relevant.map((f) => {
    const days = Math.max(1, f.testMetrics.daysListed)
    return f.testMetrics.unitsSold / days
  })

  const scaleCount = relevant.filter((f) => f.verdict === 'scale').length
  const pivotCount = relevant.filter((f) => f.verdict === 'pivot').length
  const verdictTotal = n || 1

  return {
    clusterId,
    sampleCount: n,
    dataConfidence: resolveConfidence(n),
    metrics: {
      ctr: computePercentiles(ctrs),
      cvr: computePercentiles(cvrs),
      dailySales: computePercentiles(dailySales),
      scaleRate: scaleCount / verdictTotal,
      pivotRate: pivotCount / verdictTotal,
    },
    trend: 'stable',
    lastUpdated: new Date().toISOString(),
  }
}
