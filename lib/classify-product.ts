import type { ClassifyResult, ClassifyClusterMatch } from '@/lib/types'
import { cosineSim } from '@/lib/finder-cluster-rank'

export { cosineSim } from '@/lib/finder-cluster-rank'

export const NOVELTY_THRESHOLD_DEFAULT = 0.45

export interface ClassifiableCluster {
  clusterId: number
  name: string
  centroid: number[]
  tier: 'S' | 'A' | 'B'
}

export function classifyProduct(params: {
  queryEmbedding: number[]
  clusters: ClassifiableCluster[]
  noveltyThreshold?: number
  topK?: number
}): ClassifyResult {
  const {
    queryEmbedding,
    clusters,
    noveltyThreshold = NOVELTY_THRESHOLD_DEFAULT,
    topK = 3,
  } = params

  if (clusters.length === 0) {
    return { topClusters: [], isNovelStyle: true, queryEmbedding }
  }

  const scored: ClassifyClusterMatch[] = clusters.map((c) => ({
    clusterId: c.clusterId,
    clusterName: c.name,
    clusterType: 'structural' as const,
    similarity: cosineSim(queryEmbedding, c.centroid),
    tier: c.tier,
  }))

  scored.sort((a, b) => b.similarity - a.similarity)

  const topClusters = scored.slice(0, topK)
  const maxSim = topClusters[0]?.similarity ?? 0
  const isNovelStyle = maxSim < noveltyThreshold

  return { topClusters, isNovelStyle, queryEmbedding }
}
