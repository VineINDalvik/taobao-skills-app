'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  Search, Lightbulb, ClipboardCheck, Sparkles,
  Check, ArrowRight, Upload, ImagePlus, Wand2,
  AlertTriangle, TrendingUp, Loader2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionTitle, AlertBox } from '@/components/shared/SkillLayout'

/* ── Mock Data ─────────────────────────────────────────────── */

const MOCK_DIAGNOSIS = [
  { label: '背景杂乱', severity: 'high' as const, detail: '室内背景有家具干扰，买家看不清商品，容易划走' },
  { label: '色彩偏暗', severity: 'high' as const, detail: '整体比同类目商品暗了 22%，不够吸引眼球' },
  { label: '主体偏小', severity: 'mid' as const, detail: '商品只占了画面 45%，建议放大到 70% 以上' },
  { label: '缺少促销信息', severity: 'low' as const, detail: '没有价格或促销文案，买家少了一个点进来的理由' },
]

const MOCK_ATTRIBUTIONS = [
  { issue: '背景杂乱', pattern: '换成白底图的商家，点击率平均高了 59%', impact: '点击率 损失约 35%' },
  { issue: '色彩偏暗', pattern: '用高饱和色彩的商家，成交率平均高了 28%', impact: '成交率 损失约 18%' },
  { issue: '主体偏小', pattern: '主体占 70% 以上的商家，加购率高了 22%', impact: '加购率 损失约 12%' },
]

const INITIAL_DIRECTIVES = [
  { id: 'r1', action: '去除杂乱背景，替换为纯白底' },
  { id: 'r2', action: '提亮色彩：饱和度 +15%，亮度 +10%' },
  { id: 'r3', action: '自动裁切：把商品放大到画面的 70%' },
  { id: 'r4', action: '在图片右侧加上促销文案' },
  { id: 'r5', action: '输出淘宝主图标准比例（800×1067px）' },
]

const MOCK_VARIANTS = [
  {
    id: 'v1', strategy: '白底促销型',
    desc: '纯白背景 + 醒目促销文字，适合搜索页吸引点击',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=533&fit=crop',
    predictedCtr: '4.8%', predictedCvr: '2.1%',
    tags: ['纯白背景', '促销文案', '高饱和'],
  },
  {
    id: 'v2', strategy: '场景氛围型',
    desc: '户外实拍 + 自然光线，适合种草和详情展示',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=533&fit=crop',
    predictedCtr: '4.2%', predictedCvr: '1.8%',
    tags: ['户外街拍', '自然光', '无文案'],
  },
  {
    id: 'v3', strategy: '细节展示型',
    desc: '多角度拼图 + 面料特写，适合注重品质的买家',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=533&fit=crop',
    predictedCtr: '3.6%', predictedCvr: '2.4%',
    tags: ['多角度拼图', '面料特写', '尺码标注'],
  },
]

const PIPELINE_STEPS = [
  { label: '找问题', desc: '上传图片，AI帮你找问题', Icon: Search },
  { label: '看原因', desc: '为什么影响了你的销量', Icon: Lightbulb },
  { label: '选方案', desc: '勾选你想要的改进项', Icon: ClipboardCheck },
  { label: '出新图', desc: 'AI 一键生成优化后的图', Icon: Sparkles },
] as const

/* ── Helpers ───────────────────────────────────────────────── */

