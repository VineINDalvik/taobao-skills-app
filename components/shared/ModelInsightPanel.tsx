'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react'
import type { ModelInsight } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ModelInsightPanel({ insight }: { insight: ModelInsight }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-8 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="text-sm font-medium">技术说明 — {insight.title}</span>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5 bg-card">
          {/* Algorithm Cards */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">使用的算法与模型</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {insight.algorithmCards.map((card, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold">{card.name}</p>
                    {card.metric && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {card.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
                  {card.source && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5 italic">来源参考：{card.source}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data Source */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">数据来源</p>
            <p className="text-xs text-muted-foreground">{insight.dataSource}</p>
          </div>

          {/* Step Summary */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">推理步骤摘要</p>
            <div className="space-y-1.5">
              {insight.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-xs font-medium">{step.label}</span>
                    {step.result && (
                      <span className="text-[11px] text-muted-foreground"> — {step.result}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
