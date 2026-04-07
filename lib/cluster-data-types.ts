/**
 * lib/cluster-data.json 行结构（由 scripts/build_cluster_data.py 生成）
 */
import type { FinderClusterSemantic } from '@/lib/finder-cluster-semantic'

export interface ClusterDataRow {
  styleId: string
  clusterId: number
  name: string
  emoji: string
  cnDesc: string
  demandGrowth: string
  demandPct: number
  competition: '低' | '中' | '高'
  hotCount: number
  avgPrice: number
  avgSales: number
  mosaicImages: string[]
  competitors: {
    name: string
    price: string
    sales: string
    image: string
    platform: string
    trend: boolean
  }[]
  insight: string
  /** 簇内样本 embedding 均值（与 OpenCLIP ViT-L-14 / HF 服装集同维），可选以控制 JSON 体积 */
  centroidEmbedding?: number[]
  /** GPT-4o / 规则引擎生成的多标签语义理解 */
  semantic?: FinderClusterSemantic
}
