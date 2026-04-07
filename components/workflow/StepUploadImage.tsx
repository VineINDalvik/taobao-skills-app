'use client'

import { useState } from 'react'
import { Upload, Sparkles, AlertCircle, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { useWizardStore } from '@/lib/wizard-store'
import type { ClassifyResult, ClassifyClusterMatch } from '@/lib/types'
import RAW_CLUSTER_DATA from '@/lib/cluster-data.json'
import type { ClusterDataRow } from '@/lib/cluster-data-types'

type FallbackMode = boolean

export function StepUploadImage() {
  const imageUrl = useWizardStore((s) => s.imageUrl)
  const setImageUrl = useWizardStore((s) => s.setImageUrl)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState<FallbackMode>(false)

  const clusters = RAW_CLUSTER_DATA as ClusterDataRow[]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageUrl.trim()) return

    setLoading(true)
    setError(null)
    setFallback(false)

    try {
      const res = await fetch('/api/classify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
      })

      if (res.status === 502) {
        setFallback(true)
        setLoading(false)
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `请求失败 (${res.status})`)
      }

      const data = (await res.json()) as ClassifyResult
      usePipelineStore.getState().setClassifyResult(data)
      useWizardStore.getState().advanceStep()
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  function handleManualSelect(row: ClusterDataRow) {
    const topMatch: ClassifyClusterMatch = {
      clusterId: row.clusterId,
      clusterName: row.name,
      clusterType: 'structural',
      similarity: 1.0,
      tier: 'A',
    }
    const result: ClassifyResult = {
      topClusters: [topMatch],
      isNovelStyle: false,
      queryEmbedding: [],
    }
    usePipelineStore.getState().setClassifyResult(result)
    useWizardStore.getState().advanceStep()
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          上传商品图片
        </h2>
        <p className="text-xs text-muted-foreground">
          AI 会把你的图片和 12 个热门款簇做视觉相似度匹配，找到最相似的爆款方向
        </p>
      </div>

      {/* URL input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value)
              setError(null)
              setFallback(false)
            }}
            placeholder="粘贴商品图片 URL..."
            className={cn(
              'flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40',
              error && 'border-destructive focus:ring-destructive/40',
            )}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !imageUrl.trim()}
            className={cn(
              'flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
              'whitespace-nowrap',
            )}
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                分析这个款
              </>
            )}
          </button>
        </div>

        {/* Image preview */}
        {imageUrl.trim() && !error && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="size-3 shrink-0" />
            <span className="truncate max-w-xs">{imageUrl.trim()}</span>
          </div>
        )}
      </form>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fallback: manual cluster selection */}
      {fallback && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>AI 图片分析暂不可用，请手动选择最接近的款簇</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {clusters.map((row) => (
              <button
                key={row.clusterId}
                type="button"
                onClick={() => handleManualSelect(row)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl border border-border bg-background',
                  'px-2.5 py-2 text-left text-xs transition-colors',
                  'hover:border-primary/60 hover:bg-primary/5',
                )}
              >
                <span className="text-base leading-none">{row.emoji}</span>
                <span className="mt-1 font-medium leading-snug line-clamp-2">{row.name}</span>
                <span className="text-muted-foreground line-clamp-2 leading-snug">{row.cnDesc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
