import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { cosineSim } from '@/lib/classify-product'
import { parsePendingItem } from '@/lib/pending-pool'
import type { PendingItem } from '@/lib/pending-pool'
import type { TrendCluster } from '@/lib/types'

export const runtime = 'nodejs'

const MIN_CLUSTER_SIZE = 5
const CLUSTER_SIM_THRESHOLD = 0.65

function meanEmbedding(items: PendingItem[]): number[] {
  if (items.length === 0) return []
  const dim = items[0].embedding.length
  const mean = new Array(dim).fill(0)
  for (const item of items) {
    for (let i = 0; i < dim; i++) {
      mean[i] += item.embedding[i]
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= items.length
  }
  return mean
}

/** Greedy single-linkage clustering: assign each item to nearest existing cluster or start new */
function greedyCluster(items: PendingItem[]): PendingItem[][] {
  const clusters: PendingItem[][] = []
  const centroids: number[][] = []

  for (const item of items) {
    let bestIdx = -1
    let bestSim = -1
    for (let i = 0; i < centroids.length; i++) {
      const sim = cosineSim(item.embedding, centroids[i])
      if (sim > bestSim) {
        bestSim = sim
        bestIdx = i
      }
    }
    if (bestSim >= CLUSTER_SIM_THRESHOLD && bestIdx >= 0) {
      clusters[bestIdx].push(item)
      centroids[bestIdx] = meanEmbedding(clusters[bestIdx])
    } else {
      clusters.push([item])
      centroids.push([...item.embedding])
    }
  }
  return clusters
}

export async function POST() {
  try {
    const pendingDir = join(process.cwd(), 'data', 'pending-embeddings')
    await mkdir(pendingDir, { recursive: true })

    const files = await readdir(pendingDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    if (jsonFiles.length < MIN_CLUSTER_SIZE) {
      return Response.json({
        ok: true,
        message: `Only ${jsonFiles.length} pending items, need ${MIN_CLUSTER_SIZE} to attempt clustering`,
        clustersSpawned: 0,
        newClusterIds: [],
        remainingPending: jsonFiles.length,
      })
    }

    const items: PendingItem[] = []
    for (const file of jsonFiles) {
      const content = await readFile(join(pendingDir, file), 'utf-8')
      const item = parsePendingItem(content)
      if (item) items.push(item)
    }

    if (items.length < MIN_CLUSTER_SIZE) {
      return Response.json({
        ok: true,
        message: 'Not enough valid items',
        clustersSpawned: 0,
        newClusterIds: [],
        remainingPending: items.length,
      })
    }

    const groups = greedyCluster(items)

    const trendPath = join(process.cwd(), 'lib', 'trend-clusters.json')
    let existing: TrendCluster[] = []
    try {
      existing = JSON.parse(await readFile(trendPath, 'utf-8'))
    } catch { /* empty */ }

    const maxId = Math.max(999, ...existing.map((t) => t.clusterId))
    const newClusters: TrendCluster[] = []
    const consumedItemIds = new Set<string>()

    for (const group of groups) {
      if (group.length < MIN_CLUSTER_SIZE) continue

      const centroid = meanEmbedding(group)
      const tc: TrendCluster = {
        clusterId: maxId + newClusters.length + 1,
        type: 'trend',
        name: `新兴趋势 #${maxId + newClusters.length + 1}`,
        centroidEmbedding: centroid,
        mosaicImages: group.slice(0, 6).map((g) => g.imageUrl ?? '').filter(Boolean),
        sampleCount: group.length,
        createdAt: new Date().toISOString(),
        status: 'active',
      }
      newClusters.push(tc)
      for (const item of group) consumedItemIds.add(item.id)
    }

    const updated = [...existing, ...newClusters]
    await writeFile(trendPath, JSON.stringify(updated, null, 2))

    for (const file of jsonFiles) {
      const content = await readFile(join(pendingDir, file), 'utf-8')
      const item = parsePendingItem(content)
      if (item && consumedItemIds.has(item.id)) {
        await unlink(join(pendingDir, file))
      }
    }

    return Response.json({
      ok: true,
      clustersSpawned: newClusters.length,
      newClusterIds: newClusters.map((c) => c.clusterId),
      remainingPending: items.length - consumedItemIds.size,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
