'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, RefreshCw, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { useWizardStore } from '@/lib/wizard-store'
import { DataFlowHint } from '@/components/shared/DataFlowHint'
import { getPreTestSalesSummary, buildPostTestFusion } from '@/lib/testing-sales-predict'

// ─── Inline ScoreDial ────────────────────────────────────────────────────────
function ScoreDial({ score, verdict }: { score: number; verdict: 'scale' | 'pivot' }) {
  const isScale = verdict === 'scale'
  const circumference = 2 * Math.PI * 36
  const dashOffset = circumference * (1 - score / 100)
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="40" cy="40" r="36" fill="none"
          stroke={isScale ? '#22c55e' : '#ef4444'} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold', isScale ? 'text-green-600' : 'text-red-600')}>{score}</span>
        <span className="text-[9px] text-muted-foreground">综合评分</span>
      </div>
    </div>
  )
}

// ─── Inline DimBar ────────────────────────────────────────────────────────────
function DimBar({ label, score, vsBenchmark, isGood }: { label: string; score: number; vsBenchmark: string; isGood: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-medium', isGood ? 'text-green-600' : 'text-red-600')}>
            {isGood ? <TrendingUp className="size-3 inline" /> : <TrendingDown className="size-3 inline" />}
            {' '}{vsBenchmark}
          </span>
          <span className="text-[10px] text-muted-foreground w-7 text-right">{score}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', isGood ? 'bg-green-500' : 'bg-red-400')}
          style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StepResultFeedback() {
  const { skillTesting, selectedStyle } = usePipelineStore()
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const preTestSales = getPreTestSalesSummary(selectedStyle)
  const postFusion = useMemo(
    () => (skillTesting ? buildPostTestFusion(selectedStyle, skillTesting) : null),
    [selectedStyle, skillTesting],
  )

  const handleSubmitFeedback = async () => {
    if (feedbackLoading || feedbackSent || !skillTesting) return
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const style = usePipelineStore.getState().selectedStyle
      const input = skillTesting.input
      const res = await fetch('/api/test-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterId: style?.id ? parseInt(style.id.replace(/\D/g, ''), 10) : 0,
          ctr: input.ctr,
          cvr: input.cvr,
          daysListed: input.daysListed,
          unitsSold: input.unitsSold,
          dailySpend: input.dailySpend,
          avgPrice: input.costPrice,
          addToCartRate: input.addToCartRate,
          favoriteRate: input.favoriteRate,
          verdict: skillTesting.verdict,
          productImageEmbedding: [],
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || '提交失败')
      setFeedbackSent(true)
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleRestart = () => {
    useWizardStore.getState().resetWizard()
    usePipelineStore.getState().reset()
  }

  if (!skillTesting) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        暂无测款结果。请先完成测款数据录入（第 3 步）。
      </div>
    )
  }

  const { score, verdict, confidence, dimensionScores, recommendation, nextActions } = skillTesting
  const input = skillTesting.input
  const isScale = verdict === 'scale'

  return (
    <div className="space-y-6">

      {/* ── 1. Verdict banner ─────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-6 flex items-center gap-6',
        isScale ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
      )}>
        <ScoreDial score={score} verdict={verdict} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isScale
              ? <CheckCircle2 className="size-6 text-green-500 shrink-0" />
              : <XCircle className="size-6 text-red-500 shrink-0" />}
            <h2 className={cn('text-xl font-bold', isScale ? 'text-green-700' : 'text-red-700')}>
              {isScale ? '建议放量 🚀' : '建议换款 🔄'}
            </h2>
            {/* scale / pivot badge */}
            <span className={cn(
              'text-[10px] px-2.5 py-0.5 rounded-full font-bold border',
              isScale
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200',
            )}>
              {isScale ? 'Scale ↑' : 'Pivot ↻'}
            </span>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-bold border',
              confidence === 'high' ? 'bg-green-100 text-green-700 border-green-200'
                : confidence === 'mid' ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200',
            )}>
              置信度：{confidence === 'high' ? '高' : confidence === 'mid' ? '中' : '低'}
            </span>
          </div>
          <p className={cn('text-sm leading-relaxed', isScale ? 'text-green-800' : 'text-red-800')}>
            {recommendation}
          </p>
        </div>
      </div>

      {/* ── 2. Post-test fusion table ─────────────────────────────────────── */}
      {postFusion && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-900">
            <Bot className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">测款后 · 销量预测（小模型修正 + LLM 综合）</p>
              <p className="text-[10px] text-indigo-700/90">
                结构化区间由测款数据回调；长文结论为 Demo 规则模拟 qwen-max
              </p>
            </div>
          </div>

          {/* Before vs After table */}
          <div className="rounded-xl border border-indigo-100 bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-left">
                  <th className="p-2.5 font-medium">阶段</th>
                  <th className="p-2.5 font-medium">来源</th>
                  <th className="p-2.5 font-medium tabular-nums">P25</th>
                  <th className="p-2.5 font-medium tabular-nums">P50</th>
                  <th className="p-2.5 font-medium tabular-nums">P75</th>
                </tr>
              </thead>
              <tbody>
                {preTestSales && (
                  <tr className="border-t border-border">
                    <td className="p-2.5 font-medium">测款前</td>
                    <td className="p-2.5 text-muted-foreground">选品模型</td>
                    <td className="p-2.5 tabular-nums">{preTestSales.p25}</td>
                    <td className="p-2.5 tabular-nums font-semibold">{preTestSales.p50}</td>
                    <td className="p-2.5 tabular-nums">{preTestSales.p75}</td>
                  </tr>
                )}
                <tr className="border-t border-border bg-indigo-50/50">
                  <td className="p-2.5 font-medium">测款后</td>
                  <td className="p-2.5 text-muted-foreground">小模型修正</td>
                  <td className="p-2.5 tabular-nums">{postFusion.modelAdjustedBand.p25}</td>
                  <td className="p-2.5 tabular-nums font-bold text-indigo-900">{postFusion.modelAdjustedBand.p50}</td>
                  <td className="p-2.5 tabular-nums">{postFusion.modelAdjustedBand.p75}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Adjustment note */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-100/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-indigo-900 mb-1">小模型修正说明</p>
            <p className="text-[11px] text-indigo-900/90 leading-relaxed">{postFusion.modelAdjustmentNote}</p>
          </div>

          {/* Unified verdict */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">一句话综合 verdict（LLM 层）</p>
            <p className="text-sm font-semibold text-foreground leading-snug">{postFusion.unifiedVerdict}</p>
          </div>
        </div>
      )}

      {/* ── 3. Dimension score bars ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">指标对标分析（行业均值基准）</p>
        <DimBar
          label={`CTR 点击率 ${input.ctr}%`}
          score={dimensionScores.ctrScore}
          vsBenchmark={dimensionScores.ctrVsBenchmark}
          isGood={dimensionScores.ctrScore >= 60}
        />
        <DimBar
          label={`转化率 CVR ${input.cvr}%`}
          score={dimensionScores.cvrScore}
          vsBenchmark={dimensionScores.cvrVsBenchmark}
          isGood={dimensionScores.cvrScore >= 60}
        />
        <DimBar
          label={`加购率 ${input.addToCartRate}%`}
          score={dimensionScores.addToCartScore}
          vsBenchmark={dimensionScores.addToCartVsBenchmark}
          isGood={dimensionScores.addToCartScore >= 60}
        />
        <DimBar
          label={`直通车 ROI ${dimensionScores.roiActual}`}
          score={dimensionScores.roiScore}
          vsBenchmark={`实测 ROI ${dimensionScores.roiActual}（均值 2.0）`}
          isGood={dimensionScores.roiActual >= 2}
        />
      </div>

      {/* ── 4. Next actions ───────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-xl border p-4',
        isScale ? 'border-green-200 bg-green-50/60' : 'border-red-200 bg-red-50/60',
      )}>
        <p className="text-sm font-semibold mb-2.5">{isScale ? '✅ 立即执行' : '🔄 建议操作'}</p>
        <ol className="space-y-1.5 list-decimal list-inside">
          {nextActions.map((action, i) => (
            <li key={i} className={cn('text-xs leading-relaxed', isScale ? 'text-green-800' : 'text-red-800')}>
              {action}
            </li>
          ))}
        </ol>
      </div>

      {/* ── 5. Feedback submission ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">提交到群体统计</h3>
        <p className="text-xs text-muted-foreground">
          你的匿名测款数据将汇入簇级统计，帮助社区其他卖家做更准确的决策。
        </p>
        {feedbackSent ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="size-4" />
            已提交！感谢你的贡献。
          </div>
        ) : (
          <>
            {feedbackError && (
              <p className="text-xs text-destructive">{feedbackError}</p>
            )}
            <button
              onClick={handleSubmitFeedback}
              disabled={feedbackLoading}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {feedbackLoading ? '提交中…' : '提交测款数据到群体统计'}
            </button>
          </>
        )}
      </div>

      {/* ── 6. Data loop card (the key new feature) ──────────────────────── */}
      <DataFlowHint
        title="数据闭环 · 你的贡献"
        flows={[
          {
            from: '你的测款',
            value: `CTR ${input.ctr}% / CVR ${input.cvr}%`,
            toLabel: '簇级统计',
            to: '汇入该簇的 P25-P75 分位数',
          },
          {
            from: '簇级统计',
            value: '更准的基准数据',
            toLabel: '下一位卖家',
            to: '帮助社区做更准确的测款决策',
            loop: true,
          },
        ]}
      />

      {/* ── 7. Reset / restart button ─────────────────────────────────────── */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="size-4" />
          再测一个款
        </button>
      </div>
    </div>
  )
}
