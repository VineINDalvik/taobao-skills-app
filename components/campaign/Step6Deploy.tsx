'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaignStore } from '@/lib/campaign-store'
import { MOCK_CAMPAIGN } from '@/lib/mock-campaign'

/* ── Event type display labels ─────────────── */
const EVENT_LABELS: Record<string, string> = {
  '618': '618大促',
  double11: '双11',
  daily: '日常促销',
  clearance: '清仓特卖',
  custom: '自定义活动',
}

export default function Step6Deploy() {
  const router = useRouter()

  const taskName = useCampaignStore((s) => s.taskName)
  const intent = useCampaignStore((s) => s.intent)
  const pricing = useCampaignStore((s) => s.pricing)
  const riskReview = useCampaignStore((s) => s.riskReview)
  const assets = useCampaignStore((s) => s.assets)
  const deployCampaign = useCampaignStore((s) => s.deployCampaign)

  /* Local state for checklist toggles */
  const [checklist, setChecklist] = useState(
    () => MOCK_CAMPAIGN.deployment!.checklist.map((item) => ({ ...item }))
  )

  /* Local state for save button */
  const [saved, setSaved] = useState(false)

  /* ── Derived values ─────────────────────────── */
  const confirmedPrice = riskReview?.adjustedPrice ?? pricing?.promoPrice ?? 0
  const dailyPrice = pricing?.dailyPrice ?? 0
  const discount = dailyPrice > 0
    ? Math.round((confirmedPrice / dailyPrice) * 100)
    : 0
  const margin = intent?.targetMargin
    ? `${(intent.targetMargin * 100).toFixed(0)}%`
    : '--'

  const doneAssetCount = assets?.items.filter((a) => a.status === 'done').length ?? 0

  const riskChecks = riskReview?.checks ?? []
  const allPassed = riskChecks.length > 0 && riskChecks.every((c) => c.type === 'pass' || c.resolved)
  const unresolvedCount = riskChecks.filter((c) => c.type !== 'pass' && !c.resolved).length

  /* ── Handlers ───────────────────────────────── */
  function handleSave() {
    deployCampaign()
    setSaved(true)
  }

  function handleToggleChecklist(index: number) {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    )
  }

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── 1. Decision summary card ───────────── */}
      <div className="bg-[#1a1a24] rounded-xl p-6 border border-green-500/30">
        <span className="inline-block text-green-400 text-sm font-medium mb-4">
          {'✅ 活动方案已就绪'}
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <SummaryCell label="活动类型" value={EVENT_LABELS[intent?.eventType ?? ''] ?? '--'} />
          <SummaryCell label="商品" value={taskName || '--'} />
          <SummaryCell
            label="定价方案"
            value={
              dailyPrice > 0
                ? `日常价 ¥${dailyPrice} → 大促价 ¥${confirmedPrice}`
                : '--'
            }
            sub={dailyPrice > 0 ? `${discount}折 · 目标毛利 ${margin}` : undefined}
          />
          <SummaryCell label="素材" value={`${doneAssetCount}张已生成`} />
          <SummaryCell
            label="风控"
            value={allPassed ? '全部通过' : `${unresolvedCount}项待处理`}
          />
        </div>
      </div>

      {/* ── 2. Execution checklist (timeline) ──── */}
      <div className="bg-[#1a1a24] rounded-xl p-6 border border-[#2a2a35]">
        <h3 className="text-sm font-medium text-white mb-4">执行清单</h3>
        <div className="relative ml-1.5">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-[#2a2a35]" />

          <div className="space-y-5">
            {checklist.map((item, i) => (
              <div key={i} className="relative flex items-start gap-3 pl-6">
                {/* Dot on the line */}
                <div
                  className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 ${
                    item.done
                      ? 'bg-green-500 border-green-500'
                      : 'bg-[#1a1a24] border-[#2a2a35]'
                  }`}
                />

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggleChecklist(i)}
                  className="mt-0.5 h-4 w-4 rounded border-[#2a2a35] bg-[#12121a] text-green-500 focus:ring-green-500/30 shrink-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {item.action}
                  </p>
                  <span className="text-xs text-gray-500">{item.scheduledDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Action buttons ─────────────────── */}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saved}
          className={`py-3 px-6 rounded-xl font-medium text-sm transition-colors ${
            saved
              ? 'bg-green-900/40 text-green-400 cursor-default'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
          }`}
        >
          {saved ? '✓ 已保存' : '保存至商品库'}
        </button>

        <button
          onClick={() => alert('功能开发中')}
          className="py-3 px-6 rounded-xl text-sm font-medium border border-[#2a2a35] text-gray-400 hover:text-gray-300 hover:border-gray-600 transition-colors"
        >
          下载素材包
        </button>

        <button
          onClick={() => router.push('/')}
          className="py-3 px-6 rounded-xl text-sm font-medium border border-[#2a2a35] text-gray-400 hover:text-gray-300 hover:border-gray-600 transition-colors"
        >
          分析下一个商品
        </button>
      </div>
    </div>
  )
}

/* ── Sub-component ────────────────────────────── */
function SummaryCell({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-white text-sm">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
