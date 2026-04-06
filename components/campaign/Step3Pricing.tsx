'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useCampaignStore } from '@/lib/campaign-store'
import { MOCK_CAMPAIGN } from '@/lib/mock-campaign'
import ConvergenceChart from './ConvergenceChart'

const iterations = MOCK_CAMPAIGN.pricing!.iterations

export default function Step3Pricing() {
  const intent = useCampaignStore((s) => s.intent)
  const runPricing = useCampaignStore((s) => s.runPricing)
  const advanceStep = useCampaignStore((s) => s.advanceStep)

  const [visibleIterations, setVisibleIterations] = useState(0)
  const [converged, setConverged] = useState(false)
  const hasRunPricing = useRef(false)

  const targetMargin = intent?.targetMargin ?? 0.4
  const maxDiscount = intent?.maxDiscount ?? 0.7

  // Animate iterations one by one
  useEffect(() => {
    if (converged) return

    const timers: ReturnType<typeof setTimeout>[] = []

    iterations.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleIterations(i + 1)
      }, (i + 1) * 300)
      timers.push(timer)
    })

    // After all iterations shown, wait 500ms then converge
    const convergeTimer = setTimeout(() => {
      setConverged(true)
      if (!hasRunPricing.current) {
        hasRunPricing.current = true
        runPricing()
      }
    }, iterations.length * 300 + 500)
    timers.push(convergeTimer)

    return () => timers.forEach(clearTimeout)
  }, [converged, runPricing])

  const visibleData = iterations.slice(0, visibleIterations)

  return (
    <div className="space-y-6">
      {/* Phase A: Solving */}
      {!converged && (
        <div className="flex gap-6">
          {/* Left panel: iteration log */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-white font-semibold text-base flex items-center gap-2">
                <span>🧮</span> 约束优化求解
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                目标毛利 ≥ {(targetMargin * 100).toFixed(0)}%，折扣下限 {(maxDiscount * 10).toFixed(0)}折
              </p>
            </div>

            {/* Iteration rows */}
            <div className="space-y-1">
              {visibleData.map((iter, i) => {
                const isLast = i === iterations.length - 1 && visibleIterations === iterations.length
                return (
                  <div
                    key={iter.round}
                    className={`text-xs font-mono ${isLast ? 'text-green-400' : 'text-gray-400'}`}
                  >
                    迭代 {iter.round} → price=¥{iter.price}, 毛利 {(iter.margin * 100).toFixed(0)}%, 日销 {iter.dailySales}件, GMV ¥{iter.gmv}
                    {isLast && ' ← 收敛 ✓'}
                  </div>
                )
              })}
            </div>

            {/* Execution line */}
            <div className="text-xs font-mono text-green-400/70">
              ▶ 执行 策略方案生成(target_margin={targetMargin}, max_change={maxDiscount})
            </div>
          </div>

          {/* Right panel: chart */}
          <div className="w-[400px] shrink-0">
            <ConvergenceChart
              iterations={iterations}
              targetMargin={targetMargin}
              animatedCount={visibleIterations}
            />
          </div>
        </div>
      )}

      {/* Phase B: Results */}
      {converged && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Three-tier pricing cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Daily price */}
            <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a35]">
              <div className="text-gray-400 text-sm mb-1">日常价</div>
              <div className="text-2xl font-bold text-white">¥169</div>
              <div className="text-xs text-gray-500 mt-1">维持日常</div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-400">毛利 52%</div>
                <div className="text-xs text-gray-400">预计日销 14件</div>
              </div>
            </div>

            {/* Promo price (recommended) */}
            <div className="relative bg-[#1a1a24] rounded-xl p-5 border border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <span className="absolute top-3 right-3 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                推荐
              </span>
              <div className="text-gray-400 text-sm mb-1">大促价</div>
              <div className="text-2xl font-bold text-white">¥139</div>
              <div className="text-xs text-indigo-300 mt-1">推荐方案</div>
              <div className="text-xs text-gray-500 mt-0.5">8.2折</div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-400">毛利 40%</div>
                <div className="text-xs text-gray-400">预计日销 28件</div>
              </div>
            </div>

            {/* Floor price */}
            <div className="bg-[#1a1a24] rounded-xl p-5 border border-red-500/30">
              <div className="text-gray-400 text-sm mb-1">极限底价</div>
              <div className="text-2xl font-bold text-white">¥119</div>
              <div className="text-xs text-gray-500 mt-1">极限底线</div>
              <div className="text-xs text-gray-500 mt-0.5">7.0折</div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-400">毛利 29%</div>
                <div className="text-xs text-gray-400">预计日销 38件</div>
              </div>
              <div className="text-red-400 text-xs mt-2">仅限极端清仓使用</div>
            </div>
          </div>

          {/* Profit scenarios */}
          <div className="grid grid-cols-3 gap-4">
            {/* P10 Conservative */}
            <div className="bg-[#1a1a24] rounded-lg p-4 border-l-4 border-l-red-500">
              <div className="text-white font-bold text-sm">P10 保守</div>
              <div className="text-gray-400 text-xs mt-2">日销 18件</div>
              <div className="text-white text-lg font-semibold mt-1">¥12,960</div>
              <div className="text-gray-500 text-xs mt-1">日均18件，毛利率40%，持续10天</div>
            </div>

            {/* P50 Baseline */}
            <div className="bg-[#1a1a24] rounded-lg p-4 border-l-4 border-l-blue-500">
              <div className="text-white font-bold text-sm">P50 基准</div>
              <div className="text-gray-400 text-xs mt-2">日销 28件</div>
              <div className="text-white text-lg font-semibold mt-1">¥20,160</div>
              <div className="text-gray-500 text-xs mt-1">日均28件，毛利率40%，持续10天</div>
            </div>

            {/* P90 Optimistic */}
            <div className="bg-[#1a1a24] rounded-lg p-4 border-l-4 border-l-green-500">
              <div className="text-white font-bold text-sm">P90 乐观</div>
              <div className="text-gray-400 text-xs mt-2">日销 40件</div>
              <div className="text-white text-lg font-semibold mt-1">¥28,800</div>
              <div className="text-gray-500 text-xs mt-1">日均40件，叠加会场流量，毛利率40%</div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => advanceStep()}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-8 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              确认定价方案 → 进入风控审核
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
