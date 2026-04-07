'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { ModelStep } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LoadingStepsProps {
  steps: ModelStep[]
  onComplete: () => void
}

export function LoadingSteps({ steps, onComplete }: LoadingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const runStep = (idx: number) => {
      if (idx >= steps.length) {
        setTimeout(onComplete, 300)
        return
      }
      timeout = setTimeout(() => {
        setCompleted((prev) => [...prev, idx])
        setCurrentStep(idx + 1)
        runStep(idx + 1)
      }, steps[idx].durationMs)
    }

    runStep(0)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">AI 推理中...</p>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isDone = completed.includes(i)
          const isActive = currentStep === i

          return (
            <div key={i} className={cn(
              'flex items-start gap-3 p-3 rounded-lg transition-all duration-300',
              isDone && 'bg-green-50/70',
              isActive && !isDone && 'bg-primary/5 border border-primary/20',
              !isDone && !isActive && 'opacity-40',
            )}>
              <div className="shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="size-4 text-primary animate-spin" />
                ) : (
                  <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isDone ? 'text-green-700' : isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
                  {isDone && step.result ? step.result : step.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completed.length / steps.length) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
        {completed.length}/{steps.length} 步完成
      </p>
    </div>
  )
}
