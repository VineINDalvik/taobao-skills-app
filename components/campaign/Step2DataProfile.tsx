'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { useCampaignStore } from '@/lib/campaign-store'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DATA_SOURCES = [
  '近期销售',
  '竞品价格',
  '库存库龄',
  '历史促销',
  '价格弹性',
] as const

const SOURCE_INTERVAL = 500 // ms between each source lighting up

const MAE_EPOCHS = [
  { epoch: 1, mae: 2.1 },
  { epoch: 2, mae: 1.9 },
  { epoch: 3, mae: 1.7 },
  { epoch: 4, mae: 1.55 },
  { epoch: 5, mae: 1.45 },
  { epoch: 6, mae: 1.4 },
]

/* ------------------------------------------------------------------ */
/*  Helper: inventory health                                           */
/* ------------------------------------------------------------------ */
function inventoryHealth(days: number) {
  if (days < 30) return { color: 'text-green-400', bg: 'bg-green-500', label: '健康' }
  if (days <= 60) return { color: 'text-yellow-400', bg: 'bg-yellow-500', label: '偏高' }
  return { color: 'text-red-400', bg: 'bg-red-500', label: '危险' }
}

/* ================================================================== */
/*  Step2DataProfile                                                    */
/* ================================================================== */
export default function Step2DataProfile() {
  const runDataProfile = useCampaignStore((s) => s.runDataProfile)
  const appendLog = useCampaignStore((s) => s.appendLog)
  const dataProfile = useCampaignStore((s) => s.dataProfile)

  /* ---- Animation state ---- */
  const [loadedSources, setLoadedSources] = useState<boolean[]>(
    Array(DATA_SOURCES.length).fill(false),
  )
  const [allSourcesLoaded, setAllSourcesLoaded] = useState(false)
  const [modelFitting, setModelFitting] = useState(true)
  const [profileDone, setProfileDone] = useState(false)

  const hasRun = useRef(false)

  /* ---- Kick off on mount ---- */
  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // 1. Start store-level data profile (handles logs + step advancement)
    runDataProfile()

    // 2. Component-level source tag animation
    const logMessages = [
      '正在拉取近期销售数据...',
      '竞品价格分析完成',
      '库存库龄数据加载中...',
      '历史促销数据获取完成',
      '弹性估计 DID 模型训练中...',
    ]

    DATA_SOURCES.forEach((_, i) => {
      setTimeout(() => {
        appendLog({
          timestamp: new Date().toISOString(),
          tag: 'data',
          level: 'info',
          message: logMessages[i],
        })
        setLoadedSources((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, (i + 1) * SOURCE_INTERVAL)
    })

    // 3. After all sources lit: show grid
    const allDoneDelay = (DATA_SOURCES.length + 1) * SOURCE_INTERVAL
    setTimeout(() => {
      setAllSourcesLoaded(true)
    }, allDoneDelay)

    // 4. Model fitting ends shortly after
    setTimeout(() => {
      setModelFitting(false)
    }, allDoneDelay + 800)

    // 5. Show completion message
    setTimeout(() => {
      setProfileDone(true)
      appendLog({
        timestamp: new Date().toISOString(),
        tag: 'data',
        level: 'success',
        message: '数据画像加载完成',
      })
    }, allDoneDelay + 1200)
  }, [runDataProfile, appendLog])

  /* ---- Derived values from dataProfile ---- */
  const recentSales = dataProfile?.recentSales ?? []
  const last7 = recentSales.slice(-7)
  const avgQty7d = last7.length > 0
    ? last7.reduce((sum, d) => sum + d.qty, 0) / last7.length
    : 0
  const prev7 = recentSales.slice(-14, -7)
  const avgQtyPrev7d = prev7.length > 0
    ? prev7.reduce((sum, d) => sum + d.qty, 0) / prev7.length
    : 0
  const salesTrendUp = avgQty7d >= avgQtyPrev7d

  const competitors = dataProfile?.competitorPrices ?? []
  const minPrice = competitors.length > 0
    ? Math.min(...competitors.map((c) => c.price))
    : 0
  const maxPrice = competitors.length > 0
    ? Math.max(...competitors.map((c) => c.price))
    : 0

  const inventoryDays = dataProfile?.inventoryDays ?? 0
  const health = inventoryHealth(inventoryDays)

  const promoEffects = dataProfile?.historyPromoEffect ?? []
  const lastPromo = promoEffects[0]

  const elasticityBeta = dataProfile?.elasticityBeta ?? -1.8
  const elasticityMethod = dataProfile?.elasticityMethod ?? 'DID'

  /* ================================================================ */
  return (
    <div className="space-y-5">
      {/* ---------- 1. Data source tags ---------- */}
      <div className="flex flex-wrap gap-2">
        {DATA_SOURCES.map((label, i) => {
          const loaded = loadedSources[i]
          return (
            <span
              key={label}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-all duration-300 ${
                loaded
                  ? 'bg-green-900/30 border-green-500/40 text-green-400'
                  : 'bg-[#1e1e28] border-[#2a2a35] text-gray-500'
              }`}
            >
              {loaded && <span>&#10003;</span>}
              {label}
            </span>
          )
        })}
      </div>

      {/* ---------- 2. Data profile grid + elasticity ---------- */}
      <AnimatePresence>
        {allSourcesLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Card: 近7天日均销量 */}
              <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35]">
                <div className="text-xs text-gray-500 mb-1">近7天日均销量</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white">
                    {avgQty7d.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">件/天</span>
                  <span className={`text-sm ${salesTrendUp ? 'text-green-400' : 'text-red-400'}`}>
                    {salesTrendUp ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* Card: 竞品价格区间 */}
              <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35]">
                <div className="text-xs text-gray-500 mb-1">竞品价格区间</div>
                <div className="text-2xl font-semibold text-white mb-2">
                  ¥{minPrice} - ¥{maxPrice}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-[#2a2a35]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
                    }}
                  />
                </div>
              </div>

              {/* Card: 库龄/库存 */}
              <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35]">
                <div className="text-xs text-gray-500 mb-1">库龄 / 库存</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white">
                    {inventoryDays}
                  </span>
                  <span className="text-xs text-gray-500">天</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${health.color} bg-opacity-20`}
                    style={{
                      backgroundColor:
                        inventoryDays < 30
                          ? 'rgba(34,197,94,0.15)'
                          : inventoryDays <= 60
                            ? 'rgba(234,179,8,0.15)'
                            : 'rgba(239,68,68,0.15)',
                    }}
                  >
                    {health.label}
                  </span>
                </div>
              </div>

              {/* Card: 历史促销效果 */}
              <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35]">
                <div className="text-xs text-gray-500 mb-1">历史促销效果</div>
                {lastPromo ? (
                  <>
                    <div className="text-sm text-white mb-0.5">{lastPromo.event}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-green-400">
                        +{((lastPromo.salesLift - 1) * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-500">销量提升</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">暂无数据</div>
                )}
              </div>
            </div>

            {/* ---------- 3. Elasticity panel ---------- */}
            <div className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-300 font-medium">价格弹性估计</span>
                <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">
                  {elasticityMethod}
                </span>
              </div>

              <div className="flex items-start gap-6">
                {/* Beta display */}
                <div className="flex-shrink-0">
                  <div className="text-3xl font-mono font-bold text-white">
                    &beta; = {elasticityBeta.toFixed(2)}
                  </div>
                </div>

                {/* MAE training curve */}
                <div className="flex-1 min-w-0">
                  {modelFitting ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg
                        className="animate-spin h-4 w-4 text-indigo-400"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Fitting causal model...
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">MAE Training Curve</div>
                      <div style={{ width: 200, height: 80 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={MAE_EPOCHS}>
                            <XAxis
                              dataKey="epoch"
                              tick={{ fontSize: 10, fill: '#6b7280' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#6b7280' }}
                              axisLine={false}
                              tickLine={false}
                              domain={[1.2, 2.2]}
                              width={28}
                            />
                            <Line
                              type="monotone"
                              dataKey="mae"
                              stroke="#4ade80"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion message */}
              {!modelFitting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm text-green-400"
                >
                  &#10003; 弹性估计完成 &middot; 中位数: {elasticityBeta.toFixed(2)}
                </motion.div>
              )}
            </div>

            {/* ---------- 4. Completion badge ---------- */}
            <AnimatePresence>
              {profileDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center text-green-400 text-sm font-medium py-2"
                >
                  数据画像完成
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
