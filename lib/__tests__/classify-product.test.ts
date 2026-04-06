import { describe, it, expect } from 'vitest'
import { classifyProduct, cosineSim, NOVELTY_THRESHOLD_DEFAULT } from '@/lib/classify-product'
import type { ClassifyClusterMatch } from '@/lib/types'

describe('cosineSim', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSim([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0.0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSim([1, 0], [-1, 0])).toBeCloseTo(-1.0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSim([], [])).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSim([1, 2], [1, 2, 3])).toBe(0)
  })
})

describe('classifyProduct', () => {
  const fakeClusters = [
    { clusterId: 0, name: 'Dresses', centroid: [1, 0, 0], tier: 'S' as const },
    { clusterId: 1, name: 'Tops', centroid: [0, 1, 0], tier: 'A' as const },
    { clusterId: 2, name: 'Pants', centroid: [0, 0, 1], tier: 'B' as const },
  ]

  it('returns best matching cluster first', () => {
    const result = classifyProduct({
      queryEmbedding: [0.9, 0.1, 0],
      clusters: fakeClusters,
    })
    expect(result.topClusters[0].clusterId).toBe(0)
    expect(result.topClusters[0].similarity).toBeGreaterThan(0.9)
    expect(result.isNovelStyle).toBe(false)
  })

  it('returns top-3 sorted by similarity descending', () => {
    const result = classifyProduct({
      queryEmbedding: [0.5, 0.5, 0.1],
      clusters: fakeClusters,
    })
    expect(result.topClusters).toHaveLength(3)
    const sims = result.topClusters.map(c => c.similarity)
    expect(sims[0]).toBeGreaterThanOrEqual(sims[1])
    expect(sims[1]).toBeGreaterThanOrEqual(sims[2])
  })

  it('marks novel style when all similarities below threshold', () => {
    const result = classifyProduct({
      queryEmbedding: [0.01, 0.01, 0.01],
      clusters: fakeClusters,
      noveltyThreshold: 0.99,
    })
    expect(result.isNovelStyle).toBe(true)
  })

  it('preserves queryEmbedding in result', () => {
    const emb = [0.5, 0.5, 0]
    const result = classifyProduct({
      queryEmbedding: emb,
      clusters: fakeClusters,
    })
    expect(result.queryEmbedding).toEqual(emb)
  })

  it('handles empty clusters array', () => {
    const result = classifyProduct({
      queryEmbedding: [1, 0, 0],
      clusters: [],
    })
    expect(result.topClusters).toHaveLength(0)
    expect(result.isNovelStyle).toBe(true)
  })
})
