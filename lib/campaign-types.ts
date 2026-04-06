export interface AgentLog {
  timestamp: string
  tag: string
  level: 'info' | 'success' | 'error'
  message: string
}

export interface CampaignIntent {
  eventType: '618' | 'double11' | 'daily' | 'clearance' | 'custom'
  targetMargin: number
  maxDiscount: number
  salesTarget: number
  inventoryLimit: number
}

export interface DailySales {
  date: string
  qty: number
  revenue: number
}

export interface CompetitorPrice {
  name: string
  price: number
}

export interface HistoryPromoEffect {
  event: string
  discount: number
  salesLift: number
}

export interface DataProfile {
  recentSales: DailySales[]
  competitorPrices: CompetitorPrice[]
  elasticityBeta: number
  elasticityMethod: 'DID' | 'LGBM'
  inventoryDays: number
  historyPromoEffect: HistoryPromoEffect[]
}

export interface PricingIteration {
  round: number
  price: number
  margin: number
  dailySales: number
  gmv: number
}

export interface ProfitScenario {
  label: string
  dailySales: number
  totalProfit: number
  note: string
}

export interface Pricing {
  iterations: PricingIteration[]
  converged: boolean
  dailyPrice: number
  promoPrice: number
  floorPrice: number
  profitScenarios: ProfitScenario[]
}

export interface RiskCheck {
  type: 'block' | 'warn' | 'pass'
  label: string
  detail: string
  resolved: boolean
}

export interface RiskReview {
  checks: RiskCheck[]
  userConfirmed: boolean
  adjustedPrice: number | null
}

export interface AssetItem {
  id: string
  type: 'main_image' | 'coupon_overlay' | 'detail_header' | 'promo_badge' | 'video_cover'
  label: string
  status: 'pending' | 'generating' | 'done' | 'error'
  imageUrl: string | null
  score: number | null
}

export interface Assets {
  items: AssetItem[]
  phonePreviewReady: boolean
}

export interface DeploymentChecklistItem {
  action: string
  scheduledDate: string
  done: boolean
}

export interface Deployment {
  checklist: DeploymentChecklistItem[]
  savedToProductLibrary: boolean
}

export interface CampaignPipeline {
  taskId: string
  taskName: string
  status: 'draft' | 'running' | 'review' | 'done'
  currentStep: 1 | 2 | 3 | 4 | 5 | 6

  intent: CampaignIntent | null
  dataProfile: DataProfile | null
  pricing: Pricing | null
  riskReview: RiskReview | null
  assets: Assets | null
  deployment: Deployment | null
  agentLogs: AgentLog[]
}

export interface CampaignTaskSummary {
  id: string
  name: string
  market: string
  targetMargin: number
  status: CampaignPipeline['status']
  createdAt: string
}
