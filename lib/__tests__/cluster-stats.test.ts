import { describe, it, expect } from 'vitest'
import {
  computePercentiles,
  aggregateFeedbackToStats,
  resolveConfidence,
} from '@/lib/cluster-stats'
import type { TestFeedback } from '@/lib/types'

describe('computePercentiles', () => {
  it('returns correct p25/p50/p75 for sorted array', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = computePercentiles(values)
    expect(result.p25).toBeCloseTo(3.25)
    expect(result.p50).toBeCloseTo(5.5)
    expect(result.p75).toBeCloseTo(7.75)
  })

  it('handles single value', () => {
    const result = computePercentiles([5])
    expect(result.p25).toBe(5)
    expect(result.p50).toBe(5)
    expect(result.p75).toBe(5)
  })

  it('handles empty array', () => {
    const result = computePercentiles([])
    expect(result.p25).toBe(0)
    expect(result.p50).toBe(0)
    expect(result.p75).toBe(0)
  })
})

describe('resolveConfidence', () => {
  it('returns ai for 0 samples', () => {
    expect(resolveConfidence(0)).toBe('ai')
  })
  it('returns early for 1-9 samples', () => {
    expect(resolveConfidence(5)).toBe('early')
  })
  it('returns verified for 10+ samples', () => {
    expect(resolveConfidence(15)).toBe('verified')
  })
})

describe('aggregateFeedbackToStats', () => {
  const makeFb = (clusterId: number, ctr: number, cvr: number, sales: number, verdict: 'scale' | 'pivot'): TestFeedback => ({
    id: `fb-${Math.random()}`,
    clusterId,
    productImageEmbedding: [],
    testMetrics: {
      daysListed: 7, ctr, cvr,
      addToCartRate: 5, favoriteRate: 3,
      unitsSold: sales * 7, dailySpend: 80, avgPrice: 150,
    },
    verdict,
    timestamp: new Date().toISOString(),
  })

  it('aggregates multiple feedbacks for one cluster', () => {
    const feedbacks = [
      makeFb(0, 3.0, 1.0, 10, 'scale'),
      makeFb(0, 4.0, 1.5, 15, 'scale'),
      makeFb(0, 2.0, 0.5, 5, 'pivot'),
    ]
    const stats = aggregateFeedbackToStats(0, feedbacks)
    expect(stats.sampleCount).toBe(3)
    expect(stats.dataConfidence).toBe('early')
    expect(stats.metrics.scaleRate).toBeCloseTo(2 / 3)
    expect(stats.metrics.pivotRate).toBeCloseTo(1 / 3)
  })

  it('returns zero stats for empty feedbacks', () => {
    const stats = aggregateFeedbackToStats(0, [])
    expect(stats.sampleCount).toBe(0)
    expect(stats.dataConfidence).toBe('ai')
  })
})
