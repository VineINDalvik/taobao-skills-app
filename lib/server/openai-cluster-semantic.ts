import { FASHION_CLUSTER_LABELS, type SemanticGroup } from '@/lib/fashion-cluster-labels'
import { openAiJson } from '@/lib/server/openai'

type ClusterLabelHit = {
  label: string
  group: SemanticGroup
  score: number
}

type ClusterSemanticResponse = {
  generatedClusterName?: string
  generatedSummary?: string
  primary?: string
  secondary?: string
  labels?: ClusterLabelHit[]
  tags?: string[]
  groups?: Partial<Record<SemanticGroup, string[]>>
}

type AnnotateInputCluster = {
  styleId: string
  name?: string
  cnDesc?: string
  insight?: string
  competitorNames?: string[]
  imageUrls?: string[]
}

function labelCatalogText(): string {
  const groups = new Map<SemanticGroup, string[]>()
  for (const item of FASHION_CLUSTER_LABELS) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item.label])
  }
  return Array.from(groups.entries())
    .map(([group, labels]) => `- ${group}: ${labels.join(' / ')}`)
    .join('\n')
}

function normalizeLabels(raw?: ClusterLabelHit[]): Array<{ id: string; label: string; group: SemanticGroup; score: number }> {
  const allowByLabel = new Map(FASHION_CLUSTER_LABELS.map((item) => [item.label, item]))
  const seen = new Set<string>()
  const normalized: Array<{ id: string; label: string; group: SemanticGroup; score: number }> = []

  for (const item of raw ?? []) {
    if (!item?.label || seen.has(item.label) || !allowByLabel.has(item.label)) continue
    const meta = allowByLabel.get(item.label)!
    normalized.push({
      id: meta.id,
      label: meta.label,
      group: meta.group,
      score: Math.max(0, Math.min(1, Number(item.score || 0))),
    })
    seen.add(item.label)
  }

  return normalized.slice(0, 8)
}

function normalizeSemantic(raw: ClusterSemanticResponse) {
  const labels = normalizeLabels(raw.labels)
  if (!labels.length) {
    throw new Error('GPT-4o 未返回有效 cluster labels')
  }

  const groups = labels.reduce<Partial<Record<SemanticGroup, string[]>>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item.label]
    return acc
  }, {})

  const primary =
    groups.类目?.find((label) => label === raw.primary) ??
    groups.类目?.[0] ??
    labels[0].label
  const secondary =
    labels.find((item) => item.label === raw.secondary && item.label !== primary)?.label ??
    labels.find((item) => item.group !== '类目' && item.label !== primary)?.label ??
    labels.find((item) => item.label !== primary)?.label ??
    primary
  const generatedClusterName = raw.generatedClusterName?.trim() || `${primary} · ${secondary}`
  const generatedSummary = raw.generatedSummary?.trim() || [primary, secondary].filter(Boolean).join(' / ')
  const validLabelSet = new Set(labels.map((l) => l.label))
  const tags = (raw.tags ?? []).map((item) => item.trim()).filter((item) => validLabelSet.has(item))

  return {
    generatedClusterName,
    generatedSummary,
    primary,
    secondary,
    labels,
    tags: tags.length ? tags.slice(0, 8) : [primary, secondary].filter(Boolean),
    groups,
  }
}

export async function annotateClustersWithOpenAi(clusters: AnnotateInputCluster[]) {
  const results: Array<{ styleId: string; semantic: ReturnType<typeof normalizeSemantic> }> = []

  for (const cluster of clusters) {
    const content: Array<Record<string, unknown>> = [
      {
        type: 'text',
        text: `你是一名女装电商聚类语义分析师。请对一个视觉簇做“多标签理解 + cluster 生成/归类”。

你必须且只能从下面给定的固定 45 个标签池中选择标签，绝对不能自己发明、捏造或使用任何不在列表中的新标签词汇：
${labelCatalogText()}

输入 cluster 信息：
- 当前 cluster 名：${cluster.name || ''}
- 中文描述：${cluster.cnDesc || ''}
- insight：${cluster.insight || ''}
- 样本竞品标题：${(cluster.competitorNames ?? []).slice(0, 6).join(' | ')}

请输出严格 JSON，不要 markdown，不要解释：
{
  "generatedClusterName": "重新生成的 cluster 名，适合业务展示，10-24 字",
  "generatedSummary": "一句话总结这个 cluster 的核心卖点/风格/版型方向",
  "primary": "必须从你选出的类目标签中挑选一个作为主类目",
  "secondary": "必须从你选出的风格或版型标签中挑选一个作为核心第二标签",
  "labels": [
    {
      "label": "必须来自固定标签池",
      "group": "类目|风格|版型|材质|图案",
      "score": 0.0
    }
  ],
  "tags": ["必须直接使用你选出的标签名，例如：极简高级", "连衣裙"],
  "groups": {
    "类目": ["..."],
    "风格": ["..."],
    "版型": ["..."],
    "材质": ["..."],
    "图案": ["..."]
  }
}

要求：
- 先分类目，再分风格（Pipeline 拆分）：在判定风格前，先做严格的“实体识别”（这是上衣、连衣裙、还是饰品？）。如果是非服装类目（如鞋垫、饰品等），请直接跳过风格判定，不要强行打上服装风格标签。
- 风格边界约束：注意区分“日常清凉夏装/度假装”与“性感魅力”。纯色棉质吊带、宽松沙滩裙属于“休闲度假”或“基础百搭”，不要误判为“性感魅力”；“性感魅力”装必须具备紧身、亮片、深V、派对场景等强特征。
- 至少输出 4 个标签，最多 8 个标签，所有标签必须 100% 存在于上方的 45 个标签池中。
- primary 必须是你选出的“类目”标签之一。
- secondary 必须是你选出的“风格”或“版型”标签之一。
- score 范围 0 到 1，按相关性排序。
- 如果图片和文本冲突，优先以图片视觉为准。`,
      },
    ]

    for (const url of (cluster.imageUrls ?? []).slice(0, 3)) {
      if (!url) continue
      content.push({
        type: 'image_url',
        image_url: {
          url,
          detail: 'low',
        },
      })
    }

    const data = await openAiJson<{
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }>('/v1/chat/completions', {
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a precise fashion cluster labeling assistant. Return JSON only.',
        },
        {
          role: 'user',
          content,
        },
      ],
    })

    const text = data.choices?.[0]?.message?.content?.trim() || '{}'
    const parsed = JSON.parse(text) as ClusterSemanticResponse
    results.push({
      styleId: cluster.styleId,
      semantic: normalizeSemantic(parsed),
    })
  }

  return { ok: true, results }
}
