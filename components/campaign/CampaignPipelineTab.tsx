'use client'

import { useEffect, useState } from 'react'
import { useCampaignStore } from '@/lib/campaign-store'
import PipelineStepper from '@/components/campaign/PipelineStepper'
import AgentStream from '@/components/campaign/AgentStream'
import Step1Intent from '@/components/campaign/Step1Intent'
import Step2DataProfile from '@/components/campaign/Step2DataProfile'
import Step3Pricing from '@/components/campaign/Step3Pricing'
import Step4RiskReview from '@/components/campaign/Step4RiskReview'
import Step5Assets from '@/components/campaign/Step5Assets'
import Step6Deploy from '@/components/campaign/Step6Deploy'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-700 text-gray-300' },
  running: { label: '运行中', color: 'bg-amber-900/60 text-amber-400' },
  review: { label: '审核中', color: 'bg-amber-900/60 text-amber-400' },
  done: { label: '已完成', color: 'bg-green-900/60 text-green-400' },
}

export default function CampaignPipelineTab() {
  const taskId = useCampaignStore((s) => s.taskId)
  const taskName = useCampaignStore((s) => s.taskName)
  const status = useCampaignStore((s) => s.status)
  const currentStep = useCampaignStore((s) => s.currentStep)
  const agentLogs = useCampaignStore((s) => s.agentLogs)
  const createCampaign = useCampaignStore((s) => s.createCampaign)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!taskId) {
      createCampaign('618 女装大促 — 法式碎花连衣裙')
    }
  }, [taskId, createCampaign])

  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.draft

  return (
    <div className="rounded-2xl bg-[#0f0f14] text-[#e0e0e0] border border-border overflow-hidden -mx-1">
      {/* Pipeline content */}
      <div className="p-5 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">
              {taskName || '大促操盘管线'}
            </h2>
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
        {currentStep === 2 && <Step2DataProfile />}
        {currentStep === 3 && <Step3Pricing />}
        {currentStep === 4 && <Step4RiskReview />}
        {currentStep === 5 && <Step5Assets />}
        {currentStep === 6 && <Step6Deploy />}
      </div>

      {/* Agent Stream at bottom */}
      <AgentStream
        logs={agentLogs}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
    </div>
  )
}
