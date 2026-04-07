'use client'

import { useWizardStore } from '@/lib/wizard-store'
import { WizardStepIndicator } from '@/components/workflow/WizardStepIndicator'
import { StepUploadImage } from '@/components/workflow/StepUploadImage'
import { StepClusterResult } from '@/components/workflow/StepClusterResult'
import { StepTestingForm } from '@/components/workflow/StepTestingForm'
import { StepResultFeedback } from '@/components/workflow/StepResultFeedback'

export default function WorkflowPage() {
  const { step, maxReachedStep, setStep } = useWizardStore()

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <WizardStepIndicator
        currentStep={step}
        maxReachedStep={maxReachedStep}
        onStepClick={setStep}
      />

      {step === 1 && <StepUploadImage />}
      {step === 2 && <StepClusterResult />}
      {step === 3 && <StepTestingForm />}
      {step === 4 && <StepResultFeedback />}
    </div>
  )
}
