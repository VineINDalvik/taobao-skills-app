import { ArrowRight, RefreshCw, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Cross-step data flow hint ────────────────────────────────────────────────
interface FlowItem {
  from: string
  value: string
  to: string
  toLabel: string
  loop?: boolean   // true = feedback loop (bidirectional)
}

interface DataFlowHintProps {
  title?: string
  flows: FlowItem[]
  className?: string
}

export function DataFlowHint({ title = '数据互通提示', flows, className }: DataFlowHintProps) {
  return (
    <div className={cn('rounded-xl border border-primary/20 bg-primary/5 px-4 py-3', className)}>
      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2.5">{title}</p>
      <div className="space-y-1.5">
        {flows.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">{f.from}</span>
            {f.loop
              ? <RefreshCw className="size-3 text-amber-500 shrink-0" />
              : <ArrowRight className="size-3 text-primary/60 shrink-0" />}
            <span className="text-foreground font-semibold">{f.value}</span>
            <ArrowRight className="size-3 text-primary/40 shrink-0" />
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">{f.toLabel}</span>
            <span className="text-muted-foreground">{f.to}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Merchant case study strip ────────────────────────────────────────────────
interface CaseStudy {
  merchant: string     // "广州商家 @小雨"
  label: string        // "使用 AI 找款后"
  metric: string       // "首月 GMV ¥8.2万"
  detail: string       // "找款第 3 周上架，测款 ROI 3.1 直接放量"
  highlight?: boolean
}

interface CaseStudyBannerProps {
  cases: CaseStudy[]
  className?: string
}

export function CaseStudyBanner({ cases, className }: CaseStudyBannerProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-muted/30 p-4', className)}>
      <div className="flex items-center gap-1.5 mb-3">
        <TrendingUp className="size-3.5 text-green-500" />
        <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">商家实战案例</p>
      </div>
      <div className="grid gap-2.5">
        {cases.map((c, i) => (
          <div key={i} className={cn(
            'rounded-lg border p-3 flex items-start gap-3',
            c.highlight ? 'border-green-200 bg-green-50' : 'border-border bg-card'
          )}>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {c.merchant.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className="text-[11px] font-semibold">{c.merchant}</p>
                <span className={cn('text-xs font-bold shrink-0', c.highlight ? 'text-green-600' : 'text-primary')}>
                  {c.metric}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
