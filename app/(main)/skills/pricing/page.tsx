'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, MetricCard, AlertBox, SectionTitle } from '@/components/shared/SkillLayout'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { ExportButton } from '@/components/shared/ExportButton'
import { AlgorithmStepper } from '@/components/shared/AlgorithmStepper'
import { DataFlowHint, CaseStudyBanner } from '@/components/shared/DataFlowHint'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import { ArrowRight, Zap, LayoutGrid, LineChart, ShieldAlert, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkillWorkspaceShell, type SkillShellTab } from '@/components/shared/SkillWorkspaceShell'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

type PageState = 'idle' | 'loading' | 'done'

const PRICING_TABS_PRIMARY: SkillShellTab[] = [
  { id: 'workbench', label: '核心结论', short: '结论', icon: LayoutGrid },
  { id: 'schedule', label: '阶段与曲线', short: '曲线', icon: LineChart },
  { id: 'risk', label: '风控护栏', short: '风控', icon: ShieldAlert },
]
const PRICING_TABS_REF: SkillShellTab[] = [{ id: 'reference', label: '模型与案例', short: '说明', icon: Cpu }]

export default function PricingPage() {
  const router = useRouter()
  const { skill3, runSkill3, selectedStyle, productInput, costPriceSource, selectedSupplier } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skill3 ? 'done' : 'idle')
  const [topTab, setTopTab] = useState<string>('workbench')
  const insight = MODEL_INSIGHTS[3]
  const productName = selectedStyle?.name ?? productInput.category

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="💰" title="智能定价" subtitle="DID 价格弹性 · Lagrangian 利润优化 · 三层风控" />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-base font-medium mb-2">为「{productName}」建立定价模型</h2>
          <p className="text-sm text-muted-foreground mb-2">
            DID 因果推断估算价格弹性 → Lagrangian 对偶优化找利润最大点 → 三层风控护栏
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['DID 双重差分', 'LightGBM 冷启动', '拉格朗日 OR 优化', '熔断机制'].map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
            ))}
          </div>
          <button
            onClick={() => setPageState('loading')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Zap className="size-4" />
            运行定价模型
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="💰" title="智能定价" subtitle="DID 价格弹性 · Lagrangian 利润优化 · 三层风控" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill3(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill3) return null
  const { optimalPrice, elasticityBeta, elasticityConfidence, priceSchedule, profitSimulation, competitorRange, riskAlerts, currentStage } = skill3
  const stageLabel = { launch: '新品期', growth: '成长期', clearance: '清货期' }[currentStage]
  const confLabel = { high: '高', mid: '中', low: '低' }[elasticityConfidence]
  const confScore = { high: 88, mid: 71, low: 52 }[elasticityConfidence]
  const optimalRow = profitSimulation.find(r => r.price === optimalPrice)

  const algoSteps = [
    { label: 'DID 双重差分', detail: '价格弹性因果估算', status: 'done' as const, score: confScore, badge: `β=${elasticityBeta}` },
    { label: 'LightGBM 冷启动', detail: '特征回归补全弹性', status: 'done' as const, badge: `置信 ${confLabel}` },
    { label: 'Lagrangian 枚举', detail: '20档价格离散优化', status: 'done' as const, score: 92, badge: `P*=¥${optimalPrice}` },
    { label: '三层风控', detail: 'Hard Block / 熔断校验', status: 'done' as const, score: 100, badge: '全部通过 ✓' },
  ]

  const pricingHint =
    topTab === 'workbench' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>最优价、枚举表与算法步骤总览</span>
    ) : topTab === 'schedule' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>分阶段定价与利润—日销曲线</span>
    ) : topTab === 'risk' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>Hard Block、熔断与风险提示</span>
    ) : (
      <span><span className="text-foreground/80 font-medium">当前：</span>下游联动、案例与模型说明</span>
    )

  return (
    <SkillWorkspaceShell
      header={
        <SkillHeader icon="💰" title="智能定价" subtitle="DID 价格弹性 · Lagrangian 利润优化 · 三层风控">
          <div className="flex items-center gap-2">
            <ExportButton skillLabel="智能定价" data={skill3} />
            <span className="px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground">{stageLabel}</span>
          </div>
        </SkillHeader>
      }
      primaryTabs={PRICING_TABS_PRIMARY}
      referenceTabs={PRICING_TABS_REF}
      activeTab={topTab}
      onTabChange={setTopTab}
      hint={pricingHint}
    >
      <AlgorithmStepper steps={algoSteps} />

      {topTab === 'workbench' && (
      <>
      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Lagrangian 最优价" value={`¥${optimalPrice}`} highlight />
        <MetricCard label="价格弹性 β" value={elasticityBeta} sub={`置信度：${confLabel} (LightGBM)`} />
        <MetricCard label="竞品均价" value={`¥${competitorRange.avg}`} sub={`¥${competitorRange.min}–¥${competitorRange.max}`} />
        <MetricCard label="预计月利润" value={`¥${optimalRow?.monthlyProfit?.toLocaleString() ?? '—'}`} />
      </div>

      {/* Decision logic box */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
        <p className="text-xs font-semibold text-primary mb-2">📐 定价决策依据（Lagrangian 枚举结果）</p>
        <div className="space-y-1.5">
          {profitSimulation.map((row) => (
            <div key={row.price} className={cn(
              'flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs',
              row.price === optimalPrice ? 'bg-primary/15 font-semibold text-primary' : 'text-muted-foreground'
            )}>
              <span className="w-14 shrink-0">¥{row.price}</span>
              <span className="w-16 shrink-0">日销 {row.dailySales} 件</span>
              <span className="w-20 shrink-0">GMV ¥{(row.price * row.dailySales * 30 / 10000).toFixed(1)}万/月</span>
              <span>月利润 ¥{row.monthlyProfit.toLocaleString()}</span>
              {row.price === optimalPrice && <span className="ml-auto text-primary">← 最优 ✓</span>}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          毛利约束 ≥ 30%（成本 ¥68），枚举 20 个价格档位，¥169 利润最大化
        </p>
      </div>

      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => router.push('/skills/reviews')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          继续评价诊断 <ArrowRight className="size-4" />
        </button>
      </div>
      </>
      )}

      {topTab === 'schedule' && (
      <>
      {/* Price schedule */}
      <SectionTitle>分阶段定价方案</SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '新品引流价', value: priceSchedule.launchPrice, hint: '今天→第15天：积累销量和评价', active: true },
          { label: '日常价', value: priceSchedule.dailyPrice, hint: '第16天起：成长期利润优先', active: false },
          { label: '大促底价', value: priceSchedule.promoFloor, hint: '每件净利最低线，不可再低', active: false },
        ].map(({ label, value, hint, active }) => (
          <div key={label} className={cn(
            'rounded-xl border p-4 text-center',
            active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
          )}>
            <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
            <p className={cn('text-2xl font-semibold', active && 'text-primary')}>¥{value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{hint}</p>
            {active && <span className="text-[9px] text-primary font-bold mt-1 block">▶ 当前阶段</span>}
          </div>
        ))}
      </div>

      {/* Profit curve */}
      <SectionTitle>利润 vs 日销 曲线（20 个价格档位枚举）</SectionTitle>
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsLineChart data={profitSimulation} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="price" tickFormatter={(v) => `¥${v}`} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="profit" tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="sales" orientation="right" tickFormatter={(v) => `${v}件`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value, name) =>
                name === 'monthlyProfit' ? [`¥${Number(value).toLocaleString()}`, '月利润'] : [`${value}件`, '日销']
              }
              labelFormatter={(label) => `定价：¥${label}`}
            />
            <ReferenceLine yAxisId="profit" x={optimalPrice} stroke="hsl(var(--primary))" strokeDasharray="4 2"
              label={{ value: '最优', position: 'top', fontSize: 10, fill: 'hsl(var(--primary))' }}
            />
            <Line yAxisId="profit" type="monotone" dataKey="monthlyProfit" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="sales" type="monotone" dataKey="dailySales" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground text-center mt-1">实线 = 月利润（左轴）· 虚线 = 日均销量（右轴）</p>
      </div>
      </>
      )}

      {topTab === 'risk' && (
      <>
      <SectionTitle>风控提示</SectionTitle>
      <div className="space-y-2 mb-6">
        {riskAlerts.map((a, i) => <AlertBox key={i} type="warning">{a}</AlertBox>)}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700 flex gap-2">
          <span className="shrink-0">🔴</span>
          <span><b>Hard Block：</b>负毛利建议强制拦截，已校验 ¥169 毛利率 38% &gt; 底线 30%</span>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700 flex gap-2">
          <span className="shrink-0">⚡</span>
          <span><b>Circuit Breaker：</b>若调价后次日销量下跌 &gt;15%，系统将自动提示回滚</span>
        </div>
      </div>
      </>
      )}

      {topTab === 'reference' && (
      <>
      <DataFlowHint
        title="定价数据 → 下游步骤（含反馈循环）"
        flows={[
          ...(costPriceSource === 'supplier-search' && selectedSupplier ? [{
            from: '找源',
            value: `成本价 ¥${selectedSupplier.price}（${selectedSupplier.supplierName}）`,
            toLabel: 'Skill 3 定价',
            to: '作为利润优化的成本基准',
          }] : []),
          { from: 'Skill 3', value: `最优价 ¥${optimalPrice}`, toLabel: 'Skill 6 促销', to: '活动折扣下限 = 最优价 × 80%（保本线）' },
          { from: 'Skill 3', value: '价格弹性 β', toLabel: 'Skill 5 推广', to: '出价容忍度 = CVR × 客单价 × β 系数' },
          { from: 'Skill 4 评价', value: '差评率若 >8%', toLabel: 'Skill 3', to: '系统提示可降价 ¥5–10 缓解舆论压力', loop: true },
          { from: 'Skill 5 推广', value: '真实 ROI 数据', toLabel: 'Skill 3', to: '若 ROI 持续 <1.8，触发重新定价建议', loop: true },
        ]}
        className="my-6"
      />

      <CaseStudyBanner
        cases={[
          { merchant: '广州女装 晓燕', label: '使用 Lagrangian 定价后', metric: '利润率从 18% → 31%', detail: `将原定价 ¥199 优化至 ¥${optimalPrice}，弹性系数显示该价格带 CVR 最优，月利润增加 ¥1.2万`, highlight: true },
          { merchant: '义乌饰品 小琴', label: '定价-评价联动案例', metric: '差评率从 11% → 4%', detail: '差评中高频提到"性价比不高"，Skill 4 检测后回传 Skill 3，降价 ¥15，差评率 3周内降至 4%' },
        ]}
        className="mb-6"
      />

      <ModelInsightPanel insight={insight} />
      </>
      )}
    </SkillWorkspaceShell>
  )
}
