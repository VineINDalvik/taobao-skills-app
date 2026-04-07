'use client'

import { useEffect } from 'react'
import { useCampaignStore } from '@/lib/campaign-store'
import PhonePreview from './PhonePreview'

/* ── Asset type metadata ─────────────────────── */
const TYPE_META: Record<
  string,
  { label: string; dotColor: string; emoji: string; gradientFrom: string; gradientTo: string }
> = {
  main_image: {
    label: '活动主图',
    dotColor: 'bg-pink-500',
    emoji: '🖼️',
    gradientFrom: 'from-pink-500/30',
    gradientTo: 'to-pink-300/10',
  },
  coupon_overlay: {
    label: '优惠券贴片',
    dotColor: 'bg-amber-500',
    emoji: '🎟️',
    gradientFrom: 'from-amber-500/30',
    gradientTo: 'to-amber-300/10',
  },
  detail_header: {
    label: '详情页头图',
    dotColor: 'bg-green-500',
    emoji: '📐',
    gradientFrom: 'from-green-500/30',
    gradientTo: 'to-green-300/10',
  },
  promo_badge: {
    label: '促销角标',
    dotColor: 'bg-red-500',
    emoji: '🔖',
    gradientFrom: 'from-red-500/30',
    gradientTo: 'to-red-300/10',
  },
  video_cover: {
    label: '短视频封面',
    dotColor: 'bg-blue-500',
    emoji: '🎬',
    gradientFrom: 'from-blue-500/30',
    gradientTo: 'to-blue-300/10',
  },
}

/* ── Sub-stepper steps ─────────────────────── */
const SUB_STEPS = ['解析方案', '确认素材', '生成中', '预览确认'] as const

export default function Step5Assets() {
  const assets = useCampaignStore((s) => s.assets)
  const generateAssets = useCampaignStore((s) => s.generateAssets)
  const pricing = useCampaignStore((s) => s.pricing)
  const riskReview = useCampaignStore((s) => s.riskReview)
  const taskName = useCampaignStore((s) => s.taskName)

  /* Kick off generation on mount */
  useEffect(() => {
    if (!assets) {
      generateAssets()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const items = assets?.items ?? []
  const doneCount = items.filter((a) => a.status === 'done').length
  const allDone = items.length > 0 && doneCount === items.length

  /* Determine sub-stepper active index */
  const subStepIndex = !assets
    ? 0
    : allDone
      ? 3
      : items.some((a) => a.status === 'generating')
        ? 2
        : 1

  /* Price calculation */
  const confirmedPrice = riskReview?.adjustedPrice ?? pricing?.promoPrice ?? 139
  const dailyPrice = pricing?.dailyPrice ?? 169
  const discountRatio = dailyPrice > 0 ? confirmedPrice / dailyPrice : 1
  const discount = `${(discountRatio * 10).toFixed(1)}折`

  return (
    <div className="flex rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* ── Left side ── */}
      <div className="flex-1 p-6 space-y-5">
        {/* Sub-stepper */}
        <div className="flex items-center gap-0">
          {SUB_STEPS.map((label, i) => {
            const isDone = i < subStepIndex
            const isActive = i === subStepIndex
            const isPending = i > subStepIndex
            return (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-10 h-px ${isDone ? 'bg-green-500' : 'bg-border'}`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isDone
                        ? 'bg-green-500'
                        : isActive
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-muted-foreground/30'
                    }`}
                  />
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      isDone
                        ? 'text-green-400'
                        : isActive
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="text-sm text-foreground/80">
            {allDone ? (
              '素材生成完成'
            ) : (
              <>
                正在生成素材…{' '}
                <span className="text-muted-foreground">
                  已完成 {doneCount}/{items.length || 5} 张
                </span>
              </>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Asset card list */}
        <div className="space-y-2">
          {items.map((item) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.main_image
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border"
              >
                {/* Thumbnail */}
                <div className="w-[52px] h-[52px] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.status === 'pending' && (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      …
                    </div>
                  )}
                  {item.status === 'generating' && (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground animate-spin inline-block">⟳</span>
                    </div>
                  )}
                  {item.status === 'done' && (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo} flex items-center justify-center text-xl`}
                    >
                      {meta.emoji}
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="w-full h-full bg-red-900/30 flex items-center justify-center text-red-400 text-xs">
                      ✕
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                  <div className="text-sm text-foreground/90 truncate">{item.label}</div>
                </div>

                {/* Right: score + regenerate */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === 'done' && item.score != null && (
                    <span className="bg-green-900/30 text-green-400 text-xs rounded-full px-2 py-0.5">
                      {item.score}分
                    </span>
                  )}
                  {item.status === 'done' && (
                    <button className="text-muted-foreground hover:text-foreground text-sm" title="重新生成">
                      🔄
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Success bar */}
        {allDone && (
          <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-3">
            <span className="text-green-400">✓</span>
            <span className="text-sm text-green-400 flex-1">
              全部生成完成 — {doneCount}/{items.length} 张素材成功
            </span>
          </div>
        )}
      </div>

      {/* ── Right side ── */}
      <div className="w-[320px] p-6 border-l border-border flex flex-col items-center">
        <div className="text-sm text-muted-foreground mb-3 self-start">📱 淘宝商品页预览</div>
        <PhonePreview
          price={confirmedPrice}
          originalPrice={dailyPrice}
          discount={discount}
          productName={taskName || '法式碎花V领连衣裙 轻奢气质'}
          doneAssetCount={doneCount}
        />
        <div className="text-xs text-muted-foreground mt-3">
          已填充 {doneCount}/{items.length || 5} 个素材位
        </div>
      </div>
    </div>
  )
}
