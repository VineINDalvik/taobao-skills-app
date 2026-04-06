import { describe, it, expect } from 'vitest'
import type { ClassifyResult, TestFeedback, ClusterStats, TrendCluster } from '@/lib/types'

describe('new types exist and compile', () => {
  it('ClassifyResult has expected shape', () => {
    const result: ClassifyResult = {
      topClusters: [
        { clusterId: 0, clusterName: 'Test', clusterType: 'structural', similarity: 0.8, tier: 'A' },
      ],
      isNovelStyle: false,
      queryEmbedding: [0.1, 0.2],
    }
    expect(result.topClusters).toHaveLength(1)
    expect(result.isNovelStyle).toBe(false)
  })

  it('TestFeedback has expected shape', () => {
    const fb: TestFeedback = {
      id: 'fb-1',
      clusterId: 0,
      productImageEmbedding: [0.1],
      testMetrics: {
        daysListed: 7, ctr: 3.0, cvr: 1.0,
        addToCartRate: 6.0, favoriteRate: 3.5,
        unitsSold: 20, dailySpend: 80, avgPrice: 150,
      },
      verdict: 'scale',
      timestamp: '2026-04-06T00:00:00Z',
    }
    expect(fb.verdict).toBe('scale')
  })

  it('ClusterStats has expected shape', () => {
    const stats: ClusterStats = {
      clusterId: 0,
      sampleCount: 5,
      dataConfidence: 'early',
      metrics: {
        ctr: { p25: 2.0, p50: 3.0, p75: 4.5 },
        cvr: { p25: 0.5, p50: 0.8, p75: 1.2 },
        dailySales: { p25: 3, p50: 8, p75: 15 },
        scaleRate: 0.6,
        pivotRate: 0.4,
      },
      trend: 'rising',
      lastUpdated: '2026-04-06T00:00:00Z',
    }
    expect(stats.dataConfidence).toBe('early')
  })

  it('TrendCluster has expected shape', () => {
    const tc: TrendCluster = {
      clusterId: 100,
      type: 'trend',
      name: 'Emerging Y2K',
      centroidEmbedding: [0.1, 0.2],
      mosaicImages: [],
      sampleCount: 6,
      createdAt: '2026-04-06T00:00:00Z',
      status: 'active',
    }
    expect(tc.type).toBe('trend')
  })
})
