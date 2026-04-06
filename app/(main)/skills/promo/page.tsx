'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, MetricCard, AlertBox, SectionTitle } from '@/components/shared/SkillLayout'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { FullExportButton } from '@/components/shared/ExportButton'
import { AlgorithmStepper } from '@/components/shared/AlgorithmStepper'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import { ArrowRight, Zap, CheckCircle2, LayoutGrid, CalendarRange, BarChart3, PartyPopper, Cpu, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { SkillWorkspaceShell, type SkillShellTab } from '@/components/shared/SkillWorkspaceShell'
import CampaignPipelineTab from '@/components/campaign/CampaignPipelineTab'

type PageState = 'idle' | 'loading' | 'done'

const PROMO_TABS_PRIMARY: SkillShellTab[] = [
  { id: 'workbench', label: '核心方案', short: '方案', icon: LayoutGrid },
  { id: 'pipeline', label: '大促管线', short: '管线', icon: Workflow },
  { id: 'timeline', label: '执行排期', short: '排期', icon: CalendarRange },
  { id: 'scenarios', label: '情景与风险', short: '情景', icon: BarChart3 },
  { id: 'wrapup', label: '保存收尾', short: '收尾', icon: PartyPopper },
]
const PROMO_TABS_REF: SkillShellTab[] = [{ id: 'reference', label: '模型说明', short: '说明', icon: Cpu }]

const PHASE_CONFIG = {
  warmup:    { label: '预热期', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  peak:      { label: '爆发期', color: 'bg-red-100 text-red-700 border-red-200' },
  aftermath: { label: '返场期', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
} as const

export default function PromoPage() {
  const router = useRouter()
  const { skill6, skill3, runSkill6, selectedStyle, productInput, saveCurrentProduct,
          skill1, skill2, skill4, skill5, completedSkills } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skill6 ? 'done' : 'idle')
  const [topTab, setTopTab] = useState<string>('workbench')
  const [saved, setSaved] = useState(false)
  const insight = MODEL_INSIGHTS[6]
  const productName = selectedStyle?.name ?? productInput.category

  const handleSave = () => {
    saveCurrentProduct()
    setSaved(true)
    setTimeout(() => router.push('/products'), 800)
  }

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🎯" title="活动促销" subtitle="OR 约束优化 · 利润预测 · 执行时间线" />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-base font-medium mb-2">为「{productName}」制定大促方案</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Lagrangian 对偶优化 → 在利润底线约束下最大化 GMV → 三情景利润预测
          </p>
          {skill3 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 mb-4">
              <CheckCircle2 className="size-3.5" />
              已融合 Skill 3 日常价 ¥{skill3.priceSchedule.dailyPrice}，自动计算折扣幅度
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['OR 约束优化', '需求弹性', '三情景预测', '熔断机制'].map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
            ))}
          </div>
          <button onClick={() => setPageState('loading')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Zap className="size-4" />
            生成促销方案
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="🎯" title="活动促销" subtitle="OR 约束优化 · 利润预测 · 执行时间线" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill6(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill6) return null
  const { eventType, optimalDiscount, optimalPrice, marginAtOptimal, expectedGMV, timeline, profitScenarios, riskWarning } = skill6
  const scenarioColors = ['#22c55e', '#3b82f6', '#f59e0b']
  const dailyPrice = skill3?.priceSchedule.dailyPrice ?? 199

  const fullSession = { skill1, skill2, skill3, skill4, skill5, skill6, productInput, selectedStyle }

  const algoSteps = [
    { label: '需求弹性建模', detail: '历史折扣→需求曲线拟合', status: 'done' as const, score: 85, badge: '需求×4.2' },
    { label: 'OR 约束优化', detail: 'Lagrangian 对偶求解', status: 'done' as const, score: 92, badge: `P*=¥${optimalPrice}` },
    { label: '三情景利润预测', detail: 'P10/P50/P90 分位蒙特卡洛', status: 'done' as const, score: 88, badge: '中性达标 ✓' },
    { label: '熔断阈值校验', detail: '毛利底线 / 最低价护栏', status: 'done' as const, score: 100, badge: `毛利 ${(marginAtOptimal*100).toFixed(0)}% ✓` },
  ]

  const promoHint =
    topTab === 'workbench' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>大促价、折扣与 OR 求解说明</span>
    ) : topTab === 'pipeline' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>6 步智能定价 → 素材生成管线</span>
    ) : topTab === 'timeline' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>预热 / 爆发 / 返场执行时间线</span>
    ) : topTab === 'scenarios' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>三情景利润与风险提示</span>
    ) : topTab === 'wrapup' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>全链路完成，保存或分析下一款</span>
    ) : (
      <span><span className="text-foreground/80 font-medium">当前：</span>模型步骤说明</span>
    )

  return (
    <SkillWorkspaceShell
      header={
        <SkillHeader icon="🎯" title="活动促销" subtitle="OR 约束优化 · 利润预测 · 执行时间线">
          <div className="flex items-center gap-2">
            <FullExportButton session={fullSession as Record<string, unknown>} productName={productName} completedSkills={completedSkills} />
            <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200">{eventType}</span>
          </div>
        </SkillHeader>
      }
      primaryTabs={PROMO_TABS_PRIMARY}
      referenceTabs={PROMO_TABS_REF}
      activeTab={topTab}
      onTabChange={setTopTab}
      hint={promoHint}
      contentClassName={topTab === 'pipeline' ? 'max-w-5xl mx-auto w-full' : 'max-w-3xl mx-auto w-full'}
    >
      {topTab === 'pipeline' ? (
        <CampaignPipelineTab />
      ) : (
      <>
      <AlgorithmStepper steps={algoSteps} />

      {topTab === 'workbench' && (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Lagrangian 大促价" value={`¥${optimalPrice}`} highlight />
        <MetricCard label="折扣力度" value={`${(optimalDiscount * 10).toFixed(1)} 折`}
          sub={`¥${dailyPrice} → ¥${optimalPrice}（-${dailyPrice - optimalPrice}元）`} />
        <MetricCard label="大促毛利率" value={`${(marginAtOptimal * 100).toFixed(0)}%`} sub="已超毛利底线 ✓" />
        <MetricCard label="预期 GMV" value={`¥${(expectedGMV / 10000).toFixed(1)}万`} />
      </div>

      {/* OR optimization explainer */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
        <p className="text-xs font-semibold text-primary mb-2">📐 OR 优化过程（Lagrangian 对偶）</p>
        <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
          <p>目标：<span className="text-foreground">max Σ(price × demand(discount))</span></p>
          <p>约束1：<span className="text-foreground">(price - cost) / price ≥ 30%</span>（毛利率底线）</p>
          <p>约束2：<span className="text-foreground">price ≥ ¥68 × 1.1 = ¥74.8</span>（成本底价）</p>
          <p className="mt-1 text-foreground">
            求解：¥169（85折） → 需求 ×4.2 → 毛利率 {(marginAtOptimal*100).toFixed(0)}% ✓ → 全局最优 ✓
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">若再打折到 ¥159：销量 +12%，但毛利降至 ¥12,000（低于目标 ¥15,000 ✗）</p>
      </div>
      </>
      )}

      {topTab === 'timeline' && (
      <>
      <SectionTitle>执行时间线（立即制定排期）</SectionTitle>
      <div className="space-y-2 mb-6">
        {timeline.map((t, i) => {
          const cfg = PHASE_CONFIG[t.phase]
          return (
            <div key={i} className={cn('flex items-start gap-3 rounded-xl border p-4', cfg.color)}>
              <span className={cn('shrink-0 px-2 py-0.5 rounded-md text-xs font-bold border', cfg.color)}>{cfg.label}</span>
              <div className="flex-1">
                <p className="text-xs font-medium mb-0.5">{t.dates}</p>
                <p className="text-xs leading-relaxed opacity-85">{t.action}</p>
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}

      {topTab === 'scenarios' && (
      <>
      <SectionTitle>三情景利润预测（P10 / P50 / P90 销量分位）</SectionTitle>
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={profitScenarios} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, name === 'profit' ? '净利润' : '营收']} />
            <Bar dataKey="revenue" name="营收" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground)/0.2)" />
            <Bar dataKey="profit" name="净利润" radius={[4, 4, 0, 0]}>
              {profitScenarios.map((_, idx) => <Cell key={idx} fill={scenarioColors[idx]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          {profitScenarios.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: scenarioColors[i] }} />
              <span className="text-[10px] text-muted-foreground">{s.label}：净利 ¥{s.profit.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">目标毛利 ¥15,000，中性/乐观均达标</p>
      </div>

      {riskWarning && <AlertBox type="warning">{riskWarning}</AlertBox>}
      </>
      )}

      {topTab === 'wrapup' && (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="size-10 text-green-500 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-green-800 mb-1">全链路分析完成 🎉</h2>
        <p className="text-sm text-green-700 mb-5">
          {productName} 已完成 6 个 Skill 全流程分析，数据已串联。
          <br />保存至商品库，可随时回溯每步优化效果。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleSave}
            disabled={saved}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {saved ? <CheckCircle2 className="size-4" /> : null}
            {saved ? '已保存' : '保存至商品库'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green-300 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            分析下一个商品
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
      )}

      {topTab === 'reference' && <ModelInsightPanel insight={insight} />}
      </>
      )}
    </SkillWorkspaceShell>
  )
}
