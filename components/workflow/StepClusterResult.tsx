'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { useWizardStore } from '@/lib/wizard-store'
import { DataFlowHint } from '@/components/shared/DataFlowHint'
import type { ClassifyClusterMatch } from '@/lib/types'

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: 'S' | 'A' | 'B' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
        tier === 'S' && 'bg-green-100 text-green-700',
        tier === 'A' && 'bg-blue-100 text-blue-700',
        tier === 'B' && 'bg-gray-100 text-gray-600',
      )}
    >
      {tier}
    </span>
  )
}

// ─── Similarity bar ───────────────────────────────────────────────────────────
function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StepClusterResult() {
  const classifyResult = usePipelineStore((s) => s.classifyResult)
  const skill1 = usePipelineStore((s) => s.skill1)
  const runSkill1 = usePipelineStore((s) => s.runSkill1)
  const selectStyle = usePipelineStore((s) => s.selectStyle)
  const selectedStyle = usePipelineStore((s) => s.selectedStyle)
  const advanceStep = useWizardStore((s) => s.advanceStep)

  const [pendingMatch, setPendingMatch] = useState<ClassifyClusterMatch | null>(null)

  // Populate cluster data on mount if not yet loaded
  useEffect(() => {
    if (!skill1) {
      runSkill1()
    }
  }, [skill1, runSkill1])

  const topClusters = classifyResult?.topClusters?.slice(0, 3) ?? []

  function handleSelectCluster(match: ClassifyClusterMatch) {
    if (!skill1) return
    const matched = skill1.recommendations.find((s) => s.name === match.clusterName)
    if (matched) {
      selectStyle(matched)
      setPendingMatch(match)
    } else {
      // Fallback: synthesise a minimal StyleCluster so the wizard can still advance
      selectStyle({
        id: `cluster-${match.clusterId}`,
        name: match.clusterName,
        tier: match.tier,
        trendScore: match.clusterType === 'trend' ? 80 : 50,
        trendReal: match.clusterType === 'trend',
        attributes: { neckline: '', fabric: '', length: '', pattern: '', season: '' },
        trendSignals: [],
        designGenes: [],
        priceRange: '',
        riskNote: '',
        extensions: [],
        imageUrl: '',
        clusterSampleSize: 0,
        confidence: 'low',
        salesBand: { p25: 0, p50: 0, p75: 0 },
        bandCaption: '',
        testPlan: {
          skuRoles: [],
          observePhase1Days: 7,
          observePhase2Days: 14,
          budgetHint: '',
          stopRules: [],
        },
        supplyHint: { status: 'unknown', note: '' },
      })
      setPendingMatch(match)
    }
  }

  function handleConfirm() {
    advanceStep()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">归簇结果</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          AI 已将图片向量与淘宝款式簇进行匹配，选择最合适的簇继续
        </p>
      </div>

      {/* Novel style badge */}
      {classifyResult?.isNovelStyle && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-medium text-amber-700">
          ✨ 新风格 — 暂未归入现有簇，已加入待定池
        </div>
      )}

      {/* Cluster cards */}
      {topClusters.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {skill1 ? '暂无归簇结果，请先上传图片' : '加载簇数据中…'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {topClusters.map((match, i) => {
            const rank = i + 1
            const isSelected = pendingMatch?.clusterId === match.clusterId

            return (
              <button
                key={match.clusterId}
                type="button"
                onClick={() => handleSelectCluster(match)}
                className={cn(
                  'w-full text-left rounded-2xl border border-border bg-card p-4 transition-all',
                  'hover:border-primary/40 hover:shadow-sm',
                  isSelected && 'border-primary ring-2 ring-primary/20',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Rank number */}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5',
                      rank === 1 && 'bg-amber-100 text-amber-700',
                      rank === 2 && 'bg-gray-100 text-gray-600',
                      rank === 3 && 'bg-orange-50 text-orange-500',
                    )}
                  >
                    {isSelected ? <CheckCircle2 className="size-3.5 text-primary" /> : rank}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{match.clusterName}</span>
                      <TierBadge tier={match.tier} />
                      {match.clusterType === 'trend' && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          趋势簇
                        </span>
                      )}
                    </div>
                    <SimilarityBar value={match.similarity} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected cluster detail panel */}
      {pendingMatch && selectedStyle && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            <span className="text-[13px] font-semibold">{selectedStyle.name}</span>
            <TierBadge tier={selectedStyle.tier} />
          </div>

          {selectedStyle.salesBand && (
            <p className="text-[12px] text-muted-foreground">
              日销预期 P25–P75：
              <span className="font-semibold text-foreground">
                {selectedStyle.salesBand.p25}–{selectedStyle.salesBand.p75} 件/天
              </span>
            </p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            开始测款
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Data flow hint */}
      <DataFlowHint
        title="数据流转"
        flows={[
          {
            from: '图片向量',
            value: '768-dim 嵌入',
            to: '下一步：测款表单',
            toLabel: 'Step 3',
          },
          {
            from: '匹配到的簇',
            value: `簇级日销区间`,
            to: '测款基准参考',
            toLabel: 'Step 3',
          },
        ]}
      />
    </div>
  )
}
