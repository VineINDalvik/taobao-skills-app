'use client'

import { motion } from 'framer-motion'

interface PipelineStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6
  completedSteps: number[]
}

const STEPS = [
  { num: 1, icon: '\u{1F3AF}', label: '\u610F\u56FE\u89E3\u6790' },
  { num: 2, icon: '\u{1F4CA}', label: '\u6570\u636E\u753B\u50CF' },
  { num: 3, icon: '\u{1F9EE}', label: '\u667A\u80FD\u5B9A\u4EF7' },
  { num: 4, icon: '\u{1F6E1}\uFE0F', label: '\u65B9\u6848\u5BA1\u6838' },
  { num: 5, icon: '\u{1F3A8}', label: '\u4FC3\u9500\u7D20\u6750' },
  { num: 6, icon: '\u{1F680}', label: '\u786E\u8BA4\u6267\u884C' },
] as const

function getStepState(
  stepNum: number,
  currentStep: number,
  completedSteps: number[],
): 'completed' | 'active' | 'pending' {
  if (completedSteps.includes(stepNum)) return 'completed'
  if (stepNum === currentStep) return 'active'
  return 'pending'
}

function getSegmentState(
  gapIndex: number,
  currentStep: number,
  completedSteps: number[],
): 'completed' | 'active' | 'pending' {
  const leftStep = gapIndex + 1
  const rightStep = gapIndex + 2
  const leftDone = completedSteps.includes(leftStep)
  const rightDone = completedSteps.includes(rightStep)

  if (leftDone && rightDone) return 'completed'
  if (leftDone && rightStep === currentStep) return 'active'
  return 'pending'
}

export default function PipelineStepper({
  currentStep,
  completedSteps,
}: PipelineStepperProps) {
  return (
    <div className="relative flex items-start justify-between w-full px-4 py-2">
      {/* Connecting lines */}
      {STEPS.slice(0, -1).map((_, i) => {
        const seg = getSegmentState(i, currentStep, completedSteps)
        let bgClass = 'bg-[#2a2a35]'
        let gradient: string | undefined
        if (seg === 'completed') bgClass = 'bg-green-500'
        if (seg === 'active') {
          bgClass = ''
          gradient =
            'linear-gradient(to right, rgb(34,197,94), rgb(245,158,11))'
        }

        return (
          <div
            key={`line-${i}`}
            className="absolute top-[28px] h-[3px] rounded-full"
            style={{
              left: `calc(${(i / (STEPS.length - 1)) * 100}% + 28px)`,
              width: `calc(${(1 / (STEPS.length - 1)) * 100}% - 56px)`,
            }}
          >
            <motion.div
              className={`h-full rounded-full ${bgClass}`}
              style={gradient ? { background: gradient } : undefined}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            />
          </div>
        )
      })}

      {/* Step circles */}
      {STEPS.map((step) => {
        const state = getStepState(step.num, currentStep, completedSteps)

        const circleBase =
          'w-14 h-14 rounded-2xl flex items-center justify-center text-xl border-2 transition-colors'

        let circleStyle = ''
        let subLabel = ''

        if (state === 'completed') {
          circleStyle =
            'border-green-500 bg-gradient-to-br from-green-900/60 to-green-800/30'
          subLabel = '\u5DF2\u5B8C\u6210'
        } else if (state === 'active') {
          circleStyle =
            'border-amber-400 bg-gradient-to-br from-amber-900/60 to-amber-800/30 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
          subLabel = '\u8FDB\u884C\u4E2D'
        } else {
          circleStyle = 'border-[#2a2a35] bg-[#1e1e28]'
        }

        const labelColor =
          state === 'completed'
            ? 'text-green-400'
            : state === 'active'
              ? 'text-amber-400 font-bold'
              : 'text-gray-500'

        const subColor =
          state === 'completed'
            ? 'text-green-500/70'
            : state === 'active'
              ? 'text-amber-400/70'
              : 'text-transparent'

        const Wrapper = state === 'active' ? motion.div : 'div'
        const wrapperProps =
          state === 'active'
            ? {
                animate: { scale: [1, 1.06, 1] },
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut' as const,
                },
              }
            : {}

        return (
          <div
            key={step.num}
            className="relative z-10 flex flex-col items-center"
            style={{ width: `${100 / STEPS.length}%` }}
          >
            <Wrapper {...wrapperProps}>
              <div className={`${circleBase} ${circleStyle}`}>
                <span>{step.icon}</span>
              </div>
            </Wrapper>
            <span className={`mt-1.5 text-xs ${labelColor}`}>
              {step.label}
            </span>
            <span className={`text-[10px] ${subColor}`}>
              {subLabel || '\u00A0'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