function severityStyle(s: 'high' | 'mid' | 'low') {
  if (s === 'high') return 'bg-red-100 text-red-700 border-red-200'
  if (s === 'mid') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

function severityLabel(s: 'high' | 'mid' | 'low') {
  if (s === 'high') return '影响大'
  if (s === 'mid') return '有影响'
  return '影响小'
}

/* ── Component ─────────────────────────────────────────────── */

export function SmartOptimizePipeline({
  uploadedUrl,
  onUploadedUrlChange,
}: {
  uploadedUrl: string
  onUploadedUrlChange: (url: string) => void
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [stepLoading, setStepLoading] = useState(false)
  const [diagnosed, setDiagnosed] = useState(false)
  const [dirChecked, setDirChecked] = useState<Set<string>>(new Set())
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const advanceStep = useCallback((toStep: number) => {
    setStepLoading(true)
    setTimeout(() => {
      setStepLoading(false)
      setActiveStep(toStep)
    }, 1800)
  }, [])

  const toggleDir = (id: string) => {
    setDirChecked((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const selected = MOCK_VARIANTS.find((v) => v.id === selectedVariant)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── Step Indicator Bar ──────────────────────── */}
      <div className="flex items-center gap-0 border-b border-border bg-muted/30 px-4 py-3">
        {PIPELINE_STEPS.map((step, i) => {
          const done = i < activeStep
          const active = i === activeStep
          const Icon = step.Icon
          return (
            <div key={step.label} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => { if (done) setActiveStep(i) }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap',
                  done && 'text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer',
                  active && 'text-primary bg-primary/10',
                  !done && !active && 'text-muted-foreground',
                )}
                disabled={!done}
              >
                {done ? <Check className="size-3.5 text-green-600" /> : <Icon className="size-3.5" />}
                {step.label}
              </button>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-2', done ? 'bg-green-400' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Loading Overlay ────────────────────────── */}
      {stepLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">AI 正在分析你的图片…</span>
        </div>
      )}

      {/* ── Step 0: Upload + Diagnosis ─────────────── */}
      {!stepLoading && activeStep === 0 && (
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            上传你的商品图，AI 会帮你检查图片有哪些问题，并告诉你怎么改能卖得更好
          </p>

          {!uploadedUrl && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 hover:border-foreground/30 transition-colors p-8 text-center cursor-pointer"
              >
                <ImagePlus className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">点击上传商品图</p>
                <p className="text-xs text-muted-foreground">支持 JPG/PNG 格式</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) onUploadedUrlChange(URL.createObjectURL(e.target.files[0]))
                }}
              />
              <button
                type="button"
                onClick={() => onUploadedUrlChange('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop')}
                className="w-full text-xs text-primary hover:underline py-1"
              >
                没有图？用示例图先试试 →
              </button>
            </>
          )}

          {uploadedUrl && !diagnosed && (
            <div className="space-y-3">
              <div className="relative h-52 rounded-lg overflow-hidden bg-muted">
                <Image src={uploadedUrl} alt="原图" fill className="object-contain" sizes="400px" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-medium">你的原图</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStepLoading(true)
                    setTimeout(() => { setStepLoading(false); setDiagnosed(true) }, 2000)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  <Wand2 className="size-4" />
                  开始检查这张图
                </button>
                <button
                  type="button"
                  onClick={() => { onUploadedUrlChange(''); setDiagnosed(false) }}
                  className="px-3 h-10 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  换一张
                </button>
              </div>
            </div>
          )}

          {uploadedUrl && diagnosed && (
            <div className="space-y-4">
              <div className="relative h-44 rounded-lg overflow-hidden bg-muted">
                <Image src={uploadedUrl} alt="原图" fill className="object-contain" sizes="400px" />
                {/* Issue markers */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-red-500/90 text-white text-[9px] font-bold">
                  背景杂乱
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500/90 text-white text-[9px] font-bold">
                  色彩偏暗
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-amber-500/90 text-white text-[9px] font-bold">
                  主体偏小
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold">检查结果：发现 {MOCK_DIAGNOSIS.length} 个可改进的地方</p>
                {MOCK_DIAGNOSIS.map((d) => (
                  <div key={d.label} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 mt-0.5', severityStyle(d.severity))}>
                      {severityLabel(d.severity)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{d.label}</p>
                      <p className="text-[10px] text-muted-foreground">{d.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => advanceStep(1)}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                下一步：看看为什么影响销量
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Why it matters ────────────────────── */}
      {!stepLoading && activeStep === 1 && (
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            下面是每个问题对你的销量的影响，数据来自同类目爆款商品的对比分析
          </p>
          <div className="space-y-2">
            {MOCK_ATTRIBUTIONS.map((a) => (
              <div key={a.issue} className="rounded-lg border border-border px-3 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-600">{a.issue}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 font-medium">{a.impact}</span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3 text-green-500 shrink-0" />
                  同类目数据：{a.pattern}
                </p>
              </div>
            ))}
          </div>

          <AlertBox type="info">
            总结：你的图最大的问题是<strong>背景和色彩</strong>。参考同类目爆款数据，改好这两项后，<strong className="text-green-600">点击率预计提升 53%</strong>，<strong className="text-green-600">成交率预计提升 30%</strong>。
          </AlertBox>

          <button
            type="button"
            onClick={() => advanceStep(2)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            下一步：选择要改哪些
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Pick improvements ──────────────────── */}
      {!stepLoading && activeStep === 2 && (
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            勾选你希望 AI 帮你改的项目，至少选 3 项就可以生成新图
          </p>
          <div className="space-y-1.5">
            {INITIAL_DIRECTIVES.map((d) => (
              <label
                key={d.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                  dirChecked.has(d.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
                )}
              >
                <input
                  type="checkbox"
                  checked={dirChecked.has(d.id)}
                  onChange={() => toggleDir(d.id)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs">{d.action}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            已选 {dirChecked.size} 项（至少选 3 项）
          </p>

          <button
            type="button"
            disabled={dirChecked.size < 3}
            onClick={() => advanceStep(3)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            AI 生成新图（{dirChecked.size} 项改进）
          </button>
        </div>
      )}

      {/* ── Step 3: Results + Deploy ────────────────── */}
      {!stepLoading && activeStep === 3 && (
        <div className="p-5 space-y-5">
          <p className="text-xs text-muted-foreground">
            AI 生成了 3 套不同风格的优化方案，点击选择你最喜欢的一套
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {MOCK_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariant(v.id)}
                className={cn(
                  'rounded-xl border-2 overflow-hidden text-left transition-all',
                  selectedVariant === v.id ? 'border-primary ring-2 ring-primary/25 shadow-md' : 'border-border hover:border-primary/40',
                )}
              >
                <div className="relative aspect-[3/4] bg-muted">
                  <Image src={v.imageUrl} alt={v.strategy} fill className="object-cover" sizes="200px" />
                  {selectedVariant === v.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-3.5" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2">
                    <p className="text-white text-[11px] font-semibold">{v.strategy}</p>
                  </div>
                </div>
                <div className="p-2.5 space-y-2">
                  <p className="text-[10px] text-muted-foreground leading-snug">{v.desc}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded bg-green-50 border border-green-200 px-2 py-1 text-center">
                      <p className="text-[8px] text-muted-foreground">预估点击率</p>
                      <p className="text-xs font-bold text-green-600">{v.predictedCtr}</p>
                    </div>
                    <div className="rounded bg-blue-50 border border-blue-200 px-2 py-1 text-center">
                      <p className="text-[8px] text-muted-foreground">预估成交率</p>
                      <p className="text-xs font-bold text-blue-600">{v.predictedCvr}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.tags.map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Comparison bar */}
          {selected && (
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">原图点击率</span>
                <span className="font-bold">1.8%</span>
                <ArrowRight className="size-3.5 text-green-600" />
                <span className="text-muted-foreground">{selected.strategy}</span>
                <span className="font-bold text-green-700">{selected.predictedCtr}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <TrendingUp className="size-3.5" />
                提升 {Math.round((parseFloat(selected.predictedCtr) / 1.8 - 1) * 100)}%
              </span>
            </div>
          )}

          {deployed && (
            <AlertBox type="success">
              已成功替换！新图会以暂停状态创建，请到千牛后台手动启用。
            </AlertBox>
          )}

          {!deployed && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!selectedVariant}
                onClick={() => setShowDeployModal(true)}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Upload className="size-4" />
                用这张图替换上线
              </button>
              <button
                type="button"
                disabled={!selected}
                className="flex items-center justify-center gap-2 px-4 h-10 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted"
              >
                先下载图片
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Deploy Modal ───────────────────────────── */}
      {showDeployModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="关闭"
            onClick={() => setShowDeployModal(false)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                <h3 className="text-sm font-semibold">确认替换主图</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex gap-3 items-start">
              <div className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden bg-muted shrink-0">
                <Image src={selected.imageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="space-y-1.5 text-xs">
                <p>确认用「<strong>{selected.strategy}</strong>」方案的新图替换当前主图？</p>
                <p className="text-muted-foreground">新图会以<strong>暂停状态</strong>创建，不会立刻上线，你可以在千牛后台预览后再启用。</p>
                <div className="flex gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 text-[10px] font-medium">预估点击率 {selected.predictedCtr}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium">预估成交率 {selected.predictedCvr}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                再想想
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeployModal(false)
                  setDeployed(true)
                }}
                className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"
              >
                确认替换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
