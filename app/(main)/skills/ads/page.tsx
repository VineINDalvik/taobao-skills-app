'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, MetricCard, AlertBox, SectionTitle } from '@/components/shared/SkillLayout'
import { ActionBadge } from '@/components/shared/Badges'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { ExportButton } from '@/components/shared/ExportButton'
import { DataFlowHint } from '@/components/shared/DataFlowHint'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import { ArrowRight, Zap, LayoutGrid, Table2, Wallet, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkillWorkspaceShell, type SkillShellTab } from '@/components/shared/SkillWorkspaceShell'

type PageState = 'idle' | 'loading' | 'done'

const ADS_TABS_PRIMARY: SkillShellTab[] = [
  { id: 'workbench', label: '账户总览', short: '总览', icon: LayoutGrid },
  { id: 'keywords', label: '关键词行动', short: '词表', icon: Table2 },
  { id: 'budget', label: '预算与时段', short: '预算', icon: Wallet },
]
const ADS_TABS_REF: SkillShellTab[] = [{ id: 'reference', label: '模型说明', short: '说明', icon: Cpu }]

export default function AdsPage() {
  const router = useRouter()
  const { skill5, runSkill5, selectedStyle, productInput, costPriceSource, selectedSupplier } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skill5 ? 'done' : 'idle')
  const [topTab, setTopTab] = useState<string>('workbench')
  const insight = MODEL_INSIGHTS[5]
  const productName = selectedStyle?.name ?? productInput.category

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="📊" title="推广诊断" subtitle="关键词 ROI 分析 · 直通车优化 · 预算重分配" />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-base font-medium mb-2">诊断「{productName}」的直通车投放</h2>
          <p className="text-sm text-muted-foreground mb-2">
            ROI 规则引擎分类关键词 → 识别烧钱黑洞 → 计算最优出价和时段
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['ROI 规则分类', '利润上限约束', '峰值时段优化', '预算重分配'].map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
            ))}
          </div>
          <button onClick={() => setPageState('loading')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Zap className="size-4" />
            开始推广诊断
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="📊" title="推广诊断" subtitle="关键词 ROI 分析 · 直通车优化 · 预算重分配" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill5(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill5) return null
  const { healthScore, overallROI, industryROI, diagnosis, keywordActions, budgetSuggestion, projectedImprovement } = skill5
  const roiDiff = overallROI - industryROI
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-amber-600' : 'text-red-600'

  const totalWaste = keywordActions.filter(k => k.action === 'pause').reduce((s, k) => s + k.spend, 0)
  const totalGain = keywordActions.filter(k => k.action === 'raise').reduce((s, k) => s + k.orders * 169, 0)

  const adsHint =
    topTab === 'workbench' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>健康分、ROI 与浪费预算</span>
    ) : topTab === 'keywords' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>暂停/加价/加词行动表</span>
    ) : topTab === 'budget' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>可承受 PPC 与峰值时段</span>
    ) : (
      <span><span className="text-foreground/80 font-medium">当前：</span>模型步骤说明</span>
    )

  return (
    <SkillWorkspaceShell
      header={
        <SkillHeader icon="📊" title="推广诊断" subtitle="关键词 ROI 分析 · 直通车优化 · 预算重分配">
          <div className="flex items-center gap-2">
            <ExportButton skillLabel="推广诊断" data={skill5} />
            <button
              type="button"
              onClick={() => setPageState('idle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              重新诊断
            </button>
          </div>
        </SkillHeader>
      }
      primaryTabs={ADS_TABS_PRIMARY}
      referenceTabs={ADS_TABS_REF}
      activeTab={topTab}
      onTabChange={setTopTab}
      hint={adsHint}
    >
      {topTab === 'workbench' && (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">账户健康分</p>
          <p className={cn('text-3xl font-semibold', healthColor)}>{healthScore}</p>
          <p className="text-[10px] text-muted-foreground mt-1">满分 100</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">当前 ROI</p>
          <p className="text-2xl font-semibold">{overallROI}</p>
          <p className={cn('text-[10px] mt-1', roiDiff < 0 ? 'text-red-500' : 'text-green-500')}>
            {roiDiff < 0 ? '↓' : '↑'} vs 行业 {industryROI}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-xs text-red-600 mb-1">日浪费预算</p>
          <p className="text-2xl font-semibold text-red-700">¥{totalWaste}</p>
          <p className="text-[10px] text-red-500 mt-1">建议立即暂停</p>
        </div>
        <MetricCard label="建议日预算" value={`¥${budgetSuggestion.dailyBudget}`} sub="重分配后" />
      </div>

      <AlertBox type="warning">{diagnosis}</AlertBox>
      <div className="mb-6 mt-3" />
      </>
      )}

      {topTab === 'keywords' && (
      <>
      <SectionTitle>关键词优化行动（立即执行）</SectionTitle>
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <div className="grid grid-cols-[1fr_56px_44px_50px_60px] gap-0 px-4 py-2 bg-muted/50 border-b border-border">
          {['关键词', '花费/天', '成交', 'ROI', '操作'].map((h) => (
            <span key={h} className="text-[10px] font-medium text-muted-foreground uppercase">{h}</span>
          ))}
        </div>
        {keywordActions.map((kw, i) => (
          <div key={i} className={cn(
            'grid grid-cols-[1fr_56px_44px_50px_60px] gap-0 px-4 py-3 border-b border-border last:border-0 items-start',
            kw.action === 'pause' && 'bg-red-50/40',
            kw.action === 'raise' && 'bg-green-50/40',
            kw.action === 'add' && 'bg-blue-50/40',
          )}>
            <div>
              <p className="text-xs font-medium">{kw.keyword}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{kw.suggestion}</p>
            </div>
            <span className="text-xs tabular-nums pt-0.5">¥{kw.spend}</span>
            <span className="text-xs tabular-nums pt-0.5">{kw.orders}</span>
            <span className={cn('text-xs font-semibold tabular-nums pt-0.5',
              kw.roi >= 3 ? 'text-green-600' : kw.roi >= 1.5 ? 'text-amber-600' : 'text-red-600'
            )}>{kw.roi > 0 ? kw.roi : '—'}</span>
            <div className="pt-0.5"><ActionBadge action={kw.action} /></div>
          </div>
        ))}
      </div>
      </>
      )}

      {topTab === 'budget' && (
      <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold mb-2.5">最高可承受出价（PPC）</p>
          <p className="text-2xl font-semibold">¥{budgetSuggestion.maxPPC}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            = 客单价 × CVR × (1 / 目标ROI)
            <br />= ¥169 × 1.1% × 0.38 = ¥{budgetSuggestion.maxPPC}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold mb-2.5">建议集中出价时段</p>
          <div className="space-y-1.5">
            {budgetSuggestion.peakHours.map((h) => (
              <div key={h} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10">
                <span className="text-xs text-primary font-medium">⏰ {h}</span>
                <span className="text-[10px] text-muted-foreground">女装类峰值流量窗口</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertBox type="success">{projectedImprovement}</AlertBox>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={() => router.push('/skills/promo')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          继续活动促销 <ArrowRight className="size-4" />
        </button>
      </div>
      </>
      )}

      {topTab === 'reference' && (
        <>
          {costPriceSource === 'supplier-search' && selectedSupplier && (
            <DataFlowHint
              title="供应商成本来源"
              flows={[
                { from: '找源', value: `成本价 ¥${selectedSupplier.price}（${selectedSupplier.supplierName}）`, toLabel: 'Skill 5 推广', to: '用于计算 PPC 可承受上限 = 客单价 × CVR × (1/目标ROI)' },
              ]}
              className="mb-6"
            />
          )}
          <ModelInsightPanel insight={insight} />
        </>
      )}
    </SkillWorkspaceShell>
  )
}
