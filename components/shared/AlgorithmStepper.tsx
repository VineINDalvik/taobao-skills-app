'use client'

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlgoStep {
  label: string
  detail: string
  status: 'done' | 'active' | 'pending' | 'warning'
  score?: number
  badge?: string
}

interface AlgorithmStepperProps {
  steps: AlgoStep[]
  className?: string
}

export function AlgorithmStepper({ steps, className }: AlgorithmStepperProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden mb-6', className)}>
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">算法流水线执行记录</p>
        <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          全部通过
        </span>
      </div>
      <div className="relative flex items-stretch">
        {/* Connector line */}
        <div className="absolute top-[28px] left-0 right-0 mx-[10%] h-px bg-border z-0" />

        {steps.map((step, i) => (
          <div key={i} className="flex-1 flex flex-col items-center px-2 py-3 z-10">
            {/* Icon */}
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center border-2 bg-card mb-1.5',
              step.status === 'done' ? 'border-green-400 bg-green-50' :
              step.status === 'active' ? 'border-primary bg-primary/10' :
              step.status === 'warning' ? 'border-amber-400 bg-amber-50' :
              'border-muted-foreground/30 bg-muted'
            )}>
              {step.status === 'done' ? (
                <CheckCircle2 className="size-3.5 text-green-500" />
              ) : step.status === 'active' ? (
                <Clock className="size-3.5 text-primary" />
              ) : step.status === 'warning' ? (
                <AlertCircle className="size-3.5 text-amber-500" />
              ) : (
                <div className="size-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>

            {/* Label */}
            <p className={cn(
              'text-[10px] font-semibold text-center leading-tight mb-0.5',
              step.status === 'done' ? 'text-foreground' : 'text-muted-foreground'
            )}>{step.label}</p>

            {/* Detail */}
            <p className="text-[9px] text-muted-foreground text-center leading-tight px-1">{step.detail}</p>

            {/* Score badge */}
            {step.score !== undefined && (
              <div className={cn(
                'mt-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold border',
                step.score >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                step.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              )}>
                {step.score}分
              </div>
            )}

            {/* Text badge */}
            {step.badge && (
              <div className="mt-1.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-medium border border-primary/20">
                {step.badge}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
