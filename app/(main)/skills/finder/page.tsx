'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, MetricCard, SectionTitle } from '@/components/shared/SkillLayout'
import { TierBadge, TierGradePill, RiskBadge } from '@/components/shared/Badges'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { ExportButton } from '@/components/shared/ExportButton'
import { FinderDataChat } from '@/components/finder/FinderDataChat'
import { ExtensionDesignLab } from '@/components/finder/ExtensionDesignLab'
import { SourceAndConfirm } from '@/components/finder/SourceAndConfirm'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import {
  ArrowRight, Zap, TrendingUp, ShieldCheck,
  CheckCircle2,
  LayoutGrid, BarChart3, ClipboardList, Cpu, MessageSquare, Palette,
  ChevronRight, Lock, X, Images, Globe2,
} from 'lucide-react'
import { DataFlowHint, CaseStudyBanner } from '@/components/shared/DataFlowHint'
import { cn } from '@/lib/utils'
import RAW_CLUSTER_JSON from '@/lib/cluster-data.json'
import type { ClusterDataRow } from '@/lib/cluster-data-types'

const RAW_CLUSTER_DATA = RAW_CLUSTER_JSON as ClusterDataRow[]
import type { StyleCluster, ClassifyResult } from '@/lib/types'
import type { FinderVisualCluster } from '@/lib/finder-cluster-model'
import { resolveClusterModelOutput, tierLabel } from '@/lib/finder-cluster-model'
import {
  scoreFinderClusters,
  finderClustersHaveCentroids,
  type RankedFinderCluster,
  type FinderClusterSortMode,
} from '@/lib/finder-cluster-rank'
import { buildClusterSemanticSummary, stripLegacyInsightWordFreq } from '@/lib/finder-cluster-semantic'

type PageState = 'idle' | 'loading' | 'done'
type TopTab = 'workbench' | 'market' | 'playbook' | 'extend' | 'model' | 'chat'
type FlowStep = 1 | 2 | 3

/** 与 lib/cluster-data.json 导出条数对齐；多簇时工作台用响应式网格展示 */
const FINDER_CLUSTER_LIMIT = 12

function competitorPriceToYuanBracket(price: string): string {
  const raw = price.replace(/,/g, '').trim()
  let yuan: number
  if (raw.includes('¥') || raw.includes('￥')) {
    yuan = parseFloat(raw.replace(/[^\d.]/g, '')) || 0
  } else {
    const usd = parseFloat(raw.replace(/[^\d.]/g, '')) || 0
    yuan = usd * 7.2
  }
  const lo = Math.max(1, Math.round(yuan * 0.75))
  const hi = Math.round(yuan * 1.3)
  return `¥${lo}–${hi}/件`
}

type TabDef = { id: TopTab; label: string; short: string; icon: typeof LayoutGrid }

/** 主线：跟款闭环；参考：不阻塞主路径 */
const FINDER_TABS_PRIMARY: TabDef[] = [
  { id: 'workbench', label: '流程工作台', short: '工作台', icon: LayoutGrid },
  { id: 'market', label: '市场与簇', short: '簇分析', icon: BarChart3 },
  { id: 'playbook', label: '测款与复盘', short: '测款', icon: ClipboardList },
  { id: 'extend', label: '延伸设计', short: '延伸', icon: Palette },
]
const FINDER_TABS_REFERENCE: TabDef[] = [
  { id: 'model', label: '模型说明', short: '模型', icon: Cpu },
  { id: 'chat', label: '对话与数据', short: '数据', icon: MessageSquare },
]

const BASE_VISUAL_CLUSTERS: FinderVisualCluster[] = RAW_CLUSTER_DATA
  .slice(0, FINDER_CLUSTER_LIMIT)
  .map((c, i) => ({
    styleId: `style-${String(i + 1).padStart(3, '0')}`,
    name: c.name,
    emoji: c.emoji,
    cnDesc: c.cnDesc,
    demandGrowth: c.demandGrowth,
    demandPct: c.demandPct,
    competition: c.competition,
    insight: c.insight,
    mosaicImgs: c.mosaicImages.slice(0, 4) as [string, string, string, string],
    competitors: c.competitors,
    hotCount: c.hotCount,
    avgSales: c.avgSales,
    centroidEmbedding: c.centroidEmbedding,
    semantic: c.semantic,
  }))

const FINDER_HAS_CLUSTER_CENTROIDS = finderClustersHaveCentroids(BASE_VISUAL_CLUSTERS)

type VisualClusterRow = RankedFinderCluster

/** 单簇展示用图库：先收集 mosaic + 竞品主图（去重），再循环铺到与样本数一致（大样本 capped） */
const CLUSTER_GALLERY_CAP = 200

function buildClusterGalleryUrls(cl: VisualClusterRow): {
  urls: string[]
  uniqueSourceCount: number
  sampleSize: number
  capped: boolean
} {
  const seen = new Set<string>()
  const unique: string[] = []
  const push = (raw: string | undefined) => {
    if (!raw || typeof raw !== 'string') return
    const s = raw.trim()
    if (s.length < 24) return
    if (seen.has(s)) return
    seen.add(s)
    unique.push(s)
  }
  for (const u of cl.mosaicImgs ?? []) push(u)
  for (const comp of cl.competitors ?? []) push(comp.image)

  const sampleSize = Math.max(1, cl.hotCount ?? 0)
  const target = Math.min(sampleSize, CLUSTER_GALLERY_CAP)
  const capped = sampleSize > CLUSTER_GALLERY_CAP

  if (unique.length === 0) {
    return { urls: [], uniqueSourceCount: 0, sampleSize, capped }
  }

  const urls: string[] = []
  for (let i = 0; i < target; i++) {
    urls.push(unique[i % unique.length])
  }
  return { urls, uniqueSourceCount: unique.length, sampleSize, capped }
}

type InspirationCluster = {
  cluster: RankedFinderCluster
  platforms: string[]
  platformLabel: string
  inspirationCount: number
  trendHits: number
  heroImage: string
  heroName: string
  heroPrice: string
  inspirationText: string
}

function isStationOutPlatform(platform: string): boolean {
  return !/(淘宝|天猫|taobao|tmall|1688)/i.test(platform)
}

function buildInspirationClusters(clusters: RankedFinderCluster[]): InspirationCluster[] {
  return clusters
    .map((cluster) => {
      const external = (cluster.competitors ?? []).filter((c) => isStationOutPlatform(c.platform))
      if (external.length === 0) return null
      const platforms = Array.from(new Set(external.map((c) => c.platform).filter(Boolean)))
      const hero = external.find((c) => c.trend) ?? external[0]
      const inspirationText = external
        .slice(0, 3)
        .map((c) => c.name)
        .join(' · ')
      return {
        cluster,
        platforms,
        platformLabel: platforms.slice(0, 2).join(' / ') || '站外灵感',
        inspirationCount: external.length,
        trendHits: external.filter((c) => c.trend).length,
        heroImage: hero?.image ?? cluster.mosaicImgs[0],
        heroName: hero?.name ?? cluster.name,
        heroPrice: hero?.price ?? '',
        inspirationText,
      } satisfies InspirationCluster
    })
    .filter((row): row is InspirationCluster => row !== null)
    .sort((a, b) => {
      if (b.trendHits !== a.trendHits) return b.trendHits - a.trendHits
      if (b.cluster.rankMeta.tierRank !== a.cluster.rankMeta.tierRank) {
        return b.cluster.rankMeta.tierRank - a.cluster.rankMeta.tierRank
      }
      return (b.cluster.avgSales ?? 0) - (a.cluster.avgSales ?? 0)
    })
}

