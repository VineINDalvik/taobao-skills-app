'use client'

import { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  skillLabel: string
  data: unknown
  className?: string
}

function buildExportText(skillLabel: string, data: unknown): string {
  return `=== ${skillLabel} 导出 ===\n生成时间：${new Date().toLocaleString('zh-CN')}\n\n${JSON.stringify(data, null, 2)}`
}

export function ExportButton({ skillLabel, data, className }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(buildExportText(skillLabel, data))
    setOpen(false)
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skillLabel.replace(/\s/g, '_')}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Download className="size-3" />
        导出
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <button
              onClick={handleCopyAll}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
            >
              复制全部文本
            </button>
            <button
              onClick={handleDownloadJson}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-t border-border"
            >
              下载 JSON 文件
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface FullExportButtonProps {
  session: Record<string, unknown>
  productName: string
  completedSkills?: number[]
}

export function FullExportButton({ session, productName, completedSkills = [] }: FullExportButtonProps) {
  const [open, setOpen] = useState(false)

  const summary = buildFullSummary(session, productName)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setOpen(false)
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `全链路方案_${productName}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const handleDownloadJson = () => {
    const record = {
      id: `prod-export-${Date.now()}`,
      name: productName,
      category: (session.productInput as Record<string, string> | undefined)?.category ?? '',
      priceRange: (session.productInput as Record<string, string> | undefined)?.priceRange ?? '',
      createdAt: new Date().toISOString(),
      healthScore: Math.round(50 + completedSkills.length * 8),
      completedSkills,
      session,
      changeLog: [],
      currentMetrics: {},
    }
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `旺铺副驾_${productName}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        <Download className="size-4" />
        导出完整方案
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <button onClick={handleCopy} className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted">
              复制全部（贴入千牛）
            </button>
            <button onClick={handleDownloadTxt} className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted border-t border-border">
              下载完整方案 .txt
            </button>
            <button onClick={handleDownloadJson} className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted border-t border-border">
              下载方案 .json（可重新导入）
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function buildFullSummary(session: Record<string, unknown>, productName: string): string {
  const s2 = session.skill2 as Record<string, unknown> | undefined
  const s3 = session.skill3 as Record<string, unknown> | undefined
  const s4 = session.skill4 as Record<string, unknown> | undefined
  const s5 = session.skill5 as Record<string, unknown> | undefined

  const titles = s2?.titles as Record<string, string> | undefined
  const pricing = s3 as Record<string, unknown> | undefined

  return `旺铺副驾 — 全链路运营方案
商品：${productName}
生成时间：${new Date().toLocaleString('zh-CN')}
========================================

【Skill 2 上架标题】
搜索导向：${titles?.search ?? '—'}
种草导向：${titles?.seeding ?? '—'}
活动导向：${titles?.promo ?? '—'}

【Skill 3 智能定价】
新品引流价：¥${(pricing?.priceSchedule as Record<string, number> | undefined)?.launchPrice ?? '—'}
日常价：¥${(pricing?.priceSchedule as Record<string, number> | undefined)?.dailyPrice ?? '—'}
大促底价：¥${(pricing?.priceSchedule as Record<string, number> | undefined)?.promoFloor ?? '—'}

【Skill 4 评价修复】
${(s4 as Record<string, unknown> | undefined)
  ? '见系统详情页'
  : '尚未运行'}

【Skill 5 推广建议】
${s5
  ? `建议日预算：¥${(s5 as Record<string, unknown> & { budgetSuggestion?: { dailyBudget?: number } })?.budgetSuggestion?.dailyBudget ?? '—'}`
  : '尚未运行'}

========================================
以上内容由 旺铺副驾 AI 生成，请结合实际情况使用。
`
}
