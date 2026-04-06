'use client'

import { useRouter } from 'next/navigation'
import { usePipelineStore, SKILLS_META } from '@/lib/store'
import { CheckCircle2, Circle, Clock, TrendingUp, TrendingDown, ArrowRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductRecord, OptimizationEvent } from '@/lib/types'

const METRIC_LABELS: Record<string, string> = {
  ctr: 'CTR', cvr: 'CVR', dailySales: '日销', positiveRate: '好评率', roi: 'ROI'
}

function healthColor(score: number) {
  if (score >= 75) return 'text-green-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-red-600'
}

function healthBg(score: number) {
  if (score >= 75) return 'bg-green-500'
  if (score >= 55) return 'bg-amber-500'
  return 'bg-red-500'
}

function EventRow({ event }: { event: OptimizationEvent }) {
  const skill = SKILLS_META.find(s => s.id === event.skillId)
  const dateStr = new Date(event.changedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {/* Icon */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-sm',
          event.status === 'measured' ? 'bg-green-100' : event.status === 'rolled_back' ? 'bg-red-100' : 'bg-muted'
        )}>
          {skill?.icon ?? '⚙️'}
        </div>
        <span className="text-[9px] text-muted-foreground">{dateStr}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{event.summary}</p>
        {event.impact && (
          <p className="text-[11px] text-green-600 mt-0.5 flex items-center gap-1">
            <TrendingUp className="size-3 shrink-0" />
            {event.impact}
          </p>
        )}
        {event.nextAction && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <ArrowRight className="size-3 shrink-0" />
            {event.nextAction}
          </p>
        )}
        {event.status === 'pending' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
            <Clock className="size-2.5" />
            等待数据验证
          </span>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">
        {event.status === 'measured' ? (
          <CheckCircle2 className="size-4 text-green-500" />
        ) : event.status === 'pending' ? (
          <Clock className="size-4 text-amber-500" />
        ) : (
          <div className="size-4 rounded-full bg-red-200" />
        )}
      </div>
    </div>
  )
}

function ProductCard({ product, onOpen }: { product: ProductRecord; onOpen: () => void }) {
  const lastEvent = product.changeLog[product.changeLog.length - 1]
  const pendingCount = product.changeLog.filter(e => e.status === 'pending').length

  return (
    <div
      className="rounded-xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{product.name}</h3>
            {pendingCount > 0 && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">
                {pendingCount} 项待验证
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{product.category} · ¥{product.priceRange}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(product.createdAt).toLocaleDateString('zh-CN')} 创建
          </p>
        </div>
        {/* Health score ring */}
        <div className="shrink-0 text-center">
          <div className={cn('text-2xl font-bold tabular-nums', healthColor(product.healthScore))}>
            {product.healthScore}
          </div>
          <p className="text-[9px] text-muted-foreground">健康分</p>
        </div>
      </div>

      {/* Skills progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5">
          {SKILLS_META.map((skill) => {
            const done = product.completedSkills.includes(skill.id)
            return (
              <div key={skill.id} title={skill.label}
                className={cn(
                  'flex-1 h-1.5 rounded-full',
                  done ? healthBg(product.healthScore) : 'bg-muted'
                )}
              />
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {product.completedSkills.length}/6 个 Skill 已完成
        </p>
      </div>

      {/* Metrics */}
      {Object.keys(product.currentMetrics).length > 0 && (
        <div className="border-t border-border px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(product.currentMetrics).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{METRIC_LABELS[k] ?? k}</span>
              <span className="text-[10px] font-semibold">
                {k === 'ctr' || k === 'cvr' ? `${v}%` : k === 'positiveRate' ? `${((v as number)*100).toFixed(0)}%` : v}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Latest event */}
      {lastEvent && (
        <div className="border-t border-border px-4 py-2.5 bg-muted/30 flex items-center gap-2">
          <span className="text-sm">{SKILLS_META.find(s => s.id === lastEvent.skillId)?.icon}</span>
          <p className="text-[11px] text-muted-foreground truncate flex-1">{lastEvent.summary}</p>
          {lastEvent.status === 'pending' && (
            <span className="shrink-0 text-[9px] text-amber-600 font-medium">验证中</span>
          )}
          {lastEvent.status === 'measured' && lastEvent.impact && (
            <span className="shrink-0 text-[9px] text-green-600 font-medium">已验证</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const { products, loadSession } = usePipelineStore()

  const handleOpen = (product: ProductRecord) => {
    loadSession(product)
    const lastSkillId = Math.max(...product.completedSkills, 0)
    const lastSkill = SKILLS_META.find(s => s.id === lastSkillId)
    const slug = lastSkill?.slug ?? 'finder'
    router.push(`/skills/${slug}`)
  }

  const totalGain = products.reduce((s, p) => {
    const roi = p.currentMetrics.roi ?? 0
    const prev = 1.8 // baseline
    return s + Math.max(0, roi - prev) * 200
  }, 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">商品管理看板</h1>
          <p className="text-sm text-muted-foreground">追踪每个商品的优化进度与效果数据</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          新建商品分析
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">已分析商品</p>
          <p className="text-2xl font-semibold">{products.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">全流程完成</p>
          <p className="text-2xl font-semibold">{products.filter(p => p.completedSkills.length === 6).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">待验证优化</p>
          <p className="text-2xl font-semibold text-amber-600">
            {products.reduce((s, p) => s + p.changeLog.filter(e => e.status === 'pending').length, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">优化后 ROI 均值</p>
          <p className="text-2xl font-semibold text-green-600">
            {(products.filter(p => p.currentMetrics.roi).reduce((s, p) => s + (p.currentMetrics.roi ?? 0), 0) /
              Math.max(products.filter(p => p.currentMetrics.roi).length, 1)).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">还没有分析过任何商品</p>
          <button onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="size-4" />
            开始第一个商品分析
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={() => handleOpen(product)} />
          ))}
        </div>
      )}

      {/* Optimization timeline for first product */}
      {products.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4">
            优化时间线 — {products[0].name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">（{products[0].changeLog.length} 次优化记录）</span>
          </h2>
          <div className="rounded-xl border border-border bg-card px-4">
            {products[0].changeLog.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">当前瓶颈</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                主图 v2 效果待验证（2026-04-12 可见数据）
              </p>
            </div>
            <button
              onClick={() => router.push('/skills/listing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              打开 Skill 2 优化主图
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
