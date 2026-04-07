'use client'

import { create } from 'zustand'

export type WizardStep = 1 | 2 | 3 | 4

interface WizardStore {
  step: WizardStep
  maxReachedStep: WizardStep
  imageUrl: string
  setStep: (n: WizardStep) => void
  advanceStep: () => void
  setImageUrl: (url: string) => void
  resetWizard: () => void
}

export const useWizardStore = create<WizardStore>((set) => ({
  step: 1,
  maxReachedStep: 1,
  imageUrl: '',

  setStep: (n) =>
    set((s) => (n <= s.maxReachedStep ? { step: n } : s)),

  advanceStep: () =>
    set((s) => {
      const next = Math.min(4, s.step + 1) as WizardStep
      return {
        step: next,
        maxReachedStep: Math.max(s.maxReachedStep, next) as WizardStep,
      }
    }),

  setImageUrl: (url) => set({ imageUrl: url }),

  resetWizard: () =>
    set({ step: 1, maxReachedStep: 1, imageUrl: '' }),
}))
