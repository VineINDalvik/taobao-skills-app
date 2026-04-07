'use client'

import { create } from 'zustand'
import type {
  PipelineSession, ProductInput, StyleCluster,
  ProductRecord, OptimizationEvent, TestingOutput, TestingInput,
  ClassifyResult,
} from './types'
import {
  MOCK_SKILL2, MOCK_SKILL3,
  MOCK_SKILL4, MOCK_SKILL5, MOCK_SKILL6, MOCK_TESTING,
  buildSkill2, buildSkill3, buildSkill4, buildSkill5, buildSkill6,
} from './mock-data'
import { MOCK_PRODUCT_HISTORY } from './mock-history'
import RAW_CLUSTER_DATA from './cluster-data.json'
import type { ClusterDataRow } from './cluster-data-types'
import { buildSkill1FromClusterData } from './cluster-to-skill1'

interface PipelineStore extends PipelineSession {
  completedSkills: number[]
  activeSkill: number

  // product history (管理看板)
  products: ProductRecord[]

  // actions
  setProductInput: (input: ProductInput) => void
  loadSession: (record: ProductRecord) => void
  runSkill1: () => void
  selectStyle: (style: StyleCluster) => void
  runSkillTesting: (input: TestingInput) => void
  runSkill2: () => void
  runSkill3: () => void
  runSkill4: () => void
  runSkill5: () => void
  runSkill6: () => void
  setActiveSkill: (n: number) => void
  saveCurrentProduct: () => void
  addOptimizationEvent: (productId: string, event: OptimizationEvent) => void
  classifyResult?: ClassifyResult
  setClassifyResult: (result: ClassifyResult) => void
  reset: () => void
}

const initialSession: PipelineSession & { completedSkills: number[]; activeSkill: number } = {
  productInput: { category: '', priceRange: '', styleKeywords: [] },
  completedSkills: [],
  activeSkill: 0,
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  ...initialSession,
  products: MOCK_PRODUCT_HISTORY,

  setProductInput: (input) =>
    set({ productInput: input, completedSkills: [], activeSkill: 1,
          skill1: undefined, selectedStyle: undefined, skillTesting: undefined,
          skill2: undefined, skill3: undefined, skill4: undefined,
          skill5: undefined, skill6: undefined, classifyResult: undefined }),

  loadSession: (record) =>
    set({
      ...record.session,
      completedSkills: [...record.completedSkills],
      activeSkill: Math.max(...record.completedSkills, 0),
    }),

  runSkill1: () =>
    set((s) => ({
      skill1: buildSkill1FromClusterData(RAW_CLUSTER_DATA as ClusterDataRow[]),
      completedSkills: [...new Set([...s.completedSkills, 1])],
    })),

  selectStyle: (style) => set({ selectedStyle: style }),

  runSkillTesting: (input: TestingInput) =>
    set((s) => ({
      skillTesting: { ...MOCK_TESTING, input },
      completedSkills: [...new Set([...s.completedSkills, 0])], // 0 = testing milestone
    })),

  runSkill2: () =>
    set((s) => ({
      skill2: buildSkill2({
        style: s.selectedStyle,
        input: s.productInput,
        goodKeywords: s.skill4?.goodKeywords,
      }),
      completedSkills: [...new Set([...s.completedSkills, 2])],
    })),

  runSkill3: () =>
    set((s) => ({
      skill3: buildSkill3({
        style: s.selectedStyle,
        costPrice: s.skillTesting?.input?.costPrice,
        input: s.productInput,
      }),
      completedSkills: [...new Set([...s.completedSkills, 3])],
    })),

  runSkill4: () =>
    set((s) => ({
      skill4: buildSkill4({
        style: s.selectedStyle,
      }),
      completedSkills: [...new Set([...s.completedSkills, 4])],
    })),

  runSkill5: () =>
    set((s) => ({
      skill5: buildSkill5({
        style: s.selectedStyle,
        optimalPrice: s.skill3?.optimalPrice,
        costPrice: s.skillTesting?.input?.costPrice,
      }),
      completedSkills: [...new Set([...s.completedSkills, 5])],
    })),

  runSkill6: () =>
    set((s) => ({
      skill6: buildSkill6({
        style: s.selectedStyle,
        priceSchedule: s.skill3?.priceSchedule,
        costPrice: s.skillTesting?.input?.costPrice,
        budgetSuggestion: s.skill5?.budgetSuggestion,
      }),
      completedSkills: [...new Set([...s.completedSkills, 6])],
    })),

  setActiveSkill: (n) => set({ activeSkill: n }),

  setClassifyResult: (result) => set({ classifyResult: result }),

  saveCurrentProduct: () => {
    const s = get()
    const name = s.selectedStyle?.name ?? s.productInput.category
    const record: ProductRecord = {
      id: `prod-${Date.now()}`,
      name,
      category: s.productInput.category,
      priceRange: s.productInput.priceRange,
      createdAt: new Date().toISOString(),
      healthScore: Math.round(50 + s.completedSkills.length * 8 + Math.random() * 10),
      completedSkills: [...s.completedSkills],
      session: {
        productInput: s.productInput,
        skill1: s.skill1,
        selectedStyle: s.selectedStyle,
        skill2: s.skill2,
        skill3: s.skill3,
        skill4: s.skill4,
        skill5: s.skill5,
        skill6: s.skill6,
      },
      changeLog: [
        {
          id: 'ev-1',
          skillId: 1,
          skillLabel: 'AI 找款',
          changeType: 'style_selection',
          changedAt: new Date().toISOString(),
          summary: `选款：${name}`,
          metricBefore: {},
          status: 'pending',
        },
      ],
      currentMetrics: {
        ctr: 3.2,
        cvr: 0.8,
        dailySales: 12,
        positiveRate: 0.82,
        roi: 1.8,
      },
    }
    set((state) => ({ products: [record, ...state.products] }))
  },

  addOptimizationEvent: (productId, event) => {
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId
          ? { ...p, changeLog: [...p.changeLog, event] }
          : p
      ),
    }))
  },

  reset: () => set({ ...initialSession, classifyResult: undefined }),
}))

export const SKILLS_META = [
  { id: 1, slug: 'finder',   label: 'AI 找款',   icon: '🔍', desc: '跟爆款 · 簇级预期 · 测款 SOP' },
  { id: 2, slug: 'listing',  label: '上架优化',  icon: '📝', desc: '标题 · 主图 · 详情页' },
  { id: 3, slug: 'pricing',  label: '智能定价',  icon: '💰', desc: 'DID 弹性 · Lagrangian 优化' },
  { id: 4, slug: 'reviews',  label: '评价诊断',  icon: '⭐', desc: '情感分析 · 差评修复' },
  { id: 5, slug: 'ads',      label: '推广诊断',  icon: '📊', desc: '关键词 ROI · 直通车优化' },
  { id: 6, slug: 'promo',    label: '活动促销',  icon: '🎯', desc: '大促定价 · 利润预测' },
] as const
