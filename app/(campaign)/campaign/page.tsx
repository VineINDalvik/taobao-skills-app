'use client'

import { useEffect } from 'react'
import { useCampaignStore } from '@/lib/campaign-store'
import PipelineStepper from '@/components/campaign/PipelineStepper'
import Step1Intent from '@/components/campaign/Step1Intent'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft: { label: '\u8349\u7A3F', color: 'bg-gray-700 text-gray-300' },
  running: { label: '\u8FD0\u884C\u4E2D', color: 'bg-amber-900/60 text-amber-400' },
  review: { label: '\u5BA1\u6838\u4E2D', color: 'bg-amber-900/60 text-amber-400' },
  done: { label: '\u5DF2\u5B8C\u6210', color: 'bg-green-900/60 text-green-400' },
}

export default function CampaignPage() {
  const taskId = useCampaignStore((s) => s.taskId)
  const taskName = useCampaignStore((s) => s.taskName)
  const status = useCampaignStore((s) => s.status)
  const currentStep = useCampaignStore((s) => s.currentStep)
  const createCampaign = useCampaignStore((s) => s.createCampaign)

  useEffect(() => {
    if (!taskId) {
      createCampaign('618 \u5973\u88C5\u5927\u4FC3 \u2014 \u6CD5\u5F0F\u788E\u82B1\u8FDE\u8863\u88D9')
    }
  }, [taskId, createCampaign])

  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.draft

  return (
    <div className="p-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">
            {taskName || '\u5927\u4FC3\u64CD\u76D8\u7BA1\u7EBF'}
          </h1>
          <span className={`text-xs rounded px-1.5 py-0.5 ${st.color}`}>
            {st.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {currentStep} / 6
        </span>
      </div>

      {/* Pipeline stepper */}
      <PipelineStepper currentStep={currentStep} completedSteps={completedSteps} />

      {/* Step content */}
      {currentStep === 1 && <Step1Intent />}
      {currentStep !== 1 && (
        <div className="flex items-center justify-center h-40 rounded-xl border border-[#2a2a35] bg-[#1e1e28]/50">
          <span className="text-gray-500 text-sm">
            Step {currentStep} content area
          </span>
        </div>
      )}
    </div>
  )
}
