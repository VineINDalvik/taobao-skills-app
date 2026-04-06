'use client'

import { create } from 'zustand'
import type {
  CampaignPipeline,
  CampaignIntent,
  AgentLog,
} from './campaign-types'
import { MOCK_CAMPAIGN, buildMockAgentLogs } from './mock-campaign'

interface CampaignStore extends CampaignPipeline {
  createCampaign: (name: string) => void
  setCampaignIntent: (intent: CampaignIntent) => void
  runDataProfile: () => void
  runPricing: () => void
  confirmRiskReview: (adjustedPrice?: number) => void
  generateAssets: () => void
  deployCampaign: () => void
  advanceStep: () => void
  goToStep: (n: 1 | 2 | 3 | 4 | 5 | 6) => void
  appendLog: (log: AgentLog) => void
}

const initialPipeline: CampaignPipeline = {
  taskId: '',
  taskName: '',
  status: 'draft',
  currentStep: 1,
  intent: null,
  dataProfile: null,
  pricing: null,
  riskReview: null,
  assets: null,
  deployment: null,
  agentLogs: [],
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  ...initialPipeline,

  createCampaign: (name) =>
    set({
      ...initialPipeline,
      taskId: crypto.randomUUID(),
      taskName: name,
      status: 'draft',
      currentStep: 1,
      agentLogs: [
        {
          timestamp: new Date().toISOString(),
          tag: 'system',
          level: 'info',
          message: `创建任务：${name}`,
        },
      ],
    }),

  setCampaignIntent: (intent) =>
    set((s) => ({
      intent,
      currentStep: 2 as const,
      status: 'running',
      agentLogs: [
        ...s.agentLogs,
        ...buildMockAgentLogs(1),
        {
          timestamp: new Date().toISOString(),
          tag: 'intent',
          level: 'success',
          message: `意图已设置：${intent.eventType}，目标毛利 ${(intent.targetMargin * 100).toFixed(0)}%`,
        },
      ],
    })),

  runDataProfile: () => {
    const logs = buildMockAgentLogs(2)
    const state = get()

    // Append logs with setTimeout sequencing
    logs.forEach((log, i) => {
      setTimeout(() => {
        set((s) => ({ agentLogs: [...s.agentLogs, log] }))
      }, (i + 1) * 400)
    })

    // After all logs, set data and advance
    setTimeout(() => {
      set((s) => ({
        dataProfile: MOCK_CAMPAIGN.dataProfile,
        currentStep: 3 as const,
        agentLogs: [
          ...s.agentLogs,
          {
            timestamp: new Date().toISOString(),
            tag: 'data',
            level: 'success',
            message: '数据画像加载完成',
          },
        ],
      }))
    }, (logs.length + 1) * 400)
  },

  runPricing: () => {
    const iterations = MOCK_CAMPAIGN.pricing!.iterations
    const state = get()

    // Simulate iteration by iteration
    iterations.forEach((iter, i) => {
      setTimeout(() => {
        set((s) => ({
          agentLogs: [
            ...s.agentLogs,
            {
              timestamp: new Date().toISOString(),
              tag: 'pricing',
              level: 'info',
              message: `Round ${iter.round}: ¥${iter.price} → margin ${(iter.margin * 100).toFixed(0)}%`,
            },
          ],
        }))
      }, (i + 1) * 500)
    })

    // After iterations, set full pricing and advance
    setTimeout(() => {
      set((s) => ({
        pricing: MOCK_CAMPAIGN.pricing,
        currentStep: 4 as const,
        agentLogs: [
          ...s.agentLogs,
          {
            timestamp: new Date().toISOString(),
            tag: 'pricing',
            level: 'success',
            message: `定价收敛：日常¥${MOCK_CAMPAIGN.pricing!.dailyPrice} / 促销¥${MOCK_CAMPAIGN.pricing!.promoPrice} / 底价¥${MOCK_CAMPAIGN.pricing!.floorPrice}`,
          },
        ],
      }))
    }, (iterations.length + 1) * 500)
  },

  confirmRiskReview: (adjustedPrice) =>
    set((s) => ({
      riskReview: {
        ...MOCK_CAMPAIGN.riskReview!,
        userConfirmed: true,
        adjustedPrice: adjustedPrice ?? null,
      },
      currentStep: 5 as const,
      status: 'review',
      agentLogs: [
        ...s.agentLogs,
        {
          timestamp: new Date().toISOString(),
          tag: 'risk',
          level: 'success',
          message: adjustedPrice
            ? `风险确认，调整价格至 ¥${adjustedPrice}`
            : '风险确认，维持原定价',
        },
      ],
    })),

  generateAssets: () => {
    const items = MOCK_CAMPAIGN.assets!.items

    // Initialize assets with all pending
    set((s) => ({
      assets: {
        items: items.map((item) => ({
          ...item,
          status: 'pending' as const,
          imageUrl: null,
          score: null,
        })),
        phonePreviewReady: false,
      },
    }))

    // Sequentially generate each asset
    items.forEach((item, i) => {
      // Set to generating
      setTimeout(() => {
        set((s) => ({
          assets: s.assets
            ? {
                ...s.assets,
                items: s.assets.items.map((a) =>
                  a.id === item.id ? { ...a, status: 'generating' as const } : a
                ),
              }
            : s.assets,
          agentLogs: [
            ...s.agentLogs,
            {
              timestamp: new Date().toISOString(),
              tag: 'assets',
              level: 'info',
              message: `正在生成：${item.label}…`,
            },
          ],
        }))
      }, i * 1600)

      // Set to done
      setTimeout(() => {
        set((s) => ({
          assets: s.assets
            ? {
                ...s.assets,
                items: s.assets.items.map((a) =>
                  a.id === item.id
                    ? { ...a, status: 'done' as const, imageUrl: item.imageUrl, score: item.score }
                    : a
                ),
              }
            : s.assets,
          agentLogs: [
            ...s.agentLogs,
            {
              timestamp: new Date().toISOString(),
              tag: 'assets',
              level: 'success',
              message: `${item.label} 完成${item.score ? `，评分 ${item.score}` : ''}`,
            },
          ],
        }))
      }, i * 1600 + 800)
    })

    // Mark preview ready and advance after all items
    setTimeout(() => {
      set((s) => ({
        assets: s.assets ? { ...s.assets, phonePreviewReady: true } : s.assets,
        currentStep: 6 as const,
      }))
    }, items.length * 1600)
  },

  deployCampaign: () =>
    set((s) => ({
      deployment: {
        ...MOCK_CAMPAIGN.deployment!,
        savedToProductLibrary: true,
      },
      status: 'done',
      agentLogs: [
        ...s.agentLogs,
        {
          timestamp: new Date().toISOString(),
          tag: 'deploy',
          level: 'success',
          message: '活动配置已保存至商品库，部署清单已生成',
        },
      ],
    })),

  advanceStep: () =>
    set((s) => {
      if (s.currentStep >= 6) return {}
      const next = (s.currentStep + 1) as 1 | 2 | 3 | 4 | 5 | 6
      return { currentStep: next }
    }),

  goToStep: (n) =>
    set((s) => {
      // Can always go back to completed steps; going forward resets downstream
      if (n > s.currentStep) return {}

      const resetMap: Record<number, Partial<CampaignPipeline>> = {
        1: { intent: null, dataProfile: null, pricing: null, riskReview: null, assets: null, deployment: null },
        2: { dataProfile: null, pricing: null, riskReview: null, assets: null, deployment: null },
        3: { pricing: null, riskReview: null, assets: null, deployment: null },
        4: { riskReview: null, assets: null, deployment: null },
        5: { assets: null, deployment: null },
        6: { deployment: null },
      }

      return { currentStep: n, ...resetMap[n] }
    }),

  appendLog: (log) =>
    set((s) => ({ agentLogs: [...s.agentLogs, log] })),
}))
