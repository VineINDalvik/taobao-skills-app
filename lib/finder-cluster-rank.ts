import type { FinderVisualCluster } from '@/lib/finder-cluster-model'
import type { ProductInput, Skill1Output } from '@/lib/types'
import { resolveClusterModelOutput } from '@/lib/finder-cluster-model'

/**
 * 12 个轻量「结构轴」：与结构分余弦同源。
 * `label` 为 UI 展示用固定维度名，不是标题词频抽词。
 */
export const STRUCTURE_AXES: readonly { label: string; keys: readonly string[] }[] = [
  { label: '连衣裙/裙装', keys: ['连衣裙', '裙装', '裙子', 'dress', 'robe', 'robes', 'midi', 'maxi', 'mini'] },
  { label: '上衣/T恤衬衫', keys: ['上衣', '衬衫', 't恤', 'tee', 'shirt', 'blouse', 'top', '吊带', '背心'] },
  { label: '裤装', keys: ['裤', '牛仔裤', 'pants', 'jean', '阔腿裤'] },
  { label: '泳装/沙滩', keys: ['泳', '泳装', 'bikini', 'maillot', 'beach', 'plage', 'bain'] },
  { label: '睡衣家居', keys: ['睡衣', '家居服', '睡裙', '家居', 'pajama', 'sleepwear', 'lounge', '内衣家居'] },
  { label: '外套夹克', keys: ['外套', '风衣', '夹克', '卫衣', 'coat', 'jacket'] },
  { label: '针织毛衣', keys: ['针织', '毛衣', '开衫', 'sweater', 'knit'] },
  { label: '礼服派对', keys: ['性感', '露肩', '抹胸', '晚礼', '派对', 'party', 'cocktail'] },
  { label: '极简通勤', keys: ['极简', '基础款', '通勤', '百搭', 'basic', 'minimal'] },
  { label: '甜美少女', keys: ['甜美', '碎花', '少女', '学院', '可爱'] },
  { label: '运动训练', keys: ['运动', '瑜伽', '健身', 'sport', '训练'] },
  { label: '度假旅拍', keys: ['度假', '沙滩', '海边', '旅拍', '度假风'] },
] as const

export type ClusterRankScores = {
  tier: 'S' | 'A' | 'B'
  tierRank: number
  structScore: number
  visualScore: number
  blendScore: number
  /** 簇侧在该轴上命中强度 Top3 的维度名（与 structScore 同源） */
  structTopLabels: string[]
  /** 与当前「类目+风格词」在同一轴上同时命中的维度（可解释结构对齐） */
  structOverlapLabels: string[]
}

export type RankedFinderCluster = FinderVisualCluster & { rankMeta: ClusterRankScores }

/** 风格簇列表排序策略（二选一，互斥） */
export type FinderClusterSortMode = 'visual' | 'tier_sales'

function normVec(v: number[]): number[] {
  const s = Math.sqrt(v.reduce((a, x) => a + x * x, 0))
  if (s < 1e-9) return v.map(() => 0)
  return v.map((x) => x / s)
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let d = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const den = Math.sqrt(na) * Math.sqrt(nb)
  return den < 1e-9 ? 0 : d / den
}

/** 每轴原始激活（未 L2），与排序向量一致 */
export function structureAxisRawScores(text: string): number[] {
  const lower = text.toLowerCase()
  return STRUCTURE_AXES.map(({ keys }) => {
    let hit = 0
    for (const k of keys) {
      if (lower.includes(k.toLowerCase())) hit += 1
    }
    return Math.min(1, hit * 0.35 + (hit > 0 ? 0.2 : 0))
  })
}

function textToStructureVector(text: string): number[] {
  return normVec(structureAxisRawScores(text))
}

