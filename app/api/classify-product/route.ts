import { classifyProduct } from '@/lib/classify-product'
import type { ClassifiableCluster } from '@/lib/classify-product'
import type { ClusterDataRow } from '@/lib/cluster-data-types'
import type { TrendCluster } from '@/lib/types'
import { formatPendingFilename } from '@/lib/pending-pool'
import type { PendingItem } from '@/lib/pending-pool'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { resolveClusterModelOutput } from '@/lib/finder-cluster-model'
import { buildSkill1FromClusterData } from '@/lib/cluster-to-skill1'

export const runtime = 'nodejs'

async function getEmbedding(imageUrl: string): Promise<number[] | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/embed-query-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.ok || !Array.isArray(data.embedding)) return null
  return data.embedding
}

function loadStructuralClusters(): ClassifiableCluster[] {
  const raw: ClusterDataRow[] = require('@/lib/cluster-data.json')
  const skill1 = buildSkill1FromClusterData(raw)

  return raw
    .filter((r) => Array.isArray(r.centroidEmbedding) && r.centroidEmbedding.length > 0)
    .map((r) => {
      const resolved = resolveClusterModelOutput(skill1, {
        styleId: r.styleId,
        name: r.name,
        emoji: r.emoji,
        cnDesc: r.cnDesc,
        demandGrowth: r.demandGrowth,
        demandPct: r.demandPct,
        competition: r.competition,
        insight: r.insight,
        mosaicImgs: r.mosaicImages,
        hotCount: r.hotCount,
        avgSales: r.avgSales,
        centroidEmbedding: r.centroidEmbedding,
        competitors: r.competitors,
      })
      return {
        clusterId: r.clusterId,
        name: r.name,
        centroid: r.centroidEmbedding!,
        tier: resolved.tier,
      }
    })
}

function loadTrendClusters(): ClassifiableCluster[] {
  try {
    const raw: TrendCluster[] = require('@/lib/trend-clusters.json')
    return raw
      .filter((t) => t.status === 'active' && t.centroidEmbedding.length > 0)
      .map((t) => ({
        clusterId: t.clusterId,
        name: t.name,
        centroid: t.centroidEmbedding,
        tier: 'B' as const,
      }))
  } catch {
    return []
  }
}

async function saveToPendingPool(embedding: number[], imageUrl?: string) {
  const dir = join(process.cwd(), 'data', 'pending-embeddings')
  await mkdir(dir, { recursive: true })
  const id = randomUUID()
  const item: PendingItem = {
    id,
    embedding,
    source: 'user-upload',
    imageUrl,
    timestamp: new Date().toISOString(),
  }
  const filename = formatPendingFilename(id, Date.now())
  await writeFile(join(dir, filename), JSON.stringify(item))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const imageUrl = body.imageUrl?.trim()

    if (!imageUrl) {
      return Response.json({ ok: false, error: 'missing imageUrl' }, { status: 400 })
    }

    const embedding = await getEmbedding(imageUrl)
    if (!embedding) {
      return Response.json(
        { ok: false, error: 'embedding failed — Python/OpenCLIP may not be available. Try uploading the image directly.' },
        { status: 502 },
      )
    }

    const structural = loadStructuralClusters()
    const trend = loadTrendClusters()
    const allClusters = [...structural, ...trend]

    const result = classifyProduct({ queryEmbedding: embedding, clusters: allClusters })

    // Mark trend clusters in result
    const trendIds = new Set(trend.map((t) => t.clusterId))
    for (const match of result.topClusters) {
      if (trendIds.has(match.clusterId)) {
        match.clusterType = 'trend'
      }
    }

    if (result.isNovelStyle) {
      await saveToPendingPool(embedding, imageUrl)
    }

    return Response.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
