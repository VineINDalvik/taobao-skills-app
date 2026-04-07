'use client'

import { useRef } from 'react'
import { ArrowRight, ImagePlus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { SupplierSearch } from './SupplierSearch'
import type { StyleCluster } from '@/lib/types'

interface SourceAndConfirmProps {
  activeRec: StyleCluster
  /** Shared with playbook/extend tabs — parent owns this state */
  supplierImageUrl: string
  setSupplierImageUrl: (url: string) => void
  supplierConfirmed: boolean
  onConfirm: () => void
  className?: string
}

export function SourceAndConfirm({
  activeRec, supplierImageUrl, setSupplierImageUrl,
  supplierConfirmed, onConfirm, className,
}: SourceAndConfirmProps) {
  const supplierFileRef = useRef<HTMLInputElement>(null)
  const selectedSupplier = usePipelineStore((s) => s.selectedSupplier)
  const costPrice = usePipelineStore((s) => s.costPrice)
  const costPriceSource = usePipelineStore((s) => s.costPriceSource)

  const canConfirm = !supplierConfirmed && (selectedSupplier || costPrice || supplierImageUrl)

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <h3 className="text-sm font-semibold mb-1">货源参考 + 绑定实拍</h3>
        <p className="text-xs text-muted-foreground">1688 仅辅助；无近源仍可测款</p>
      </div>

      {/* ── Supplier Search ── */}
      <SupplierSearch
        imageUrl={activeRec.imageUrl}
        supplyHint={activeRec.supplyHint}
      />

      {/* ── Upload supplier / actual photo ── */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
          上传供应商或实拍主图
        </p>
        {!supplierImageUrl ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => supplierFileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/20 hover:bg-primary/5 transition-colors p-5 text-center"
            >
              <ImagePlus className="size-6 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs font-medium">点击上传</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">JPG / PNG / 截图</p>
            </button>
            <input
              ref={supplierFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setSupplierImageUrl(URL.createObjectURL(e.target.files[0]))
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-green-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={supplierImageUrl} alt="供应商图" className="w-full h-full object-cover" />
              <CheckCircle2 className="absolute top-1 right-1 size-3 text-green-600" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="text-xs font-semibold text-green-700">已上传</p>
              <button
                type="button"
                onClick={() => setSupplierImageUrl('')}
                className="text-[10px] text-muted-foreground hover:text-foreground underline mt-1"
              >
                重新上传
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm button ── */}
      {!supplierConfirmed && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
              canConfirm
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            确认选款
            <ArrowRight className="size-3.5" />
          </button>
          {!selectedSupplier && !costPrice && (
            <p className="text-[10px] text-center text-muted-foreground">
              请先找源或手动输入成本价
            </p>
          )}
          {(costPriceSource === 'manual' && !selectedSupplier) && (
            <p className="text-[10px] text-center text-amber-600">
              未找源，下游将使用手动输入的预估成本
            </p>
          )}
        </div>
      )}
    </div>
  )
}
