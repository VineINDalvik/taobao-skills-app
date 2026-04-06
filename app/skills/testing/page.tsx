'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, AlertBox, SectionTitle } from '@/components/shared/SkillLayout'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { TierGradePill } from '@/components/shared/Badges'
import { ArrowRight, ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, XCircle, Package, Bot, LineChart } from 'lucide-react'
import { DataFlowHint, CaseStudyBanner } from '@/components/shared/DataFlowHint'
import { cn } from '@/lib/utils'
import { getPreTestSalesSummary, buildPostTestFusion, parseTestingForm } from '@/lib/testing-sales-predict'

type PageState = 'form' | 'loading' | 'done'

const LOADING_STEPS = [
  { label: '读取测款指标', detail: 'CTR / CVR / 加购率数据解析', durationMs: 900, result: '7天数据有效' },
  { label: '对标行业基准', detail: '女装连衣裙类目均值比对', durationMs: 1100, result: 'CTR +68%，CVR +38%' },
  { label: '计算实际 ROI', detail: '直通车花费 vs 成交金额', durationMs: 800, result: 'ROI 2.8（行业均值 2.0）' },
  { label: '小模型修正日销带', detail: '在选品簇级 P25–P75 上按实测效率系数重算区间', durationMs: 900, result: '测款后结构化区间已更新' },
  { label: '通义 qwen-max 融合研判（Demo）', detail: '注入：S/A/B、测款前区间、表单、修正带 → 生成综合销量语义', durationMs: 1400, result: '测款后综合结论与一句话 verdict 已生成' },
  { label: '生成放量建议', detail: '结合融合结论 + LightGBM 利润模拟', durationMs: 1000, result: '建议放量，81分' },
]

const FIELD_CONFIG = [
  { key: 'daysListed',    label: '上架天数',    unit: '天',  placeholder: '如：9',  hint: '建议跑满 7 天再评估' },
  { key: 'dailySpend',    label: '日均直通车花费', unit: '元', placeholder: '如：80', hint: '直通车后台查看' },
  { key: 'ctr',           label: '点击率 CTR',  unit: '%',  placeholder: '如：4.2', hint: '行业均值约 2.5%' },
  { key: 'cvr',           label: '成交转化率',  unit: '%',  placeholder: '如：1.1', hint: '行业均值约 0.8%' },
  { key: 'addToCartRate', label: '加购率',     unit: '%',  placeholder: '如：8.6', hint: '行业均值约 5.4%' },
  { key: 'favoriteRate',  label: '收藏率',     unit: '%',  placeholder: '如：5.2', hint: '行业均值约 3.0%' },
  { key: 'unitsSold',     label: '已售件数',   unit: '件', placeholder: '如：31',  hint: '包含测款期所有成交' },
  { key: 'costPrice',     label: '采购成本',   unit: '元', placeholder: '如：68',  hint: '每件从供应商进货价' },
]

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

