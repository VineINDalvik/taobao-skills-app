'use client'

import { useState, useMemo } from 'react'
import { useCampaignStore } from '@/lib/campaign-store'
import { MOCK_CAMPAIGN } from '@/lib/mock-campaign'
import type { RiskCheck } from '@/lib/campaign-types'

const COST_PRICE = 83
const BASE_SALES = 28
const BETA = -1.8

const TYPE_STYLES: Record<
  RiskCheck['type'],
  { label: string; bg: string; text: string; border: string }
> = {
  pass: {
    label: '通过',
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  warn: {
    label: '预警',
    bg: 'bg-amber-900/30',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  block: {
    label: '拦截',
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
}

export default function Step4RiskReview() {
  const promoPrice = useCampaignStore((s) => s.pricing?.promoPrice) ?? 139
  const confirmRiskReview = useCampaignStore((s) => s.confirmRiskReview)

  const mockChecks = MOCK_CAMPAIGN.riskReview!.checks

  // Local state: track resolved status per check index
  const [resolved, setResolved] = useState<boolean[]>(
    () => mockChecks.map((c) => c.resolved),
  )

  // Local state: track which pass items are expanded
  const [expandedPass, setExpandedPass] = useState<Set<number>>(new Set())

  // Price adjustment
  const [adjustedPrice, setAdjustedPrice] = useState<number>(promoPrice)

  // Counts
  const counts = useMemo(() => {
    const c = { pass: 0, warn: 0, block: 0 }
    for (const check of mockChecks) {
      c[check.type]++
    }
    return c
  }, [mockChecks])

  // Check if any block items are unresolved
  const hasUnresolvedBlocks = mockChecks.some(
    (check, i) => check.type === 'block' && !resolved[i],
  )

  // Real-time calculations
  const margin = (adjustedPrice - COST_PRICE) / adjustedPrice
  const predictedSales =
    BASE_SALES * (1 + BETA * ((adjustedPrice - promoPrice) / promoPrice))

  function handleResolve(index: number) {
    setResolved((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })
  }

  function handleConfirm() {
    if (hasUnresolvedBlocks) return
    const priceChanged = adjustedPrice !== promoPrice
    confirmRiskReview(priceChanged ? adjustedPrice : undefined)
  }

  return (
    <div className="space-y-6">
      {/* --- Risk summary bar --- */}
      <div className="flex items-center gap-3">
        {(['pass', 'warn', 'block'] as const).map((type) => {
          const s = TYPE_STYLES[type]
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${s.bg} ${s.text} ${s.border}`}
            >
              {s.label} {counts[type]}
            </span>
          )
        })}
      </div>

      {/* --- Check items list --- */}
      <div className="space-y-2">
        {mockChecks.map((check, i) => {
          const style = TYPE_STYLES[check.type]
          const isPass = check.type === 'pass'
          const isExpanded = expandedPass.has(i)
          const isResolved = resolved[i]

          return (
            <div
              key={i}
              className={`rounded-xl border border-[#2a2a35] bg-[#1a1a24] p-4 ${
                isPass && !isExpanded ? 'opacity-60' : ''
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isPass ? 'cursor-pointer' : ''
                }`}
                onClick={isPass ? () => {
                  setExpandedPass((prev) => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })
                } : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Type badge */}
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
                  >
                    {style.label}
                  </span>
                  {/* Label + detail */}
                  <div className="min-w-0">
                    <span className="font-medium text-[#e0e0e0]">
                      {check.label}
                    </span>
                    {(!isPass || isExpanded) && (
                      <p className="mt-0.5 text-sm text-gray-400 truncate">
                        {check.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: action buttons or resolved badge */}
                <div className="shrink-0 ml-4">
                  {isPass ? (
                    <span className="text-xs text-gray-500">
                      {isExpanded ? '收起' : '展开'}
                    </span>
                  ) : isResolved ? (
                    <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs text-gray-400 border border-gray-600/30">
                      已处理
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(i)
                        }}
                        className="rounded-lg border border-green-500/40 px-2.5 py-1 text-xs text-green-400 hover:bg-green-900/20 transition-colors"
                      >
                        采纳建议
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(i)
                        }}
                        className="rounded-lg border border-gray-600/40 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700/30 transition-colors"
                      >
                        忽略
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* --- Price adjustment area --- */}
      <div className="rounded-xl border border-[#2a2a35] bg-[#1a1a24] p-5 space-y-4">
        {/* Recommended price */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-gray-400">推荐大促价</span>
          <span className="text-2xl font-bold text-white">
            ¥{promoPrice}
          </span>
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">手动调整价格</label>
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              ¥
            </span>
            <input
              type="number"
              value={adjustedPrice}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (!isNaN(v) && v >= 0) setAdjustedPrice(v)
              }}
              className="w-full rounded-lg border border-[#2a2a35] bg-[#1e1e28] py-2 pl-8 pr-3 text-white outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Real-time metrics */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a35] bg-[#1e1e28] px-3 py-1.5 text-sm">
            <span className="text-gray-400">调整后毛利率</span>
            <span
              className={`font-medium ${
                margin >= 0.35
                  ? 'text-green-400'
                  : margin >= 0.2
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {(margin * 100).toFixed(1)}%
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a35] bg-[#1e1e28] px-3 py-1.5 text-sm">
            <span className="text-gray-400">预计日销</span>
            <span className="font-medium text-white">
              {predictedSales.toFixed(1)} 件
            </span>
          </span>
        </div>
      </div>

      {/* --- Confirm button --- */}
      <div className="relative inline-block">
        <button
          onClick={handleConfirm}
          disabled={hasUnresolvedBlocks}
          className={`rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 text-white font-medium transition-opacity ${
            hasUnresolvedBlocks
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:opacity-90'
          }`}
          title={hasUnresolvedBlocks ? '请先处理拦截项' : undefined}
        >
          确认定价方案 → 生成素材
        </button>
      </div>
    </div>
  )
}
