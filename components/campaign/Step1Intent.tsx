'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePipelineStore } from '@/lib/store'
import { useCampaignStore } from '@/lib/campaign-store'
import type { CampaignIntent } from '@/lib/campaign-types'

/* ------------------------------------------------------------------ */
/*  Preset defaults per event type                                     */
/* ------------------------------------------------------------------ */
const EVENT_PRESETS: Record<
  CampaignIntent['eventType'],
  { label: string; margin: number; discount: number }
> = {
  '618':       { label: '618大促',   margin: 40, discount: 70 },
  double11:    { label: '双11',      margin: 35, discount: 65 },
  daily:       { label: '日常打折',  margin: 50, discount: 85 },
  clearance:   { label: '清仓',      margin: 15, discount: 50 },
  custom:      { label: '自定义',    margin: 40, discount: 75 },
}

const EVENT_TYPES = Object.keys(EVENT_PRESETS) as CampaignIntent['eventType'][]

/* ------------------------------------------------------------------ */
/*  Styled range track helper                                          */
/* ------------------------------------------------------------------ */
function trackStyle(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100
  return {
    background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(168 85 247) ${pct}%, #2a2a35 ${pct}%)`,
  }
}

/* ================================================================== */
/*  Step1Intent                                                        */
/* ================================================================== */
export default function Step1Intent() {
  /* ---- pipeline store (read-only context) ---- */
  const productInput   = usePipelineStore((s) => s.productInput)
  const selectedStyle  = usePipelineStore((s) => s.selectedStyle)
  const skill3         = usePipelineStore((s) => s.skill3)
  const skillTesting   = usePipelineStore((s) => s.skillTesting)

  /* ---- campaign store ---- */
  const setCampaignIntent = useCampaignStore((s) => s.setCampaignIntent)

  /* ---- local form state ---- */
  const [eventType, setEventType] = useState<CampaignIntent['eventType']>('618')
  const [margin, setMargin]       = useState(40)
  const [discount, setDiscount]   = useState(70)
  const [salesTarget, setSalesTarget]       = useState(200)
  const [inventoryLimit, setInventoryLimit] = useState<number | ''>('')

  /* ---- derived values ---- */
  const dailyPrice     = skill3?.priceSchedule?.dailyPrice
  const costPrice      = skillTesting?.input?.costPrice
  const elasticity     = skill3?.elasticityBeta
  const competitorAvg  = skill3?.competitorRange?.avg
  const productName    = selectedStyle?.name ?? productInput.category ?? '未选择商品'
  const hasSkill3      = !!skill3

  /* auto inventory days from store (dataProfile fallback) */
  const autoInventoryDays = useCampaignStore((s) => s.dataProfile?.inventoryDays)

  /* ---- handlers ---- */
  const selectEvent = useCallback(
    (type: CampaignIntent['eventType']) => {
      setEventType(type)
      if (type !== 'custom') {
        setMargin(EVENT_PRESETS[type].margin)
        setDiscount(EVENT_PRESETS[type].discount)
      }
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    const intent: CampaignIntent = {
      eventType,
      targetMargin: margin / 100,
      maxDiscount: discount / 100,
      salesTarget,
      inventoryLimit:
        typeof inventoryLimit === 'number' ? inventoryLimit : (autoInventoryDays ?? 30),
    }
    setCampaignIntent(intent)
  }, [eventType, margin, discount, salesTarget, inventoryLimit, autoInventoryDays, setCampaignIntent])

  /* ================================================================ */
  return (
    <div className="space-y-5">
      {/* ---------- 1. Event type chips ---------- */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((type) => {
          const selected = type === eventType
          return (
            <button
              key={type}
              onClick={() => selectEvent(type)}
              className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${
                selected
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                  : 'bg-[#1e1e28] border-[#2a2a35] text-gray-400 hover:border-gray-500'
              }`}
            >
              {EVENT_PRESETS[type].label}
            </button>
          )
        })}
      </div>

      {/* ---------- 2. Product context card ---------- */}
      <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <span>👗</span>
          <span>{productName}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {dailyPrice != null && (
            <span className="bg-[#1e1e28] border border-[#2a2a35] rounded-md px-2 py-1 text-gray-300">
              日常价 ¥{dailyPrice}
            </span>
          )}
          {costPrice != null && (
            <span className="bg-[#1e1e28] border border-[#2a2a35] rounded-md px-2 py-1 text-gray-300">
              成本 ¥{costPrice}
            </span>
          )}
          {elasticity != null && (
            <span className="bg-[#1e1e28] border border-[#2a2a35] rounded-md px-2 py-1 text-gray-300">
              弹性β {elasticity.toFixed(2)}
            </span>
          )}
          {competitorAvg != null && (
            <span className="bg-[#1e1e28] border border-[#2a2a35] rounded-md px-2 py-1 text-gray-300">
              竞品均价 ¥{competitorAvg}
            </span>
          )}
        </div>

        {hasSkill3 ? (
          <span className="inline-block text-xs bg-green-900/40 text-green-400 border border-green-800 rounded-md px-2 py-1">
            已融合 Skill 1~5 数据 ✓
          </span>
        ) : (
          <span className="inline-block text-xs bg-amber-900/40 text-amber-400 border border-amber-800 rounded-md px-2 py-1">
            日常价未设定 — 将使用竞品均价参考
          </span>
        )}
      </div>

      {/* ---------- 3. Constraint sliders ---------- */}
      <div className="space-y-4">
        {/* Margin slider */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400 whitespace-nowrap w-24">目标毛利率</label>
          <input
            type="range"
            min={15}
            max={70}
            step={1}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="flex-1 appearance-none h-2 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            style={trackStyle(margin, 15, 70)}
          />
          <span className="text-xl font-semibold text-white w-16 text-right">{margin}%</span>
        </div>

        {/* Discount slider */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400 whitespace-nowrap w-24">最大折扣力度</label>
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="flex-1 appearance-none h-2 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            style={trackStyle(discount, 50, 95)}
          />
          <span className="text-xl font-semibold text-white w-16 text-right">
            {(discount / 10).toFixed(1)}折
          </span>
        </div>
      </div>

      {/* ---------- 4. Supplementary row ---------- */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">库存约束</label>
          {autoInventoryDays != null ? (
            <div className="bg-[#1e1e28] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-sm">
              约 {autoInventoryDays} 天
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inventoryLimit === '' ? '' : inventoryLimit}
                onChange={(e) =>
                  setInventoryLimit(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="30"
                className="w-full bg-[#1e1e28] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-500">天</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">销量目标</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={salesTarget}
              onChange={(e) => setSalesTarget(Number(e.target.value))}
              className="w-full bg-[#1e1e28] border border-[#2a2a35] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-gray-500">件</span>
          </div>
        </div>
      </div>

      {/* ---------- 5. CTA ---------- */}
      <button
        onClick={handleSubmit}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-medium py-3 px-8 rounded-xl text-base transition-colors"
      >
        🚀 启动 AI 智能定价
      </button>
    </div>
  )
}