export default function TestingPage() {
  const router = useRouter()
  const { skillTesting, runSkillTesting, selectedStyle, productInput } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skillTesting ? 'done' : 'form')
  const [form, setForm] = useState<Record<string, string>>({})
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const productName = selectedStyle?.name ?? productInput.category
  const trendScore = selectedStyle?.trendScore ?? 0
  const preTestSales = getPreTestSalesSummary(selectedStyle)

  const postFusion = useMemo(
    () => (skillTesting ? buildPostTestFusion(selectedStyle, skillTesting) : null),
    [selectedStyle, skillTesting],
  )

  const setField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))
  const canSubmit = FIELD_CONFIG.every(f => form[f.key]?.trim())

  const handleSubmit = () => {
    setPageState('loading')
  }

  const handleLoadComplete = () => {
    runSkillTesting(parseTestingForm(form))
    setPageState('done')
  }

  const handleSubmitFeedback = async () => {
    if (feedbackLoading || feedbackSent) return
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const style = usePipelineStore.getState().selectedStyle
      const res = await fetch('/api/test-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterId: style?.id ? parseInt(style.id.replace(/\D/g, ''), 10) : 0,
          ctr: parseFloat(form.ctr || '0'),
          cvr: parseFloat(form.cvr || '0'),
          daysListed: parseInt(form.daysListed || '0', 10),
          unitsSold: parseInt(form.unitsSold || '0', 10),
          dailySpend: parseFloat(form.dailySpend || '0'),
          avgPrice: parseFloat(form.costPrice || '0'),
          addToCartRate: parseFloat(form.addToCartRate || '0'),
          favoriteRate: parseFloat(form.favoriteRate || '0'),
          verdict: skillTesting?.verdict ?? 'pivot',
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

  if (pageState === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🧪" title="测款验证" subtitle="测款前仅小模型预测 · 测款后小模型修正 + LLM 综合（Demo）" />

        {/* Context: what happened before */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm">🔍</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">来自 Skill 1（簇级预期 + 测款清单）</p>
              <p className="text-sm font-semibold">{productName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">趋势分 {trendScore}</span>
                <span className="text-[10px] text-muted-foreground">建议定价 ¥{selectedStyle?.priceRange}</span>
                {selectedStyle?.salesBand && (
                  <span className="text-[10px] text-muted-foreground">
                    簇级日销 P25–P75：{selectedStyle.salesBand.p25}–{selectedStyle.salesBand.p75} 件/天
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 测款前：仅选品模型销量预测 */}
        {preTestSales ? (
          <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-b from-violet-50/90 to-card p-4 mb-6">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-violet-900">
                <LineChart className="size-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-800">测款前 · 销量预测</p>
                  <p className="text-[10px] text-violet-700/90 mt-0.5">{preTestSales.sourceLabel}（未接入本次测款数据）</p>
                </div>
              </div>
              <TierGradePill tier={preTestSales.tier} className="scale-90 origin-top-left" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-card border border-violet-100 py-2">
                <p className="text-[10px] text-muted-foreground">P25</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{preTestSales.p25}</p>
                <p className="text-[9px] text-muted-foreground">件/天</p>
              </div>
              <div className="rounded-lg bg-violet-100/80 border border-violet-200 py-2">
                <p className="text-[10px] text-violet-800 font-medium">P50</p>
                <p className="text-lg font-black tabular-nums text-violet-900">{preTestSales.p50}</p>
                <p className="text-[9px] text-violet-700">件/天 · 中位</p>
              </div>
              <div className="rounded-lg bg-card border border-violet-100 py-2">
                <p className="text-[10px] text-muted-foreground">P75</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{preTestSales.p75}</p>
                <p className="text-[9px] text-muted-foreground">件/天</p>
              </div>
            </div>
            <p className="text-[11px] text-violet-900/85 mt-3 leading-relaxed">
              {preTestSales.tierCaption} · 趋势分 {preTestSales.trendScore}
              {preTestSales.trendReal ? ' · 趋势验真通过' : ''} · 置信{preTestSales.confidence === 'high' ? '高' : preTestSales.confidence === 'mid' ? '中' : '低'} · n={preTestSales.clusterSampleSize}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 border-t border-violet-100 pt-2">{preTestSales.bandCaption}</p>
          </div>
        ) : (
          <AlertBox type="info" className="mb-6">
            未检测到 Skill 1 选款结果，测款前销量预测不可用。请先在找款流程中确认选款。
          </AlertBox>
        )}

        {/* Testing phase guide */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
          <p className="text-xs font-semibold text-blue-800 mb-3">📋 测款流程（与找款页 SOP 一致）</p>
          <div className="space-y-2">
            {[
              { step: '1', label: '按找款页「SKU 角色」备货（可先小单）', done: true },
              { step: '2', label: '上架后用 Skill 2 优化标题/主图（可选但推荐）', done: true },
              { step: '3', label: '按找款页预算建议开直通车，跑满观察窗口', done: true },
              { step: '4', label: '将 CTR / 加购 / CVR 填下方，对照止损规则', done: false },
            ].map(({ step, label, done }) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold',
                  done ? 'bg-blue-500 text-white' : 'border-2 border-blue-300 text-blue-400')}>
                  {done ? '✓' : step}
                </div>
                <span className={cn('text-[11px]', done ? 'text-blue-700' : 'text-blue-500')}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input form */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <p className="text-sm font-semibold mb-4">录入测款数据</p>
          <div className="grid grid-cols-2 gap-4">
            {FIELD_CONFIG.map(({ key, label, unit, placeholder, hint }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">
                  {label}
                  <span className="ml-1 text-muted-foreground font-normal">{unit}</span>
                </label>
                <input
                  type="number"
                  placeholder={placeholder}
                  value={form[key] ?? ''}
                  onChange={e => setField(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/skills/finder')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="size-4" />
            返回选款
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            开始测款评估
            <ArrowRight className="size-4" />
          </button>
        </div>

        {!selectedStyle && (
          <AlertBox type="warning" className="mt-4">
            尚未选款。请回到 Skill 1 完成风格簇 + 参考款 + 实拍确认后再测款。
          </AlertBox>
        )}
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🧪" title="测款验证" subtitle="对照 Skill 1 的 SOP 录入数据 · 判断是否加码或止损" />
        <LoadingSteps steps={LOADING_STEPS} onComplete={handleLoadComplete} />
      </div>
    )
  }

  if (!skillTesting) return null
  const { score, verdict, confidence, dimensionScores, scaleEstimate, recommendation, nextActions } = skillTesting
  const isScale = verdict === 'scale'
  const sabGrade = score >= 85 ? 'S' : score >= 70 ? 'A' : 'B'
  const sabLabel = { S: '核心爆款', A: '稳定好款', B: '需调整' }[sabGrade]
  const sabStyle = {
    S: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    A: 'bg-blue-100 text-blue-800 border-blue-300',
    B: 'bg-zinc-100 text-zinc-600 border-zinc-300',
  }[sabGrade]

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <SkillHeader icon="🧪" title="测款验证" subtitle="测款后：小模型修正区间 + LLM 综合销量判断 · 对照测款前预测">
        <button onClick={() => setPageState('form')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors">
          重新录入
        </button>
      </SkillHeader>

      {/* Verdict banner */}
      <div className={cn(
        'rounded-2xl border p-6 mb-6 flex items-center gap-6',
        isScale ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
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
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border',
              confidence === 'high' ? 'bg-green-100 text-green-700 border-green-200' :
              confidence === 'mid'  ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                     'bg-zinc-100 text-zinc-600 border-zinc-200')}>
              置信度：{confidence === 'high' ? '高' : confidence === 'mid' ? '中' : '低'}
            </span>
            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-bold border', sabStyle)}>
              {sabGrade} 级 · {sabLabel}
            </span>
          </div>
          <p className={cn('text-sm leading-relaxed', isScale ? 'text-green-800' : 'text-red-800')}>
            {recommendation}
          </p>
        </div>
      </div>

      {/* 测款后：小模型修正带 + LLM 综合（与测款前对比） */}
      {postFusion && preTestSales && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-card p-5 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-900">
            <Bot className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">测款后 · 销量预测（小模型修正 + LLM 综合）</p>
              <p className="text-[10px] text-indigo-700/90">结构化区间由测款数据回调；长文结论为 Demo 规则模拟 qwen-max，正式可接真实 API</p>
            </div>
          </div>

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
                <tr className="border-t border-border">
                  <td className="p-2.5 font-medium">测款前</td>
                  <td className="p-2.5 text-muted-foreground">选品模型</td>
                  <td className="p-2.5 tabular-nums">{preTestSales.p25}</td>
                  <td className="p-2.5 tabular-nums font-semibold">{preTestSales.p50}</td>
                  <td className="p-2.5 tabular-nums">{preTestSales.p75}</td>
                </tr>
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

          <div className="rounded-xl border border-indigo-200 bg-indigo-100/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-indigo-900 mb-1">小模型修正说明</p>
            <p className="text-[11px] text-indigo-900/90 leading-relaxed">{postFusion.modelAdjustmentNote}</p>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">一句话综合 verdict（LLM 层）</p>
            <p className="text-sm font-semibold text-foreground leading-snug">{postFusion.unifiedVerdict}</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Bot className="size-3" /> LLM 综合研判全文（输入含测款结果 + 选品模型输出）
            </p>
            <pre className="text-[11px] text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{postFusion.llmNarrative}</pre>
          </div>
        </div>
      )}

      {postFusion && !preTestSales && (
        <AlertBox type="warning" className="mb-6">
          无选品阶段快照，仅展示测款后修正区间：P50 约 {postFusion.modelAdjustedBand.p50} 件/天。建议从 Skill 1 完整走一遍以对比测款前后。
        </AlertBox>
      )}

      {/* SAB Grade explanation */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {(['S', 'A', 'B'] as const).map((g) => (
          <div key={g} className={cn(
            'rounded-xl border p-3 text-center transition-all',
            g === sabGrade ? (
              g === 'S' ? 'border-yellow-300 bg-yellow-50' :
              g === 'A' ? 'border-blue-200 bg-blue-50' :
              'border-zinc-300 bg-zinc-50'
            ) : 'border-border bg-muted/30 opacity-50'
          )}>
            <p className={cn('text-xl font-black mb-0.5',
              g === 'S' ? 'text-yellow-600' : g === 'A' ? 'text-blue-600' : 'text-zinc-500'
            )}>{g} 级</p>
            <p className="text-[10px] font-semibold mb-1">
              {{ S: '核心爆款', A: '稳定好款', B: '需调整' }[g]}
            </p>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {{ S: '≥85分，全力放量、追货、直通车加码', A: '70–84分，稳步放量，持续优化 CTR/CVR', B: '<70分，建议换款或调整主图/价格' }[g]}
            </p>
            {g === sabGrade && (
              <p className="text-[9px] font-bold mt-1.5">← 当前结果</p>
            )}
          </div>
        ))}
      </div>

      {/* Dimension scores */}
      <SectionTitle>指标对标分析（行业均值基准）</SectionTitle>
      <div className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <DimBar label={`CTR 点击率 ${skillTesting.input.ctr}%`}
          score={dimensionScores.ctrScore} vsBenchmark={dimensionScores.ctrVsBenchmark} isGood={dimensionScores.ctrScore >= 60} />
        <DimBar label={`转化率 CVR ${skillTesting.input.cvr}%`}
          score={dimensionScores.cvrScore} vsBenchmark={dimensionScores.cvrVsBenchmark} isGood={dimensionScores.cvrScore >= 60} />
        <DimBar label={`加购率 ${skillTesting.input.addToCartRate}%`}
          score={dimensionScores.addToCartScore} vsBenchmark={dimensionScores.addToCartVsBenchmark} isGood={dimensionScores.addToCartScore >= 60} />
        <DimBar label={`直通车 ROI ${dimensionScores.roiActual}`}
          score={dimensionScores.roiScore} vsBenchmark={`实测 ROI ${dimensionScores.roiActual}（均值 2.0）`} isGood={dimensionScores.roiActual >= 2} />
      </div>

      {/* Scale estimate */}
      {isScale && scaleEstimate && (
        <>
          <SectionTitle>放量后收益预测（经营件数/利润，与上方日销带互补）</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: '预测月销量', value: `${scaleEstimate.projectedMonthSales}件`, color: 'text-primary' },
              { label: '预测月营收', value: `¥${(scaleEstimate.monthlyRevenue / 10000).toFixed(1)}万`, color: 'text-green-600' },
              { label: '预测月利润', value: `¥${scaleEstimate.monthlyProfit.toLocaleString()}`, color: 'text-green-600' },
              { label: '预计回本天数', value: `${scaleEstimate.breakEvenDays} 天`, color: 'text-foreground' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>
          {/* Cross-skill data bridge */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-6 flex items-start gap-2.5 text-[11px]">
            <Package className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary mb-1">数据已传递至下游 Skill</p>
              <p className="text-muted-foreground">采购成本 ¥{skillTesting.input.costPrice} 已传递给 Skill 3 定价模型 · 实测 CVR {skillTesting.input.cvr}% 将用于 Skill 5 推广诊断出价计算</p>
            </div>
          </div>
        </>
      )}

      {/* Next actions */}
      <div className={cn('rounded-xl border p-4 mb-6', isScale ? 'border-green-200 bg-green-50/60' : 'border-red-200 bg-red-50/60')}>
        <p className="text-sm font-semibold mb-2.5">{isScale ? '✅ 立即执行' : '🔄 建议操作'}</p>
        <ol className="space-y-1.5 list-decimal list-inside">
          {nextActions.map((action, i) => (
            <li key={i} className={cn('text-xs leading-relaxed', isScale ? 'text-green-800' : 'text-red-800')}>{action}</li>
          ))}
        </ol>
      </div>

      {/* Feedback submission */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 mb-6">
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

      {/* Navigation */}
      <DataFlowHint
        title={isScale ? '测款数据 → 放量步骤' : '换款提示'}
        flows={isScale ? [
          { from: '测款', value: `采购成本 ¥${skillTesting.input.costPrice}`, toLabel: 'Skill 3 定价', to: '作为 Lagrangian 利润优化的成本约束' },
          { from: '测款', value: `实测 CVR ${skillTesting.input.cvr}%`, toLabel: 'Skill 5 推广', to: '用于直通车出价 = CPC × CVR 反推' },
          { from: '测款', value: `ROI ${dimensionScores.roiActual}`, toLabel: 'Skill 6 促销', to: '作为活动折扣的利润保护下限', loop: false },
          { from: 'Skill 3 定价', value: '调价后重新核算 ROI', toLabel: '测款', to: '若 ROI 变化 >0.5，触发重测建议', loop: true },
        ] : [
          { from: '本次测款', value: `综合评分 ${score}分`, toLabel: 'Skill 1 找款', to: '调低同风格款的权重，推荐差异化方向' },
        ]}
        className="mb-6"
      />

      {isScale && (
        <CaseStudyBanner
          cases={[
            { merchant: '上海商家 阿梅', label: '测款验证后放量', metric: '月利润 ¥2.8万', detail: `测款 ROI ${dimensionScores.roiActual}，直接追货 500 件，次月 GMV ¥6.4万，利润率 43%`, highlight: true },
            { merchant: '成都女装 小橙', label: '早期拒绝测款险亏', metric: '避损约 ¥3万', detail: '跳过测款直接大批发货 800 件，CTR 1.2%（行业均值 2.5%），最终打折清货亏损；现已改用 AI 测款流程' },
          ]}
          className="mb-6"
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/skills/finder')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="size-4" />
          {isScale ? '返回选款' : '重新选款'}
        </button>
        {isScale ? (
          <button onClick={() => router.push('/skills/listing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            开始全面优化（Skill 2–6）
            <ArrowRight className="size-4" />
          </button>
        ) : (
          <button onClick={() => router.push('/skills/finder')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:opacity-90 transition-opacity">
            换款，重新 AI 找款
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
