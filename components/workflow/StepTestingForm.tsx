'use client'
import { useState } from 'react'
import { ArrowRight, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { useWizardStore } from '@/lib/wizard-store'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { TierGradePill } from '@/components/shared/Badges'
import { getPreTestSalesSummary, parseTestingForm } from '@/lib/testing-sales-predict'

// ─── Field config ────────────────────────────────────────────────────────────

const FIELD_CONFIG = [
  { key: 'daysListed',    label: '上架天数',    unit: '天',  placeholder: '如：9',  hint: '建议跑满 7 天再评估' },
  { key: 'dailySpend',    label: '日均直通车花费', unit: '元', placeholder: '如：80', hint: '直通车后台查看' },
  { key: 'ctr',           label: '点击率 CTR',  unit: '%',  placeholder: '如：4.2', hint: '行业均值约 2.5%' },
  { key: 'cvr',           label: '成交转化率',  unit: '%',  placeholder: '如：1.1', hint: '行业均值约 0.8%' },
  { key: 'addToCartRate', label: '加购率',     unit: '%',  placeholder: '如：8.6', hint: '行业均值约 5.4%' },
  { key: 'favoriteRate',  label: '收藏率',     unit: '%',  placeholder: '如：5.2', hint: '行业均值约 3.0%' },
  { key: 'unitsSold',     label: '已售件数',   unit: '件', placeholder: '如：31',  hint: '包含测款期所有成交' },
  { key: 'costPrice',     label: '采购成本',   unit: '元', placeholder: '如：68',  hint: '每件从供应商进货价' },
] as const

type FieldKey = (typeof FIELD_CONFIG)[number]['key']

// ─── Loading steps ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: '读取测款指标', detail: 'CTR / CVR / 加购率数据解析', durationMs: 900, result: '7天数据有效' },
  { label: '对标行业基准', detail: '女装连衣裙类目均值比对', durationMs: 1100, result: 'CTR +68%，CVR +38%' },
  { label: '计算实际 ROI', detail: '直通车花费 vs 成交金额', durationMs: 800, result: 'ROI 2.8（行业均值 2.0）' },
  { label: '小模型修正日销带', detail: '在选品簇级 P25–P75 上按实测效率系数重算区间', durationMs: 900, result: '测款后结构化区间已更新' },
  { label: '通义 qwen-max 融合研判（Demo）', detail: '注入：S/A/B、测款前区间、表单、修正带 → 生成综合销量语义', durationMs: 1400, result: '测款后综合结论与一句话 verdict 已生成' },
  { label: '生成放量建议', detail: '结合融合结论 + LightGBM 利润模拟', durationMs: 1000, result: '建议放量，81分' },
]

// ─── Component ───────────────────────────────────────────────────────────────

type PageState = 'form' | 'loading'

export function StepTestingForm() {
  const selectedStyle = usePipelineStore((s) => s.selectedStyle)
  const runSkillTesting = usePipelineStore((s) => s.runSkillTesting)
  const advanceStep = useWizardStore((s) => s.advanceStep)

  const [pageState, setPageState] = useState<PageState>('form')
  const [form, setForm] = useState<Record<FieldKey, string>>(
    () => Object.fromEntries(FIELD_CONFIG.map((f) => [f.key, ''])) as Record<FieldKey, string>
  )

  const preTest = getPreTestSalesSummary(selectedStyle)
  const allFilled = FIELD_CONFIG.every((f) => form[f.key].trim() !== '')

  function handleChange(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allFilled) return
    setPageState('loading')
  }

  function handleLoadingComplete() {
    runSkillTesting(parseTestingForm(form))
    advanceStep()
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">正在分析测款数据...</p>
        <LoadingSteps steps={LOADING_STEPS} onComplete={handleLoadingComplete} />
      </div>
    )
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Pre-test prediction panel */}
      {preTest && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="size-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              测款前预测（选品模型）
            </span>
          </div>

          <div className="flex items-start gap-4">
            <TierGradePill tier={preTest.tier} />

            <div className="flex-1 min-w-0">
              {/* P25 / P50 / P75 grid */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(
                  [
                    { label: 'P25 保守', value: preTest.p25 },
                    { label: 'P50 中位', value: preTest.p50 },
                    { label: 'P75 乐观', value: preTest.p75 },
                  ] as const
                ).map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-muted/60 px-3 py-2 text-center"
                  >
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-base font-bold tabular-nums leading-none">
                      {value}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">件/天</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {preTest.bandCaption}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {preTest.sourceLabel} · 样本 {preTest.clusterSampleSize} 款 · 置信度{' '}
                {preTest.confidence === 'high' ? '高' : preTest.confidence === 'mid' ? '中' : '低'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Testing form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-1">填入测款指标</h3>
          <p className="text-xs text-muted-foreground">
            输入实测数据后，AI 将修正日销区间并给出放量建议。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FIELD_CONFIG.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                {field.label}
                <span className="text-muted-foreground font-normal">({field.unit})</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm',
                    'placeholder:text-muted-foreground/50',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
                    'transition-colors',
                  )}
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{field.hint}</p>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={!allFilled}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
            allFilled
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          分析测款数据
          <ArrowRight className="size-4" />
        </button>

        {!allFilled && (
          <p className="text-[11px] text-muted-foreground text-center -mt-2">
            请填写全部 {FIELD_CONFIG.length} 项指标后提交
          </p>
        )}
      </form>
    </div>
  )
}