function topAxisLabelsFromRawScores(raw: number[], topK: number): string[] {
  return raw
    .map((score, i) => ({ score, i }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => STRUCTURE_AXES[x.i].label)
}

function overlapAxisLabels(qRaw: number[], cRaw: number[], maxN: number): string[] {
  const pairs: { label: string; s: number }[] = []
  for (let i = 0; i < STRUCTURE_AXES.length; i++) {
    if (qRaw[i] > 0 && cRaw[i] > 0) {
      pairs.push({ label: STRUCTURE_AXES[i].label, s: Math.min(qRaw[i], cRaw[i]) })
    }
  }
  pairs.sort((a, b) => b.s - a.s)
  return pairs.slice(0, maxN).map((p) => p.label)
}

export function clusterBlob(c: FinderVisualCluster): string {
  const comp = (c.competitors ?? [])
    .slice(0, 4)
    .map((x) => x.name)
    .join(' ')
  return `${c.name} ${c.cnDesc} ${c.insight} ${comp}`
}

function queryBlob(input: ProductInput): string {
  const kw = (input.styleKeywords ?? []).join(' ')
  return `${input.category} ${kw} ${input.priceRange}`
}

function tierToRank(t: 'S' | 'A' | 'B'): number {
  return t === 'S' ? 3 : t === 'A' ? 2 : 1
}

/** 余弦映射到 0–1（假定向量已 L2 归一，域内点积多在 [-1,1]） */
function cosToUnit(x: number): number {
  return Math.max(0, Math.min(1, (x + 1) / 2))
}

function cmpTierSales(a: RankedFinderCluster, b: RankedFinderCluster): number {
  if (b.rankMeta.tierRank !== a.rankMeta.tierRank) {
    return b.rankMeta.tierRank - a.rankMeta.tierRank
  }
  const sa = a.avgSales ?? 0
  const sb = b.avgSales ?? 0
  if (sb !== sa) return sb - sa
  if (b.demandPct !== a.demandPct) return b.demandPct - a.demandPct
  return b.rankMeta.structScore - a.rankMeta.structScore
}

function cmpVisualPrimary(a: RankedFinderCluster, b: RankedFinderCluster): number {
  const dv = b.rankMeta.visualScore - a.rankMeta.visualScore
  if (dv !== 0) return dv
  return cmpTierSales(a, b)
}

/** 无灵感图向量或簇无 centroid 时：用结构相似度代替视觉主序 */
function cmpStructFallback(a: RankedFinderCluster, b: RankedFinderCluster): number {
  const ds = b.rankMeta.structScore - a.rankMeta.structScore
  if (ds !== 0) return ds
  return cmpTierSales(a, b)
}

/** 数据里是否至少有一个簇带 centroidEmbedding（与灵感图向量同维时才能做视觉主序） */
export function finderClustersHaveCentroids(clusters: readonly FinderVisualCluster[]): boolean {
  return clusters.some((c) => Array.isArray(c.centroidEmbedding) && (c.centroidEmbedding?.length ?? 0) > 0)
}

export function scoreFinderClusters(params: {
  clusters: FinderVisualCluster[]
  skill1: Skill1Output
  productInput: ProductInput
  queryImageEmbedding: number[] | null
  sortMode: FinderClusterSortMode
}): RankedFinderCluster[] {
  const { clusters, skill1, productInput, queryImageEmbedding, sortMode } = params
  const qBlob = queryBlob(productInput)
  const qRaw = structureAxisRawScores(qBlob)
  const qStruct = normVec(qRaw)
  const hasCentroids = clusters.some(
    (c) => Array.isArray(c.centroidEmbedding) && (c.centroidEmbedding?.length ?? 0) > 0,
  )
  const qVis = queryImageEmbedding && hasCentroids ? queryImageEmbedding : null

  const rows: RankedFinderCluster[] = clusters.map((c) => {
    const rec = resolveClusterModelOutput(skill1, c)
    const tier = rec.tier
    const tierRank = tierToRank(tier)
    const cBlob = clusterBlob(c)
    const cRaw = structureAxisRawScores(cBlob)
    const cStruct = normVec(cRaw)
    const structScore = cosineSim(qStruct, cStruct)
    const structTopLabels = topAxisLabelsFromRawScores(cRaw, 3)
    const structOverlapLabels = overlapAxisLabels(qRaw, cRaw, 4)

    let visualScore = 0.5
    if (
      qVis &&
      Array.isArray(c.centroidEmbedding) &&
      c.centroidEmbedding.length === qVis.length
    ) {
      const cos = cosineSim(qVis, c.centroidEmbedding)
      visualScore = cosToUnit(cos)
    }

    const blendScore = 0.5 * visualScore + 0.5 * structScore
    return {
      ...c,
      rankMeta: {
        tier,
        tierRank,
        structScore,
        visualScore,
        blendScore,
        structTopLabels,
        structOverlapLabels,
      },
    }
  })

  const canVisualSort = Boolean(qVis && hasCentroids)

  rows.sort((a, b) => {
    if (sortMode === 'tier_sales') {
      return cmpTierSales(a, b)
    }
    if (sortMode === 'visual' && canVisualSort) {
      return cmpVisualPrimary(a, b)
    }
    return cmpStructFallback(a, b)
  })

  return rows
}
