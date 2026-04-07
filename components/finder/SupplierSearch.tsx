'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, CheckCircle2, ExternalLink, Loader2, AlertCircle, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Supplier1688Result, SupplyHint } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'

const SEARCH_COOLDOWN_MS = 2000

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; results: Supplier1688Result[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

interface SupplierSearchProps {
  imageUrl: string
  supplyHint: SupplyHint
  className?: string
}

export function SupplierSearch({ imageUrl, supplyHint, className }: SupplierSearchProps) {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const selectedSupplier = usePipelineStore((s) => s.selectedSupplier)
  const selectSupplier = usePipelineStore((s) => s.selectSupplier)
  const setCostPriceManual = usePipelineStore((s) => s.setCostPriceManual)
  const [manualCost, setManualCost] = useState('')
  const lastSearchAt = useRef(0)

  const handleSearch = useCallback(async () => {
    // 2s client-side cooldown per spec
    if (Date.now() - lastSearchAt.current < SEARCH_COOLDOWN_MS) return
    lastSearchAt.current = Date.now()
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/supplier-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setState({ status: 'error', message: data.error || '搜索失败，请重试' })
        return
      }
      const results = data.results as Supplier1688Result[]
      if (!results.length) {
        setState({ status: 'empty' })
      } else {
        setState({ status: 'results', results })
      }
    } catch {
      setState({ status: 'error', message: '网络异常，请检查连接' })
    }
  }, [imageUrl])

  const handleSelect = (supplier: Supplier1688Result) => {
    selectSupplier(supplier)
  }

  const handleManualSubmit = () => {
    const price = parseFloat(manualCost)
    if (!isNaN(price) && price > 0) {
      setCostPriceManual(price)
    }
  }

  // ── Supply hint (initial state banner) ──
  const hintBanner = (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2 text-[10px] leading-snug',
        supplyHint.status === 'matched' ? 'border-green-200 bg-green-50 text-green-900' :
        supplyHint.status === 'weak' ? 'border-amber-200 bg-amber-50 text-amber-900' :
        'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <span className="font-semibold">
        货源提示：
        {supplyHint.status === 'matched' ? '匹配度较好' :
          supplyHint.status === 'weak' ? '弱匹配 / 需仔细对样' : '待检索'}
      </span>
      {' · '}{supplyHint.note}
    </div>
  )

  // ── Manual cost fallback ──
  const manualFallback = (
    <div className="flex items-center gap-2 mt-3">
      <input
        type="number"
        placeholder="手动输入成本价"
        value={manualCost}
        onChange={(e) => setManualCost(e.target.value)}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={handleManualSubmit}
        disabled={!manualCost || isNaN(parseFloat(manualCost))}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 disabled:opacity-40"
      >
        确认
      </button>
    </div>
  )

  return (
    <div className={cn('space-y-3', className)}>
      {hintBanner}

      {/* ── Idle: show search trigger ── */}
      {state.status === 'idle' && !selectedSupplier && (
        <button
          type="button"
          onClick={handleSearch}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-semibold text-primary"
        >
          <Search className="size-4" />
          一键找源 · 1688 以图搜
        </button>
      )}

      {/* ── Loading ── */}
      {state.status === 'loading' && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shrink-0 w-44 rounded-lg border border-border bg-card overflow-hidden animate-pulse">
              <div className="h-32 bg-muted" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {(state.status === 'results' || selectedSupplier) && (
        <>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            1688 视觉近似 · {state.status === 'results' ? state.results.length : 1} 个结果
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {(state.status === 'results' ? state.results : [selectedSupplier!]).map((s) => {
              const isSelected = selectedSupplier?.offerId === s.offerId
              return (
                <div
                  key={s.offerId}
                  className={cn(
                    'shrink-0 w-44 rounded-lg border overflow-hidden transition-colors',
                    isSelected ? 'border-green-400 bg-green-50/50 ring-1 ring-green-400' : 'border-border bg-card',
                  )}
                >
                  <div className="h-32 overflow-hidden bg-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-green-500 p-0.5">
                        <CheckCircle2 className="size-3.5 text-white" />
                      </div>
                    )}
                    {/* Similarity bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-0.5 flex items-center gap-1.5">
                      <div className="flex-1 h-1 rounded-full bg-white/30">
                        <div
                          className="h-full rounded-full bg-green-400"
                          style={{ width: `${s.similarityScore * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-white font-medium">{Math.round(s.similarityScore * 100)}%</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[9px] font-medium truncate" title={s.title}>{s.title}</p>
                    <p className="text-sm font-bold text-green-600 mt-0.5">
                      ¥{s.price.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {s.moq}件起 · {s.deliveryDays}天发货
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate" title={s.supplierName}>
                      {s.supplierName} · {s.tradeLevel} · {s.supplierScore}分
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => handleSelect(s)}
                          className="flex-1 text-[10px] font-semibold py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        >
                          选定此源
                        </button>
                      )}
                      <a
                        href={s.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded-md border border-border',
                          isSelected ? 'flex-1' : 'px-2',
                        )}
                      >
                        <ExternalLink className="size-3" /> 详情
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
            {state.status === 'results' && (
              <div className="shrink-0 w-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-center p-2">
                <div>
                  <Package className="size-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground">更多供应商<br/>请到 1688 搜索</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Selected confirmation bar ── */}
          {selectedSupplier && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-green-800">
                到手价 ¥{selectedSupplier.price.toFixed(2)}<span className="font-normal text-green-600">（不含运费）</span>已选为成本价
              </p>
              <button
                type="button"
                onClick={() => { selectSupplier(null); setState({ status: 'idle' }) }}
                className="text-[10px] text-green-700 underline hover:text-green-900"
              >
                重选
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {state.status === 'empty' && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4 text-center">
          <AlertCircle className="size-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-xs text-amber-900 font-medium">未找到近似货源</p>
          <p className="text-[10px] text-amber-700 mt-1">建议线下以图搜或调整参考图</p>
          {manualFallback}
        </div>
      )}

      {/* ── Error state ── */}
      {state.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-center">
          <AlertCircle className="size-5 text-red-500 mx-auto mb-1.5" />
          <p className="text-xs text-red-900 font-medium">{state.message}</p>
          <button
            type="button"
            onClick={handleSearch}
            className="mt-2 text-[10px] text-primary underline"
          >
            重试
          </button>
          {manualFallback}
        </div>
      )}

      {/* ── Manual fallback when idle and no supplier ── */}
      {state.status === 'idle' && !selectedSupplier && (
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">或</p>
          {manualFallback}
        </div>
      )}
    </div>
  )
}