function ClusterGalleryModal({
  cluster,
  rec,
  open,
  onClose,
}: {
  cluster: VisualClusterRow | null
  rec: StyleCluster | undefined
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !cluster) return null

  const { urls, uniqueSourceCount, sampleSize, capped } = buildClusterGalleryUrls(cluster)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cluster-gallery-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-muted/40 shrink-0">
          <div className="min-w-0">
            <h2 id="cluster-gallery-title" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Images className="size-4 shrink-0 text-primary" />
              <span className="truncate">
                {cluster.emoji} {cluster.name}
      </span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              样本数 <span className="font-mono font-medium text-foreground">n = {sampleSize}</span>
              {rec ? (
                <>
                  {' '}
                  · 模型档 <span className="font-mono">{rec.tier}</span> · 趋势 {rec.trendScore}
                </>
              ) : null}
              {uniqueSourceCount > 0 ? (
                <>
                  {' '}
                  · 数据内不重复主图 <span className="font-mono">{uniqueSourceCount}</span> 张
                </>
              ) : null}
              {capped ? (
                <span className="block text-amber-800 mt-0.5">
                  本弹窗最多铺 {CLUSTER_GALLERY_CAP} 格以保性能；超出部分仍为统计样本，未逐格附图。
                </span>
              ) : uniqueSourceCount > 0 && sampleSize > uniqueSourceCount ? (
                <span className="block text-muted-foreground mt-0.5">
                  下列共 {urls.length} 格与当前展示样本格数一致；图源不足时按主图循环示意。
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          {urls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              该簇 JSON 中暂无 mosaic / 竞品主图 URL，无法展示图库（样本数仍为 {sampleSize}）。
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {urls.map((src, idx) => (
                <figure
                  key={`${idx}-${src.slice(0, 48)}`}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  <figcaption className="absolute bottom-0 inset-x-0 bg-black/55 text-[9px] text-white px-1 py-0.5 font-mono tabular-nums">
                    #{idx + 1} / {urls.length}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground shrink-0">
          与「市场表」中该簇样本数一致；图源来自聚类导出的 mosaic 与 competitors 主图字段。
        </div>
      </div>
    </div>
  )
}

function confidenceLabel(c: StyleCluster['confidence']) {
  return c === 'high' ? '高' : c === 'mid' ? '中' : '低'
}

function SabModelExplainer({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-[12px] text-violet-950 leading-relaxed space-y-2', className)}>
      <p className="font-semibold text-violet-900">选品模型输出：S / A / B 销量潜力分级</p>
      <p>
        在<strong>风格簇对齐</strong>之后，<strong>GATv2</strong>（商品关系图 + 视觉与属性）与 <strong>LightGBM</strong> 融合，对「落入该簇的跟款候选」给出
        <strong>离散分级</strong>，表示<strong>相对销量潜力分位</strong>（不是承诺销量）。
      </p>
      <ul className="list-disc pl-4 space-y-1 text-[11px] text-violet-900/90">
        <li><strong>S</strong>：高潜力，优先排测款预算与备货试探。</li>
        <li><strong>A</strong>：中等潜力，小单 + 严格按 SOP 止损。</li>
        <li><strong>B</strong>：偏弱或长尾，需强差异化或降低预期。</li>
      </ul>
      <p className="text-[10px] text-violet-800/85">
        同屏上的 <strong>P25–P75 日销带</strong> 来自簇内统计校准；<strong>S/A/B</strong> 来自判别模型 head，二者一起构成「区间 + 档位」的选品结论。
      </p>
    </div>
  )
}

export default function FinderPage() {
  const router = useRouter()
  const { skill1, selectedStyle, runSkill1, selectStyle, productInput } = usePipelineStore()
  const classifyResult = usePipelineStore((s) => s.classifyResult)
  const selectSupplier = usePipelineStore((s) => s.selectSupplier)
  const [queryImageEmbedding, setQueryImageEmbedding] = useState<number[] | null>(null)
  const [embedQueryStatus, setEmbedQueryStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [clusterSortMode, setClusterSortMode] = useState<FinderClusterSortMode>('tier_sales')

  const rankedClusters: RankedFinderCluster[] = useMemo(() => {
    if (!skill1) return []
    return scoreFinderClusters({
      clusters: BASE_VISUAL_CLUSTERS,
      skill1,
      productInput,
      queryImageEmbedding,
      sortMode: clusterSortMode,
    })
  }, [skill1, productInput, queryImageEmbedding, clusterSortMode])

  useEffect(() => {
    const url = productInput.imageUrl?.trim()
    if (!url) {
      const resetTimer = window.setTimeout(() => {
        setQueryImageEmbedding(null)
        setEmbedQueryStatus('idle')
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setEmbedQueryStatus('loading')
      fetch('/api/embed-query-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      })
        .then((r) => r.json())
        .then((data: { ok?: boolean; embedding?: number[] }) => {
          if (cancelled) return
          if (data.ok && Array.isArray(data.embedding) && data.embedding.length > 0) {
            setQueryImageEmbedding(data.embedding)
            setEmbedQueryStatus('ok')
          } else {
            setQueryImageEmbedding(null)
            setEmbedQueryStatus('err')
          }
        })
        .catch(() => {
          if (!cancelled) {
            setQueryImageEmbedding(null)
            setEmbedQueryStatus('err')
          }
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [productInput.imageUrl])

  // Auto-select best matching cluster when classifyResult is available
  useEffect(() => {
    if (!classifyResult || !skill1) return
    const bestMatch = classifyResult.topClusters[0]
    if (!bestMatch) return
    const match = skill1.recommendations?.find((s) => s.name === bestMatch.clusterName)
    if (match) selectStyle(match)
  }, [classifyResult, skill1, selectStyle])

  const [pageState, setPageState] = useState<PageState>(skill1 ? 'done' : 'idle')
  const [topTab, setTopTab] = useState<TopTab>('workbench')
  const [activeFlowStep, setActiveFlowStep] = useState<FlowStep>(1)
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(selectedStyle?.id ?? null)
  const [selectedRefIdx, setSelectedRefIdx] = useState<number | null>(null)
  const [supplierImageUrl, setSupplierImageUrl] = useState<string>('')
  const [supplierConfirmed, setSupplierConfirmed] = useState(false)
  const insight = MODEL_INSIGHTS[1]

  const [clusterGalleryId, setClusterGalleryId] = useState<string | null>(null)
  const closeClusterGallery = useCallback(() => setClusterGalleryId(null), [])
  const galleryCluster = clusterGalleryId
    ? rankedClusters.find((c) => c.styleId === clusterGalleryId) ?? null
    : null
  const galleryRec =
    galleryCluster && skill1 ? resolveClusterModelOutput(skill1, galleryCluster) : undefined

  const activeCluster = rankedClusters.find((c) => c.styleId === selectedClusterId)
  const inspirationClusters = useMemo(() => buildInspirationClusters(rankedClusters), [rankedClusters])
  /** 每簇必有输出：mock 标定命中用精标；否则簇特征 → 合成 S/A/B + 区间（体现选品模型分级） */
  const activeRec =
    activeCluster && skill1 ? resolveClusterModelOutput(skill1, activeCluster) : undefined
  const activeCompetitors = activeCluster?.competitors ?? []
  const activeInternalRefs = activeCompetitors.filter((c) => !isStationOutPlatform(c.platform))
  const activeExternalRefs = activeCompetitors.filter((c) => isStationOutPlatform(c.platform))
  const step2Unlocked = !!selectedClusterId
  const step3Unlocked = selectedRefIdx !== null

  const handleSelectCluster = (styleId: string) => {
    setSelectedClusterId(styleId)
    setSelectedRefIdx(null)
    setSupplierImageUrl('')
    setSupplierConfirmed(false)
    selectSupplier(null)
    setActiveFlowStep(2)
  }

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🔍" title="AI 找款" subtitle="簇对齐 + GATv2/LightGBM 销量潜力 S/A/B · 簇级日销区间 · 多 Tab 工作台" />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-base font-medium mb-2">把「要跟的款」放进淘宝真实竞争里算一遍</h2>
          <p className="text-sm text-muted-foreground mb-3 text-left max-w-md mx-auto leading-relaxed">
            分析完成后，顶部可切换<strong className="text-foreground font-medium"> 工作台 / 簇分析 / 测款 / 延伸设计 / 模型 / 数据 </strong>
            。「延伸设计」提供换色、换图案与一键 Demo 效果图；多数商家主路径仍是直接跟爆款。
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['相似款对齐', 'S/A/B 分级', '簇级区间', '测款 SOP', '延伸出图', '数据接入'].map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPageState('loading')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Zap className="size-4" />
            开始 AI 找款
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🔍" title="AI 找款" subtitle="正在跑簇对齐与 GATv2+LightGBM 分级 · 生成 S/A/B 与销量区间" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill1(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill1) return null

  const { marketOverview } = skill1

  const visualSortEffective =
    clusterSortMode === 'visual' &&
    embedQueryStatus === 'ok' &&
    queryImageEmbedding != null &&
    FINDER_HAS_CLUSTER_CENTROIDS

  const renderStep1 = () => {
  return (
      <div className="space-y-5">
        <SabModelExplainer />

        <div>
          <h3 className="text-sm font-semibold mb-1">步骤 1：先对齐淘宝站内风格簇（主判断）</h3>
          <p className="text-xs text-muted-foreground">
            将「{productInput.category || '你的类目'}」映射到淘宝可观测相似款族群，先判断
            <strong className="text-foreground"> 有没有卖性</strong>；站外与趋势灵感放在下一个区块做
            <strong className="text-foreground"> 增量启发</strong>。类目增速 {marketOverview.categoryGrowth}
            {productInput.taobaoItemId && (
              <>
                {' '}· 参照商品 id <span className="font-mono text-foreground/90">{productInput.taobaoItemId}</span>
                {productInput.taobaoSkuId ? <span className="font-mono">/{productInput.taobaoSkuId}</span> : null}
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground shrink-0">对齐风格簇排序</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50">
              <button
                type="button"
                onClick={() => setClusterSortMode('tier_sales')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors',
                  clusterSortMode === 'tier_sales'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                S/A/B + 簇均销
              </button>
              <button
                type="button"
                onClick={() => setClusterSortMode('visual')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors',
                  clusterSortMode === 'visual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                视觉相似优先
          </button>
        </div>
      </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed border border-dashed border-border/80 rounded-lg px-2.5 py-2 bg-muted/20 mt-2">
            <span className="font-medium text-foreground">当前排序规则</span>
            {clusterSortMode === 'tier_sales' && (
              <>
                ：主序 <strong className="text-foreground">S/A/B 档位</strong> → 同档{' '}
                <strong className="text-foreground">簇均销（avgSales）</strong> → 需求增速 → 结构分破同分。适合先看模型潜力与体量。
              </>
            )}
            {clusterSortMode === 'visual' && visualSortEffective && (
              <>
                ：主序 <strong className="text-foreground">灵感图 vs 簇 centroid 视觉相似度</strong> →{' '}
                <strong className="text-foreground">S/A/B</strong> → <strong className="text-foreground">簇均销</strong>。需首页灵感图 URL 且本机/服务可跑 OpenCLIP，且{' '}
                <code className="text-[9px]">cluster-data</code> 含 <code className="text-[9px]">centroidEmbedding</code>。
              </>
            )}
            {clusterSortMode === 'visual' && !visualSortEffective && (
              <>
                ：已选「视觉优先」，但条件未满足（无灵感图向量、编码失败，或数据无 centroid），主序退化为{' '}
                <strong className="text-foreground">结构相似度（12 轴）</strong> → <strong className="text-foreground">S/A/B</strong> →{' '}
                <strong className="text-foreground">簇均销</strong>。
                {!FINDER_HAS_CLUSTER_CENTROIDS && (
                  <span className="text-amber-800"> 当前 JSON 无 centroid，视觉主序不可用；请跑 pipeline 生成 embedding。</span>
                )}
              </>
            )}
            {embedQueryStatus === 'loading' && productInput.imageUrl?.trim() && ' 正在编码灵感图…'}
            {embedQueryStatus === 'err' && productInput.imageUrl?.trim() && clusterSortMode === 'visual' && (
              <span className="text-destructive"> 灵感图 API 失败，视觉主序未生效。</span>
            )}
          </p>
      </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {rankedClusters.map((cluster) => {
            const isSelected = selectedClusterId === cluster.styleId
            const rec = resolveClusterModelOutput(skill1, cluster)
            const demandColor = cluster.demandPct > 0 ? 'text-green-600' : 'text-red-500'
            const semantic = buildClusterSemanticSummary(cluster)
            return (
              <button
                key={cluster.styleId}
                type="button"
                onClick={() => handleSelectCluster(cluster.styleId)}
                className={cn(
                  'rounded-xl border overflow-hidden text-left transition-all',
                  isSelected ? 'border-primary ring-2 ring-primary/25 shadow-md' : 'border-border hover:border-primary/40 hover:shadow-sm',
                )}
              >
                <div className="relative">
                <div className="grid grid-cols-2 gap-px bg-border">
                  {cluster.mosaicImgs.map((src, i) => (
                    <div key={i} className="relative aspect-square bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                  <div className="absolute top-1.5 right-1.5 scale-90 origin-top-right drop-shadow-sm">
                    <TierGradePill tier={rec.tier} />
                  </div>
                </div>
                <div className={cn('p-2.5', isSelected ? 'bg-primary/5' : 'bg-card')}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-semibold leading-tight line-clamp-2 pr-1">{cluster.emoji} {semantic.title}</span>
                    {isSelected && <span className="text-[9px] text-primary font-bold shrink-0">已选 ✓</span>}
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-1 line-clamp-1">主类目：{semantic.primary} · 核心：{semantic.secondary}</p>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {semantic.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[8px] px-1 py-px rounded bg-violet-100 text-violet-800 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-1.5 line-clamp-1">{tierLabel(rec.tier)}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('text-[10px] font-bold flex items-center gap-0.5', demandColor)}>
                      <TrendingUp className="size-2.5" />
                      {cluster.demandGrowth}
                    </span>
                    <span
                      className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                      cluster.competition === '低' ? 'bg-green-100 text-green-700' :
                      cluster.competition === '中' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700',
                      )}
                    >
                      竞争{cluster.competition}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{cluster.hotCount} 款热品</span>
                    <span className="text-[9px] font-mono text-foreground/80">趋势 {rec.trendScore}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1 font-mono tabular-nums">
                    对齐 结构 {Math.round(cluster.rankMeta.structScore * 100)}
                    {embedQueryStatus === 'ok' ? <> · 视觉 {Math.round(cluster.rankMeta.visualScore * 100)}</> : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-[8px] text-muted-foreground shrink-0">结构维 Top</span>
                    {cluster.rankMeta.structTopLabels.length ? (
                      cluster.rankMeta.structTopLabels.map((lab) => (
                        <span
                          key={lab}
                          className="text-[8px] px-1 py-px rounded bg-violet-100 text-violet-800 font-medium"
                        >
                          {lab}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8px] text-muted-foreground">未命中轴</span>
                    )}
                  </div>
                  {cluster.rankMeta.structOverlapLabels.length > 0 && (
                    <p className="text-[8px] text-violet-700/90 mt-0.5 leading-tight">
                      与输入重合：{cluster.rankMeta.structOverlapLabels.join(' · ')}
                    </p>
                  )}
                  {isSelected && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight border-t border-primary/20 pt-1.5">
                      {stripLegacyInsightWordFreq(cluster.insight)}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {activeCluster && activeRec && (
          <ClusterDetailCard
            activeRec={activeRec}
            structTopLabels={activeCluster.rankMeta.structTopLabels}
            structOverlapLabels={activeCluster.rankMeta.structOverlapLabels}
          />
        )}

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">站外 / 趋势灵感簇（辅判断）</h3>
            <p className="text-xs text-muted-foreground">
              同样挂到簇上看 <strong className="text-foreground">S/A/B、销量带、价格带</strong>，但用途是找灵感、找差异化；
              最终是否值得做，仍回到上面的淘宝站内簇判断。后续导入 Vogue / Cider / Shein CSV 也归这层。
            </p>
                </div>
          {inspirationClusters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {inspirationClusters.map((row) => {
                const rec = resolveClusterModelOutput(skill1, row.cluster)
                const isSelected = selectedClusterId === row.cluster.styleId
                const semantic = buildClusterSemanticSummary(row.cluster)
                return (
                  <button
                    key={`inspire-${row.cluster.styleId}`}
                    type="button"
                    onClick={() => handleSelectCluster(row.cluster.styleId)}
                    className={cn(
                      'rounded-xl border overflow-hidden text-left bg-card transition-all',
                      isSelected ? 'border-primary ring-2 ring-primary/25 shadow-md' : 'border-border hover:border-primary/40 hover:shadow-sm',
                    )}
                  >
                    <div className="flex">
                      <div className="w-24 sm:w-28 shrink-0 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.heroImage} alt="" className="w-full h-full object-cover aspect-[4/5]" />
                      </div>
                      <div className="flex-1 min-w-0 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                              <Globe2 className="size-3" />
                              {row.platformLabel}
                            </p>
                          <p className="text-xs font-semibold line-clamp-2 mt-0.5">{row.cluster.emoji} {semantic.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">主类目：{semantic.primary} · 核心：{semantic.secondary}</p>
                </div>
                          <TierGradePill tier={rec.tier} className="scale-90 origin-top-right shrink-0" />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{row.inspirationText || row.heroName}</p>
                <div className="flex flex-wrap gap-1">
                        {semantic.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[8px] px-1 py-px rounded bg-sky-100 text-sky-800 font-medium">
                            {tag}
                          </span>
                  ))}
                </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="font-mono text-foreground">趋势 {rec.trendScore}</span>
                          <span className="text-muted-foreground">P50 {rec.salesBand.p50} 件/天</span>
                          <span className="text-muted-foreground">{row.heroPrice ? competitorPriceToYuanBracket(row.heroPrice) : rec.priceRange}</span>
              </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                          <span>灵感样本 {row.inspirationCount}</span>
                          <span>·</span>
                          <span>热标 {row.trendHits}</span>
                          <span>·</span>
                          <span>{tierLabel(rec.tier)}</span>
              </div>
            </div>
            </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              当前 JSON 里还没有足够多站外平台字段；后续导入站外 / 趋势 CSV 后，这里会自动形成「灵感簇」。
          </div>
        )}
      </div>
      </div>
    )
  }

  const renderStep2 = () => {
    if (!step2Unlocked) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          请先在步骤 1 中选定一个风格簇。
            </div>
      )
    }

    const groups = [
      { title: '站内主参考（淘宝 / 天猫）', hint: '更贴近实际可卖性', items: activeInternalRefs },
      { title: '站外 / 趋势灵感', hint: '补元素、面料、版型与视觉方向', items: activeExternalRefs },
    ]

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-1">步骤 2：在已选簇中挑参考样本</h3>
          <p className="text-xs text-muted-foreground">
            站内样本负责贴近淘宝可卖性；站外样本负责补设计灵感。二者都挂在同一个簇上，最终仍回到淘宝簇闭环。
          </p>
          </div>

        {groups.map(({ title, hint, items }) => (
          <div key={title}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
              <p className="text-[10px] text-muted-foreground">{hint}</p>
            </div>
            {items.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
                {items.map((p) => {
                  const i = activeCompetitors.indexOf(p)
              const isChosen = selectedRefIdx === i
              return (
                <button
                      key={`${title}-${i}`}
                      type="button"
                  onClick={() => {
                    setSelectedRefIdx(i)
                    setSupplierImageUrl('')
                    setSupplierConfirmed(false)
                        setActiveFlowStep(3)
                  }}
                  className={cn(
                    'shrink-0 w-32 rounded-xl border overflow-hidden text-left transition-all',
                        isChosen ? 'border-primary ring-2 ring-primary/25 shadow-sm' : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className="relative h-40 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-medium">
                          {p.platform}
                        </div>
                    {p.trend && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-red-500/90 text-white text-[9px] font-bold flex items-center gap-0.5">
                            <TrendingUp className="size-2.5" />
                            热
                      </div>
                    )}
                    {isChosen && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="size-7 text-primary drop-shadow" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
                      <p className="text-white text-[9px] font-medium">{p.sales}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-card">
                    <p className="text-[10px] font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.price}</p>
                  </div>
                </button>
              )
            })}
          </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-[11px] text-muted-foreground">
                当前已选簇还没有这类来源的样本；后续导入更多平台 CSV 后会自动补齐。
              </div>
            )}
          </div>
        ))}

          {selectedRefIdx !== null && (
          <p className="text-[10px] text-primary flex items-center gap-1">
              <CheckCircle2 className="size-3" />
            已选「{activeCompetitors[selectedRefIdx]?.name}」— 可进入步骤 3
          </p>
          )}
        </div>
    )
  }

  const renderStep3 = () => {
    if (!step2Unlocked || !activeRec) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          请先完成步骤 1–2。
            </div>
      )
    }
    if (!step3Unlocked) {
      return (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-10 text-center text-sm text-amber-900">
          请在步骤 2 中选择一款参考爆款。
          </div>
      )
    }
    return (
      <SourceAndConfirm
        activeRec={activeRec}
        supplierImageUrl={supplierImageUrl}
        setSupplierImageUrl={setSupplierImageUrl}
        supplierConfirmed={supplierConfirmed}
        onConfirm={() => {
          if (!activeRec) return
          selectStyle(activeRec)
          setSupplierConfirmed(true)
          setTopTab('playbook')
        }}
      />
    )
  }

  const renderMarketTab = () => {
    const tierCounts: Record<'S' | 'A' | 'B', number> = { S: 0, A: 0, B: 0 }
    for (const cl of rankedClusters) {
      const t = resolveClusterModelOutput(skill1, cl).tier
      tierCounts[t] += 1
    }
    return (
    <div className="space-y-8">
      <SabModelExplainer />
      <div>
        <h3 className="text-sm font-semibold mb-3">类目大盘</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="类目增速" value={marketOverview.categoryGrowth} highlight />
          <MetricCard label="竞品均价" value={`¥${marketOverview.avgPrice}`} />
          <MetricCard
            label="竞争强度"
            value={marketOverview.competitionLevel === 'mid' ? '中等' : marketOverview.competitionLevel === 'low' ? '低' : '高'}
            sub="有差异化空间"
          />
          <MetricCard label="热词 TOP2" value={marketOverview.topKeywords.slice(0, 2).join(' · ')} />
        </div>
        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-amber-900">当前视图簇 · S/A/B 分布（模型分级）</span>
          <span className="tabular-nums"><strong className="text-amber-800">S</strong> {tierCounts.S} 簇</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums"><strong className="text-blue-800">A</strong> {tierCounts.A} 簇</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums"><strong className="text-zinc-700">B</strong> {tierCounts.B} 簇</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1">淘宝站内簇总览（主判断）</h3>
        <p className="text-xs text-muted-foreground mb-4">先用淘宝簇看 S/A/B、样本 n、销量带和竞争度，判断这门生意值不值得做；点击「选中」回工作台</p>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-left text-muted-foreground">
                <th className="p-3 font-medium">风格簇</th>
                <th className="p-3 font-medium">S/A/B</th>
                <th className="p-3 font-medium">趋势分</th>
                <th className="p-3 font-medium">需求</th>
                <th className="p-3 font-medium">竞争</th>
                <th className="p-3 font-medium">样本 n</th>
                <th className="p-3 font-medium">P50 日销</th>
                <th className="p-3 font-medium">置信</th>
                <th className="p-3 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {rankedClusters.map((cl) => {
                const rec = resolveClusterModelOutput(skill1, cl)
                const semantic = buildClusterSemanticSummary(cl)
                return (
                  <tr key={cl.styleId} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium max-w-[180px]">
                      <div className="space-y-0.5">
                        <span className="block line-clamp-2">{cl.emoji} {semantic.title}</span>
                        <span className="block text-[10px] text-muted-foreground line-clamp-1">主类目：{semantic.primary} · 核心：{semantic.secondary}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <TierBadge tier={rec.tier} />
                        <span className="text-[9px] text-muted-foreground line-clamp-2">{tierLabel(rec.tier)}</span>
                      </div>
                    </td>
                    <td className="p-3 tabular-nums font-medium">{rec.trendScore}</td>
                    <td className="p-3 tabular-nums">{cl.demandGrowth}</td>
                    <td className="p-3">{cl.competition}</td>
                    <td className="p-3 tabular-nums">{rec.clusterSampleSize}</td>
                    <td className="p-3 tabular-nums">{rec.salesBand.p50} 件/天</td>
                    <td className="p-3">{confidenceLabel(rec.confidence)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCluster(cl.styleId)
                          setTopTab('workbench')
                          setActiveFlowStep(1)
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        选中
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1">淘宝站内簇卡片（视觉 + 模型字段）</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          点击卡片上方<strong className="text-foreground"> 四宫格拼图 </strong>
          打开图库：缩略图格数与<strong className="text-foreground"> 样本数 n </strong>一致（图源不足时在数据内循环示意；超大样本最多展示 {CLUSTER_GALLERY_CAP} 格）。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rankedClusters.map((cl) => {
            const rec = resolveClusterModelOutput(skill1, cl)
            const sel = selectedClusterId === cl.styleId
            return (
              <div
                key={cl.styleId}
                className={cn(
                  'rounded-xl border overflow-hidden bg-card flex flex-col',
                  sel ? 'ring-2 ring-primary border-primary' : 'border-border',
                )}
              >
                <div className="relative">
                  <button
                    type="button"
                    className="relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-t-xl"
                    onClick={() => setClusterGalleryId(cl.styleId)}
                  >
                    <span className="sr-only">
                      打开该簇样本图库，共 {cl.hotCount} 张与样本数对齐
                    </span>
                    <div className="grid grid-cols-2 gap-px bg-border">
                      {cl.mosaicImgs.map((src, i) => (
                        <div key={i} className="relative aspect-square bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 pointer-events-none flex justify-center pb-2 pt-8 bg-gradient-to-t from-black/65 to-transparent">
                      <span className="text-[10px] font-medium text-white drop-shadow-sm flex items-center gap-1">
                        <Images className="size-3 opacity-90" />
                        查看 {cl.hotCount} 张
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 scale-[0.82] origin-top-right pointer-events-none">
                    <TierGradePill tier={rec.tier} />
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold line-clamp-2">{cl.emoji} {cl.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{rec.trendScore}分</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{tierLabel(rec.tier)}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{rec.bandCaption}</p>
                  <p className="text-[11px] font-mono">
                    P25–P75：{rec.salesBand.p25}–{rec.salesBand.p75} <span className="text-muted-foreground font-sans">件/天</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[8px] text-muted-foreground shrink-0">结构维 Top</span>
                    {cl.rankMeta.structTopLabels.length ? (
                      cl.rankMeta.structTopLabels.map((lab) => (
                        <span
                          key={lab}
                          className="text-[8px] px-1 py-px rounded bg-violet-100 text-violet-800 font-medium"
                        >
                          {lab}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8px] text-muted-foreground">未命中轴</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCluster(cl.styleId)
                      setTopTab('workbench')
                      setActiveFlowStep(1)
                    }}
                    className="mt-auto text-[10px] font-medium text-primary flex items-center gap-0.5"
                  >
                    在工作台打开 <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1">站外 / 趋势灵感簇（辅判断）</h3>
        <p className="text-xs text-muted-foreground mb-4">把站外竞品、趋势站点、时尚趋势 CSV 也挂回簇里看。这里同样展示 S/A/B、价格带和销量带，但它回答的是「怎么改更有差异」，不是单独替代淘宝判断。</p>
        {inspirationClusters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {inspirationClusters.map((row) => {
              const cl = row.cluster
              const rec = resolveClusterModelOutput(skill1, cl)
            const semantic = buildClusterSemanticSummary(cl)
              const sel = selectedClusterId === cl.styleId
              return (
                <div
                  key={`market-inspire-${cl.styleId}`}
                  className={cn(
                    'rounded-xl border overflow-hidden bg-card flex flex-col',
                    sel ? 'ring-2 ring-primary border-primary' : 'border-border',
                  )}
                >
                  <div className="relative h-40 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.heroImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 rounded-md bg-black/60 text-white text-[9px] px-1.5 py-0.5 font-medium flex items-center gap-1">
                      <Globe2 className="size-2.5" />
                      {row.platformLabel}
                    </div>
                    <div className="absolute top-2 right-2 scale-[0.82] origin-top-right">
                      <TierGradePill tier={rec.tier} />
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold line-clamp-2">{cl.emoji} {semantic.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{rec.trendScore}分</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">主类目：{semantic.primary} · 核心：{semantic.secondary}</p>
                    <div className="flex flex-wrap gap-1">
                      {semantic.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[8px] px-1 py-px rounded bg-sky-100 text-sky-800 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{row.inspirationText || row.heroName}</p>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">{tierLabel(rec.tier)}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">{row.heroPrice ? competitorPriceToYuanBracket(row.heroPrice) : rec.priceRange}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">P50 {rec.salesBand.p50} 件/天</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      灵感样本 {row.inspirationCount} · 热标 {row.trendHits} · 同簇 n={rec.clusterSampleSize}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectCluster(cl.styleId)
                        setTopTab('workbench')
                        setActiveFlowStep(1)
                      }}
                      className="mt-auto text-[10px] font-medium text-primary flex items-center gap-0.5"
                    >
                      用这个簇继续 <ChevronRight className="size-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            当前导出的簇数据里，站外平台样本还不够多；等你补充站外 / 时尚趋势 CSV 后，这里会自动形成灵感簇。
          </div>
        )}
      </div>
      {activeRec && activeCluster && (
        <div>
          <h3 className="text-sm font-semibold mb-3">当前选中簇 · 深度摘要</h3>
          <ClusterDetailCard
            activeRec={activeRec}
            structTopLabels={activeCluster.rankMeta.structTopLabels}
            structOverlapLabels={activeCluster.rankMeta.structOverlapLabels}
          />
        </div>
      )}
    </div>
    )
  }

  const renderPlaybookTab = () => {
    if (!activeRec) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">尚未选定风格簇。</p>
          <button type="button" onClick={() => { setTopTab('workbench'); setActiveFlowStep(1) }} className="text-sm text-primary font-medium">
            去工作台选簇
          </button>
        </div>
      )
    }
    if (!supplierConfirmed) {
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
            你已在簇「{activeRec.name}」上查看测款预案。当前选品模型输出为 <strong>{activeRec.tier}</strong> 档（{tierLabel(activeRec.tier)}，趋势分 {activeRec.trendScore}）。
            完成工作台 <b>步骤 3</b> 上传实拍并确认后，可解锁完整复盘与去测款按钮。
          </div>
          <SectionTitle>测款预案预览（当前簇）</SectionTitle>
          <TestPlanBlock activeRec={activeRec} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { setTopTab('workbench'); setActiveFlowStep(3) }}
              className="text-sm text-primary font-medium inline-flex items-center gap-1"
            >
              去完成选款确认 <ChevronRight className="size-4" />
            </button>
            <span className="text-muted-foreground text-xs">或</span>
            <button
              type="button"
              onClick={() => setTopTab('extend')}
              className="text-sm font-medium inline-flex items-center gap-1 text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-lg hover:bg-amber-100"
            >
              <Palette className="size-3.5" />
              延伸设计（换色 / 出图 Demo）
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            跟爆款不必做延伸；若你想先看换色、换图案沟通稿，可用「延伸设计」Tab（基于当前款主图 Demo）。
          </p>
        </div>
      )
    }
    return (
      <div id="style-confirmed" className="space-y-6">
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="w-12 h-16 rounded-lg overflow-hidden border border-green-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={supplierImageUrl} alt="你的款" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-800">选款完成 · 按 SOP 测款</p>
              <p className="text-[10px] text-green-700 mt-0.5">
              {activeCluster?.emoji} {activeCluster?.name} · {activeRec.name} · ¥{activeRec.priceRange}
              </p>
              <p className="text-[10px] text-green-600 mt-0.5">
              模型分级 <strong className="text-green-800">{activeRec.tier}</strong>（{tierLabel(activeRec.tier)}）· 趋势分 {activeRec.trendScore}
              {' · '}
              簇级 P25–P75：{activeRec.salesBand.p25}–{activeRec.salesBand.p75} 件/天 · 参考 {activeCompetitors[selectedRefIdx!]?.name}
              </p>
            </div>
            <button
            type="button"
            onClick={() => {
              setSelectedClusterId(null)
              setSelectedRefIdx(null)
              setSupplierImageUrl('')
              setSupplierConfirmed(false)
              setActiveFlowStep(1)
            }}
              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
            >
              重选
            </button>
          </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionTitle className="mb-0">延伸款方向</SectionTitle>
          <button
            type="button"
            onClick={() => setTopTab('extend')}
            className="text-xs font-medium inline-flex items-center gap-1.5 text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/15 shrink-0"
          >
            <Palette className="size-3.5" />
            打开延伸设计工具
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-1">
            {activeRec.extensions.map((ext) => (
            <div key={ext.direction} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">方向 {ext.direction}</span>
                  <RiskBadge risk={ext.risk} />
                </div>
                <p className="text-[10px] font-medium">{ext.description}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{ext.change}</p>
              {(ext.styleLine || ext.fabric || ext.fitSilhouette) && (
                <ul className="mt-2 pt-2 border-t border-border space-y-1 text-[9px] text-muted-foreground leading-snug">
                  {ext.styleLine && (
                    <li>
                      <span className="font-semibold text-foreground/75">款式</span> {ext.styleLine}
                    </li>
                  )}
                  {ext.fabric && (
                    <li>
                      <span className="font-semibold text-foreground/75">面料</span> {ext.fabric}
                    </li>
                  )}
                  {ext.fitSilhouette && (
                    <li>
                      <span className="font-semibold text-foreground/75">版型</span> {ext.fitSilhouette}
                    </li>
                  )}
                </ul>
              )}
              </div>
            ))}
          </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          需要给工厂看图时，到「延伸设计」一键生成 Demo 效果图并复制多模态提示词；不做延伸也可直接进入测款。
        </p>
        <SectionTitle>测款执行清单</SectionTitle>
        <TestPlanBlock activeRec={activeRec} />
        <div className="flex justify-end">
            <button
            type="button"
              onClick={() => router.push('/skills/testing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
            进入测款验证
              <ArrowRight className="size-4" />
            </button>
          </div>
          <DataFlowHint
          title="找款结果 → 下游自动带入"
            flows={[
            { from: 'Skill 1', value: `簇级区间 · 置信${confidenceLabel(activeRec.confidence)}`, toLabel: '测款验证', to: '对照 SOP 阈值判断是否加码/止损' },
            { from: 'Skill 1', value: `趋势分 ${activeRec.trendScore} · S/A/B`, toLabel: 'Skill 3 定价', to: '冷启动价格锚点与竞品带' },
            { from: 'Skill 1', value: '基因标签 + 实拍图', toLabel: 'Skill 2 上架', to: '标题、主图与 SKU 结构' },
          ]}
          className="mb-2"
        />
          <CaseStudyBanner
            cases={[
            { merchant: '广州商家 阿珍', label: '使用 AI 找款后', metric: '首月 GMV ¥9.4万', detail: '锁定法式碎花连衣裙，直通车 ROI 3.2 放量', highlight: true },
            { merchant: '杭州女装店 小鱼', label: 'AI 推荐 vs 自选', metric: 'CTR +71%', detail: 'AI 款趋势分更高，访客量为自选款 2.3 倍', highlight: false },
            ]}
          />
        </div>
    )
  }

  const renderExtendTab = () => {
    if (!activeRec) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">请先在工作台选定一个风格簇。</p>
          <button type="button" onClick={() => { setTopTab('workbench'); setActiveFlowStep(1) }} className="text-sm text-primary font-medium">
            去选簇
          </button>
        </div>
      )
    }
    const previewSrc = supplierImageUrl || activeRec.imageUrl
    return (
      <div className="max-w-4xl mx-auto space-y-2">
        <h3 className="text-sm font-semibold">延伸设计实验室</h3>
        <p className="text-xs text-muted-foreground mb-4">
          底图优先使用你已上传的供应商/实拍图；未上传时使用模型推荐主图。
        </p>
        <ExtensionDesignLab
          key={activeRec.id + (supplierImageUrl ? '-sup' : '-def')}
          baseImageUrl={previewSrc}
          productName={activeRec.name}
          extensions={activeRec.extensions}
          productAttributes={activeRec.attributes}
          semantic={activeCluster?.semantic ?? null}
        />
      </div>
    )
  }

  const flowSteps: { step: FlowStep; title: string; desc: string; locked: boolean }[] = [
    { step: 1, title: '对齐风格簇', desc: '选簇 + 区间', locked: false },
    { step: 2, title: '参考爆款', desc: '外站/淘内对照', locked: !step2Unlocked },
    { step: 3, title: '货源与确认', desc: '实拍 + 确认', locked: !step3Unlocked },
  ]

  return (
    <div className="min-h-[calc(100dvh-0px)] flex flex-col bg-background">
      <div className="shrink-0 px-4 sm:px-6 pt-8 pb-2 max-w-[1400px] mx-auto w-full">
        <SkillHeader icon="🔍" title="AI 找款" subtitle="每簇必有 S/A/B 销量潜力分级（GATv2+LightGBM）· 簇级区间校准 · 左侧三步工作台">
          <div className="flex items-center gap-2">
            <ExportButton skillLabel="AI 找款" data={skill1} />
            <button
              type="button"
              onClick={() => setPageState('idle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              重新分析
            </button>
          </div>
        </SkillHeader>
      </div>

      <div className="shrink-0 sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-1 sm:gap-x-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0 mr-1 hidden sm:inline">
              跟款
            </span>
            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
              {FINDER_TABS_PRIMARY.map(({ id, label, short, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTopTab(id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    topTab === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5 sm:size-4 shrink-0 opacity-90" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              ))}
            </div>
            <div className="hidden sm:block h-6 w-px bg-border shrink-0 mx-1" aria-hidden />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0 mr-1 hidden md:inline">
              参考
            </span>
            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
              {FINDER_TABS_REFERENCE.map(({ id, label, short, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTopTab(id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-transparent',
                    topTab === id
                      ? 'bg-muted text-foreground border-border shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5 sm:size-4 shrink-0 opacity-90" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground border-t border-border/60 pt-2">
            {topTab === 'workbench' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                工作台 步骤 {activeFlowStep}/3 · {flowSteps.find((s) => s.step === activeFlowStep)?.title ?? ''}
              </span>
            )}
            {topTab === 'market' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                横向对比簇与 S/A/B，选中后回工作台继续
              </span>
            )}
            {topTab === 'playbook' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                {supplierConfirmed ? '选款已定 · 执行测款与延伸预案' : '测款预案预览 · 需在工作台确认选款后解锁完整复盘'}
              </span>
            )}
            {topTab === 'extend' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                可选 · 给工厂/设计的沟通 Demo，不阻塞主路径
              </span>
            )}
            {topTab === 'model' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                技术说明与加载步骤解释
              </span>
            )}
            {topTab === 'chat' && (
              <span>
                <span className="text-foreground/80 font-medium">当前位置：</span>
                数据接入与聚类 API（自建环境）
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 max-w-[1400px] mx-auto w-full">
        {topTab === 'workbench' && (
          <aside className="hidden sm:flex w-52 shrink-0 flex-col border-r border-border bg-muted/15 py-4 px-2 gap-1">
            <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">步骤</p>
            {flowSteps.map(({ step, title, desc, locked }) => {
              const active = activeFlowStep === step
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    if (locked && step === 2) setActiveFlowStep(1)
                    else if (locked && step === 3) setActiveFlowStep(step2Unlocked ? 2 : 1)
                    else setActiveFlowStep(step)
                  }}
                  className={cn(
                    'w-full text-left rounded-lg px-2.5 py-2.5 transition-colors border border-transparent',
                    active ? 'bg-primary/10 border-primary/20 text-foreground' : 'hover:bg-muted/80 text-muted-foreground',
                    locked && !active && 'opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate flex items-center gap-1">
                        {title}
                        {locked && <Lock className="size-2.5 text-muted-foreground shrink-0" aria-hidden />}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
          </div>
        </div>
                </button>
              )
            })}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-w-0">
          {topTab === 'workbench' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {classifyResult && <ClassifyResultBanner result={classifyResult} />}
              <div className="sm:hidden flex gap-1 overflow-x-auto pb-2 -mx-1">
                {flowSteps.map(({ step, title, locked }) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveFlowStep(step)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border',
                      activeFlowStep === step ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    {locked && <Lock className="size-3 inline mr-1 opacity-50" />}
                    {step}. {title}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                {activeFlowStep === 1 && renderStep1()}
                {activeFlowStep === 2 && renderStep2()}
                {activeFlowStep === 3 && renderStep3()}
              </div>
            </div>
          )}

          {topTab === 'market' && <div className="max-w-5xl mx-auto">{renderMarketTab()}</div>}

          {topTab === 'playbook' && <div className="max-w-4xl mx-auto">{renderPlaybookTab()}</div>}

          {topTab === 'extend' && renderExtendTab()}

          {topTab === 'model' && (
            <div className="max-w-3xl mx-auto">
      <ModelInsightPanel insight={insight} />
            </div>
          )}

          {topTab === 'chat' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <p className="text-sm text-muted-foreground">
                将真实指标、embedding 导出或内部 API 结果接在此对话；解析逻辑可在后续替换为你们的选品服务。
              </p>
              <FinderDataChat />
            </div>
          )}
        </main>
      </div>

      <ClusterGalleryModal
        open={clusterGalleryId !== null}
        cluster={galleryCluster}
        rec={galleryRec}
        onClose={closeClusterGallery}
      />
    </div>
  )
}

function ClassifyResultBanner({ result }: { result: ClassifyResult }) {
  const top = result.topClusters[0]
  if (!top) return null

  const tierColors: Record<string, string> = {
    S: 'bg-green-100 text-green-700 border-green-200',
    A: 'bg-blue-100 text-blue-700 border-blue-200',
    B: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">图片归簇结果</h3>
          {result.isNovelStyle && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-medium">
              新风格
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {result.topClusters.slice(0, 3).map((c, i) => (
          <div key={c.clusterId} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', tierColors[c.tier])}>
              {c.tier}
            </span>
            <span className="text-sm font-medium flex-1">{c.clusterName}</span>
            {c.clusterType === 'trend' && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium">
                趋势簇
              </span>
            )}
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(c.similarity * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(c.similarity * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClusterDetailCard({
  activeRec,
  structTopLabels = [],
  structOverlapLabels = [],
}: {
  activeRec: StyleCluster
  structTopLabels?: string[]
  structOverlapLabels?: string[]
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-stretch gap-4 mb-4 pb-4 border-b border-primary/15">
        <TierGradePill tier={activeRec.tier} className="shrink-0" />
        <div className="flex-1 min-w-[200px] space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">选品模型输出 · 销量潜力分级</p>
          <p className="text-sm font-semibold text-foreground">{tierLabel(activeRec.tier)}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            <strong className="text-foreground">GATv2</strong>（图关系 + 视觉/属性）与 <strong className="text-foreground">LightGBM</strong> 融合后的离散档；
            与下方 <strong className="text-foreground">P25–P75 日销带</strong>（簇内统计校准）一并阅读，不单独迷信档位或区间。
          </p>
          <p className="text-[11px] text-foreground">
            趋势分 <span className="font-mono font-bold tabular-nums">{activeRec.trendScore}</span>
            <span className="text-muted-foreground font-normal"> / 100（模型连续得分，与 S/A/B 同源特征）</span>
          </p>
        </div>
        <div className="relative w-20 h-28 rounded-lg overflow-hidden shrink-0 border border-border hidden sm:block">
          <Image src={activeRec.imageUrl} alt={activeRec.name} fill className="object-cover" sizes="80px" />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <TierBadge tier={activeRec.tier} />
            <span className="text-xs font-semibold">{activeRec.name}</span>
            {activeRec.trendReal && (
              <span className="flex items-center gap-0.5 text-[9px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full font-medium">
                <ShieldCheck className="size-2.5" />趋势过滤引擎验真
              </span>
            )}
          </div>
          <div className="space-y-0.5 mb-2">
            {activeRec.trendSignals.map((sig, i) => (
              <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                <span className="text-green-500 shrink-0">↑</span>{sig}
              </p>
            ))}
          </div>
          <div className="rounded-lg border border-violet-200/90 bg-violet-50/60 p-2.5 mb-2">
            <p className="text-[10px] font-semibold text-violet-950 mb-1">结构维度 Top（与「结构对齐」分数同源）</p>
            {structTopLabels.length ? (
              <div className="flex flex-wrap gap-1 mb-1">
                {structTopLabels.map((l) => (
                  <span
                    key={l}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-900 font-medium"
                  >
                    {l}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground mb-1">
                簇名/描述/竞品标题未命中 12 轴关键词；结构分多来自向量弱匹配或需补充中文描述。
              </p>
            )}
            {structOverlapLabels.length > 0 && (
              <p className="text-[10px] text-violet-900 leading-snug">
                与你的类目、风格词在同一轴上重合：
                <span className="font-semibold"> {structOverlapLabels.join(' · ')}</span>
              </p>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mb-1">模型备注</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {activeRec.designGenes.map((gene, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/15">{gene}</span>
            ))}
          </div>
          <div className="rounded-lg bg-card/80 border border-border/60 p-2 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-foreground">簇级日销区间（件/天）</span>
              <span
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                  activeRec.confidence === 'high' ? 'bg-green-100 text-green-800' :
                  activeRec.confidence === 'mid' ? 'bg-amber-100 text-amber-800' :
                  'bg-orange-100 text-orange-800',
                )}
              >
                置信{activeRec.confidence === 'high' ? '高' : activeRec.confidence === 'mid' ? '中' : '低'} · n={activeRec.clusterSampleSize}
              </span>
            </div>
            <p className="text-[11px] font-mono text-foreground">
              P25 <b>{activeRec.salesBand.p25}</b> · P50 <b>{activeRec.salesBand.p50}</b> · P75 <b>{activeRec.salesBand.p75}</b>
              <span className="text-muted-foreground font-sans text-[10px] ml-1">（同簇同价带观测）</span>
            </p>
            <p className="text-[10px] text-muted-foreground leading-snug">{activeRec.bandCaption}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-primary/20 text-[10px] text-amber-700 flex items-start gap-1">
        <span className="shrink-0">⚠️</span>
        <span><b>风险：</b>{activeRec.riskNote}</span>
      </div>
    </div>
  )
}

function TestPlanBlock({ activeRec }: { activeRec: StyleCluster }) {
  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-primary/10">
        <TierGradePill tier={activeRec.tier} className="scale-90 origin-left" />
        <div className="text-[11px] text-muted-foreground">
          测款节奏按 <strong className="text-foreground">{activeRec.tier}</strong> 档潜力校准；{tierLabel(activeRec.tier)}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1.5">SKU 角色</p>
        <ul className="space-y-1">
          {activeRec.testPlan.skuRoles.map((s, i) => (
            <li key={i} className="text-[11px] flex gap-2">
              <span className="shrink-0 font-medium text-foreground w-14">{s.role}</span>
              <span className="text-muted-foreground">{s.spec}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">观察节奏</p>
          <p>前 <b>{activeRec.testPlan.observePhase1Days}</b> 天：CTR / 加购</p>
          <p>至第 <b>{activeRec.testPlan.observePhase2Days}</b> 天：转化与 ROI</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">预算建议</p>
          <p className="text-muted-foreground leading-snug">{activeRec.testPlan.budgetHint}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1.5">止损 / 加码</p>
        <ul className="space-y-1">
          {activeRec.testPlan.stopRules.map((r, i) => (
            <li key={i} className="text-[11px] text-amber-900/90 flex gap-1.5">
              <span className="shrink-0">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
