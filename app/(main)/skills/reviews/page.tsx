'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, MetricCard, AlertBox, SectionTitle } from '@/components/shared/SkillLayout'
import { PriorityBadge } from '@/components/shared/Badges'
import { CopyButton } from '@/components/shared/CopyButton'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { ExportButton } from '@/components/shared/ExportButton'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import { ArrowRight, Zap, LayoutGrid, BarChart2, ListTodo, Cpu, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkillWorkspaceShell, type SkillShellTab } from '@/components/shared/SkillWorkspaceShell'
import type { BuyerPersona } from '@/lib/types'

type PageState = 'idle' | 'loading' | 'done'

const REVIEWS_TABS_PRIMARY: SkillShellTab[] = [
  { id: 'workbench', label: '总览', short: '总览', icon: LayoutGrid },
  { id: 'personas', label: '人群深潜', short: '人群', icon: Users },
  { id: 'dimensions', label: '评分维度', short: '维度', icon: BarChart2 },
  { id: 'actions', label: '修复行动', short: '行动', icon: ListTodo },
]
const REVIEWS_TABS_REF: SkillShellTab[] = [{ id: 'reference', label: '模型说明', short: '说明', icon: Cpu }]

function PersonaCard({ persona, productName }: { persona: BuyerPersona; productName: string }) {
  const [expanded, setExpanded] = useState(false)
  const verdictColor = persona.verdict === 'strong' ? 'text-green-600 bg-green-50 border-green-200'
    : persona.verdict === 'neutral' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-500 bg-red-50 border-red-200'
  const verdictLabel = persona.verdict === 'strong' ? '强匹配' : persona.verdict === 'neutral' ? '一般' : '弱匹配'
  const scoreColor = persona.fitScore >= 7 ? 'text-green-600' : persona.fitScore >= 5 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm',
      persona.verdict === 'strong' ? 'border-green-200' : persona.verdict === 'weak' ? 'border-red-200' : 'border-border'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl">{persona.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{persona.name}</span>
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border', verdictColor)}>
              {verdictLabel}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{persona.ageRange}岁 · 预算 ¥{persona.budget}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-lg font-bold tabular-nums', scoreColor)}>{persona.fitScore.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">匹配分</p>
        </div>
      </div>

      {/* Core needs */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {persona.coreNeeds.map((need) => (
            <span key={need} className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">{need}</span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">{persona.purchaseBehavior}</p>
      </div>

      {/* Expandable review narrative */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-border/60 text-[11px] text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span>{expanded ? '收起评价叙述' : '查看 AI 模拟评价'}</span>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/40">
          <p className="text-xs leading-relaxed text-foreground/80 mt-2">{persona.review}</p>
        </div>
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const router = useRouter()
  const { skill4, runSkill4, selectedStyle, productInput } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skill4 ? 'done' : 'idle')
  const [topTab, setTopTab] = useState<string>('workbench')
  const insight = MODEL_INSIGHTS[4]
  const productName = selectedStyle?.name ?? productInput.category

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="⭐" title="评价诊断" subtitle="情感分析 · 人群深潜 · 差评追因 · 一键修复" />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-4">⭐</div>
          <h2 className="text-base font-medium mb-2">诊断「{productName}」的评价问题</h2>
          <p className="text-sm text-muted-foreground mb-2">
            通义千问批量情感分析 → 买家人群深潜 → P0/P1/P2 规则引擎 → 好评词反哺 Skill 2
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['LLM 情感分类', '买家人群画像', 'P0/P1/P2 规则判定', '爆款对标诊断', '好评词→内容闭环'].map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
            ))}
          </div>
          <button
            onClick={() => setPageState('loading')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Zap className="size-4" />
            开始评价诊断
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="⭐" title="评价诊断" subtitle="情感分析 · 人群深潜 · 差评追因 · 一键修复" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill4(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill4) return null
  const { totalReviews, positiveRate, sentimentTrend, dimensions, actionItems, goodKeywords, personas, personaHitRate } = skill4

  const strongPersonas = personas?.filter(p => p.verdict === 'strong') ?? []
  const weakPersonas = personas?.filter(p => p.verdict === 'weak') ?? []

  const reviewsHint =
    topTab === 'workbench' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>好评率、人群命中率、P0 与好评词回传 Skill 2</span>
    ) : topTab === 'personas' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>Customer DeepSight · AI 买家人群画像与产品匹配评估</span>
    ) : topTab === 'dimensions' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>各维度得分与问题摘要</span>
    ) : topTab === 'actions' ? (
      <span><span className="text-foreground/80 font-medium">当前：</span>P0/P1/P2 修复模板与去推广</span>
    ) : (
      <span><span className="text-foreground/80 font-medium">当前：</span>模型步骤说明</span>
    )

  return (
    <SkillWorkspaceShell
      header={
        <SkillHeader icon="⭐" title="评价诊断" subtitle="情感分析 · 人群深潜 · 差评追因 · 一键修复">
          <div className="flex items-center gap-2">
            <ExportButton skillLabel="评价诊断" data={skill4} />
            <button
              type="button"
              onClick={() => setPageState('idle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              重新分析
            </button>
          </div>
        </SkillHeader>
      }
      primaryTabs={REVIEWS_TABS_PRIMARY}
      referenceTabs={REVIEWS_TABS_REF}
      activeTab={topTab}
      onTabChange={setTopTab}
      hint={reviewsHint}
    >
      {topTab === 'workbench' && (
      <>
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="总评价数" value={totalReviews.toLocaleString()} />
        <MetricCard label="好评率" value={`${(positiveRate * 100).toFixed(0)}%`}
          highlight={positiveRate >= 0.9} sub={positiveRate < 0.9 ? '低于行业均值 92%' : '优秀'} />
        <MetricCard label="人群命中率" value={personaHitRate ? `${Math.round(personaHitRate * 100)}%` : '—'}
          highlight={(personaHitRate ?? 0) >= 0.6} sub={`${strongPersonas.length}/${personas?.length ?? 0} 人群强匹配`} />
        <MetricCard label="P0 问题" value={actionItems.filter(a => a.priority === 'P0').length} sub="立即处理" />
      </div>

      {/* Persona quick summary */}
      {personas && personas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4 text-primary" />
            <p className="text-xs font-medium">人群深潜速览</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strongPersonas.length > 0 && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-[10px] text-green-700 font-medium mb-1.5">优势人群</p>
                <div className="space-y-1">
                  {strongPersonas.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs font-medium text-green-800">{p.name}</span>
                      <span className="text-[10px] text-green-600 ml-auto">{p.fitScore.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {weakPersonas.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-[10px] text-red-600 font-medium mb-1.5">最弱人群</p>
                <div className="space-y-1">
                  {weakPersonas.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs font-medium text-red-700">{p.name}</span>
                      <span className="text-[10px] text-red-500 ml-auto">{p.fitScore.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertBox type={sentimentTrend.includes('下降') ? 'warning' : 'success'}>{sentimentTrend}</AlertBox>

      {/* Good keywords */}
      <div className="rounded-xl border border-border bg-card p-4 mt-4 mb-6">
        <p className="text-xs text-muted-foreground mb-2">好评高频词 → 已回传 Skill 2</p>
        <div className="flex flex-wrap gap-1">
          {goodKeywords.map((kw) => (
            <span key={kw} className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">{kw}</span>
          ))}
        </div>
      </div>
      </>
      )}

      {topTab === 'personas' && (
      <>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Customer DeepSight · AI 用户深潜</SectionTitle>
        {personaHitRate != null && (
          <span className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            personaHitRate >= 0.6 ? 'bg-green-100 text-green-700' : personaHitRate >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
          )}>
            命中率 {Math.round(personaHitRate * 100)}%
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        基于评价数据生成买家人群画像，模拟各人群对「{productName}」的购买决策与真实评价，识别优势与薄弱人群。
      </p>

      {/* Persona grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {personas?.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} productName={productName} />
        ))}
      </div>

      {/* Actionable insight from personas */}
      {personas && personas.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary mb-2">人群洞察 → 行动建议</p>
          <ul className="text-xs text-foreground/80 space-y-1.5">
            {strongPersonas.length > 0 && (
              <li>
                <span className="text-green-600 font-medium">优势人群：</span>
                {strongPersonas.map(p => p.name).join('、')} — 在标题和主图中强化这些人群关注的卖点（
                {strongPersonas.flatMap(p => p.coreNeeds.slice(0, 1)).join('、')}）
              </li>
            )}
            {weakPersonas.length > 0 && (
              <li>
                <span className="text-red-500 font-medium">薄弱人群：</span>
                {weakPersonas.map(p => p.name).join('、')} — 考虑是否需要通过价格策略或 SKU 扩展覆盖此人群
              </li>
            )}
            <li>
              <span className="text-primary font-medium">推广建议：</span>
              直通车定向优先投放{strongPersonas.length > 0 ? strongPersonas[0].name : '高匹配'}人群标签，降低获客成本
            </li>
          </ul>
        </div>
      )}
      </>
      )}

      {topTab === 'dimensions' && (
      <>
      <SectionTitle>评分维度（LLM 情感分析结果）</SectionTitle>
      <div className="rounded-xl border border-border bg-card divide-y divide-border mb-6">
        {Object.entries(dimensions).map(([dim, { score, issues }]) => (
          <div key={dim} className="flex items-center gap-4 px-4 py-3">
            <span className="text-sm w-20 shrink-0">{dim}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', score >= 4.5 ? 'bg-green-500' : score >= 4 ? 'bg-blue-500' : score >= 3.5 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
                <span className={cn('text-xs font-semibold w-7',
                  score >= 4.5 ? 'text-green-600' : score >= 4 ? 'text-blue-600' : score >= 3.5 ? 'text-amber-600' : 'text-red-600'
                )}>{score}</span>
              </div>
              {issues.length > 0 && <p className="text-[10px] text-muted-foreground">{issues.join(' · ')}</p>}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {topTab === 'actions' && (
      <>
      <SectionTitle>修复行动项（P0 优先，今天处理）</SectionTitle>
      <div className="space-y-3 mb-6">
        {actionItems.map((item, i) => (
          <div key={i} className={cn(
            'rounded-xl border bg-card overflow-hidden',
            item.priority === 'P0' ? 'border-red-200' : item.priority === 'P1' ? 'border-amber-200' : 'border-border'
          )}>
            <div className={cn(
              'flex items-center gap-3 px-4 py-2.5 border-b',
              item.priority === 'P0' ? 'bg-red-50 border-red-200' : item.priority === 'P1' ? 'bg-amber-50 border-amber-200' : 'bg-muted/30 border-border'
            )}>
              <PriorityBadge priority={item.priority} />
              <span className="text-sm font-medium flex-1">{item.problem}</span>
              {item.count > 0 && <span className="text-xs text-muted-foreground">{item.count} 条评价</span>}
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">📋 <span className="font-medium text-foreground">操作：</span>{item.fix}</p>
              {item.fixTemplate && (
                <div className="flex items-start justify-between gap-2 bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs leading-relaxed flex-1">{item.fixTemplate}</p>
                  <CopyButton text={item.fixTemplate} />
                </div>
              )}
              <p className="text-[11px] text-green-600">✅ 预期效果：{item.impact}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/skills/ads')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          继续推广诊断 <ArrowRight className="size-4" />
        </button>
      </div>
      </>
      )}

      {topTab === 'reference' && <ModelInsightPanel insight={insight} />}
    </SkillWorkspaceShell>
  )
}
