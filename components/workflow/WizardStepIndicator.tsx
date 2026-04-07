'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardStep } from '@/lib/wizard-store'

const STEPS = [
  { n: 1 as WizardStep, label: '上传图片' },
  { n: 2 as WizardStep, label: '归簇结果' },
  { n: 3 as WizardStep, label: '测款数据' },
  { n: 4 as WizardStep, label: '结果反馈' },
]

interface Props {
  currentStep: WizardStep
  maxReachedStep: WizardStep
  onStepClick: (n: WizardStep) => void
}

export function WizardStepIndicator({ currentStep, maxReachedStep, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-8">
      {STEPS.map((step, i) => {
        const isCompleted = step.n < currentStep
        const isActive = step.n === currentStep
        const isClickable = step.n <= maxReachedStep

        return (
          <div key={step.n} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.n)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-1.5 group',
                isClickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  isCompleted && 'bg-green-500 text-white',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isActive && isClickable && 'bg-muted text-muted-foreground hover:bg-muted-foreground/20',
                  !isCompleted && !isActive && !isClickable && 'bg-muted text-muted-foreground/40',
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  step.n
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  isActive && 'text-primary',
                  isCompleted && 'text-green-600',
                  !isActive && !isCompleted && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connecting line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-18px] rounded-full overflow-hidden bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    step.n < currentStep ? 'bg-green-500 w-full' : 'bg-transparent w-0',
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
