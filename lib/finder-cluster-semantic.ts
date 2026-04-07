import { FASHION_CLUSTER_LABELS, type SemanticGroup } from '@/lib/fashion-cluster-labels'

export type ClusterSemanticLabelHit = {
  id: string
  label: string
  group: SemanticGroup
  score: number
}

export type FinderClusterSemantic = {
  generatedClusterName: string
  generatedSummary: string
  primary: string
  secondary: string
  labels: ClusterSemanticLabelHit[]
  tags: string[]
  groups: Partial<Record<SemanticGroup, string[]>>
}

export type ClusterSemanticSummary = {
  title: string
  summary: string
  primary: string
  secondary: string
  tags: string[]
}

type SemanticSourceLike = {
  name?: string
  cnDesc?: string
  insight?: string
  competitors?: readonly { name?: string }[]
  rankMeta?: { structTopLabels?: string[] }
  semantic?: FinderClusterSemantic
}

export function stripLegacyInsightWordFreq(insight: string): string {
  return insight.replace(/词频：[^。]+。?/g, '').replace(/\s{2,}/g, ' ').trim()
}

function buildClusterSemanticSource(cluster: SemanticSourceLike): string {
  return [
    cluster.name,
    cluster.cnDesc,
    stripLegacyInsightWordFreq(cluster.insight ?? ''),
    ...(cluster.rankMeta?.structTopLabels ?? []),
    ...(cluster.competitors ?? []).slice(0, 5).map((c) => c.name ?? ''),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()
}

function buildHeuristicSemantic(cluster: SemanticSourceLike): FinderClusterSemantic {
  const source = buildClusterSemanticSource(cluster)
  const labels = FASHION_CLUSTER_LABELS
    .map((def) => {
      let score = 0
      for (const keyword of def.keywords) {
        if (source.includes(keyword.toLowerCase())) score += keyword.length >= 4 ? 2 : 1
      }
      if ((cluster.rankMeta?.structTopLabels ?? []).some((label) => label.includes(def.label))) score += 3
      return { ...def, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      label: item.label,
      group: item.group,
      score: item.score,
    }))

  const primary =
    labels.find((item) => item.group === '类目')?.label ??
    cluster.rankMeta?.structTopLabels?.find(Boolean) ??
    labels[0]?.label ??
    '混合类目'
  const secondary =
    labels.find((item) => item.label !== primary && item.group !== '类目')?.label ??
    cluster.rankMeta?.structTopLabels?.find((item) => item && item !== primary) ??
    labels.find((item) => item.label !== primary)?.label ??
    '结构待补充'

  const groups = labels.reduce<Partial<Record<SemanticGroup, string[]>>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item.label]
    return acc
  }, {})

  const tags = Array.from(
    new Set(
      labels
        .filter((item) => item.label !== primary && item.label !== secondary)
        .slice(0, 4)
        .map((item) => `${item.group} ${item.label}`),
    ),
  )

  return {
    generatedClusterName: primary === secondary ? primary : `${primary} · ${secondary}`,
    generatedSummary: [primary, secondary, ...(groups.材质 ?? []).slice(0, 1), ...(groups.图案 ?? []).slice(0, 1)]
      .filter(Boolean)
      .join(' / '),
    primary,
    secondary,
    labels,
    tags: [`主类目 ${primary}`, `核心风格 ${secondary}`, ...tags].slice(0, 6),
    groups,
  }
}

export function buildClusterSemanticSummary(cluster: SemanticSourceLike): ClusterSemanticSummary {
  const semantic = cluster.semantic ?? buildHeuristicSemantic(cluster)
  return {
    title: semantic.generatedClusterName || semantic.primary || cluster.name || '未命名簇',
    summary: semantic.generatedSummary || stripLegacyInsightWordFreq(cluster.insight ?? ''),
    primary: semantic.primary,
    secondary: semantic.secondary,
    tags: semantic.tags?.length ? semantic.tags : [`主类目 ${semantic.primary}`, `核心风格 ${semantic.secondary}`],
  }
}

export function buildHeuristicClusterSemantic(cluster: SemanticSourceLike): FinderClusterSemantic {
  return buildHeuristicSemantic(cluster)
}
