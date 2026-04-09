'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Extension, StyleCluster } from '@/lib/types'
import { RiskBadge } from '@/components/shared/Badges'
import { cn } from '@/lib/utils'
import { buildForegroundCutoutDataUrl, buildForegroundMaskDataUrl } from '@/lib/garment-segmentation'
import {
  type ExtensionPatternId,
  compositeMaskedStylePreview,
} from '@/lib/extension-masked-preview'
import type { FinderClusterSemantic } from '@/lib/finder-cluster-semantic'
import {
  type DesignLibraryItem,
  ELEMENT_LIBRARY,
  FABRIC_LIBRARY,
  SILHOUETTE_LIBRARY,
} from '@/lib/extension-design-library-assets'
import {
  Palette,
  Layers,
  Loader2,
  Check,
  Upload,
  Scan,
  LayoutTemplate,
  ClipboardList,
  MessageSquare,
  Library,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react'

/** 换色：叠色混合（Demo，非真实重绘） */
const COLOR_PRESETS = [
  { id: 'navy', label: '藏蓝', tint: 'rgba(28, 49, 85, 0.38)' },
  { id: 'cream', label: '奶咖', tint: 'rgba(160, 120, 88, 0.35)' },
  { id: 'smoke', label: '烟粉', tint: 'rgba(180, 100, 120, 0.32)' },
  { id: 'jade', label: '松石绿', tint: 'rgba(30, 110, 100, 0.34)' },
  { id: 'ink', label: '墨黑', tint: 'rgba(20, 24, 32, 0.45)' },
] as const

const PATTERN_PRESETS = [
  { id: 'none', label: '无', css: '' },
  {
    id: 'stripe',
    label: '条纹感',
    css: 'repeating-linear-gradient(-52deg, transparent, transparent 5px, rgba(0,0,0,0.12) 5px, rgba(0,0,0,0.12) 6px)',
  },
  {
    id: 'plaid',
    label: '格纹感',
    css: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 11px), repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 11px)',
  },
  {
    id: 'dots',
    label: '细点',
    css: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
  },
] as const

type PatternId = (typeof PATTERN_PRESETS)[number]['id']
type ImageProviderId = 'openai'
type ImageModelId = 'gpt-image-1' | 'gpt-image-1-mini'

const IMAGE_PROVIDER_OPTIONS = [
  { id: 'openai' as const, label: 'OpenAI 图像编辑' },
] as const

const IMAGE_MODEL_OPTIONS = [
  { id: 'gpt-image-1' as const, label: 'gpt-image-1', note: '质量优先，适合正式延伸稿' },
  { id: 'gpt-image-1-mini' as const, label: 'gpt-image-1-mini', note: '速度/成本优先，适合快速试款' },
] as const

type SemanticPromptProfile = {
  category: string[]
  styles: string[]
  silhouettes: string[]
  materials: string[]
  patterns: string[]
  accents: string[]
}

function buildSemanticPromptProfile(semantic?: FinderClusterSemantic | null): SemanticPromptProfile {
  if (!semantic) {
    return {
      category: [],
      styles: [],
      silhouettes: [],
      materials: [],
      patterns: [],
      accents: [],
    }
  }
  const groups = semantic.groups ?? {}
  return {
    category: groups.类目 ?? [],
    styles: groups.风格 ?? [],
    silhouettes: groups.版型 ?? [],
    materials: groups.材质 ?? [],
    patterns: groups.图案 ?? [],
    accents: semantic.labels
      .filter((item) => item.group === '图案' || item.group === '版型')
      .map((item) => item.label)
      .slice(0, 4),
  }
}

function joinPromptItems(items: string[], fallback: string): string {
  return items.length ? items.join(' / ') : fallback
}

/** 款式 / 面料 / 版型：优先用 Extension 上的延伸字段，否则用簇属性兜底 */
function resolveExtensionAxes(
  ext: Extension,
  productAttributes?: StyleCluster['attributes'],
  semantic?: FinderClusterSemantic | null,
): { styleLine: string; fabric: string; fit: string } {
  const pa = productAttributes
  const semanticProfile = buildSemanticPromptProfile(semantic)
  const fallbackStyle = [pa?.pattern, pa?.length].filter(Boolean).join(' · ') || '与原主图款式线一致'
  const fallbackFit = [pa?.neckline, pa?.length].filter(Boolean).join(' · ') || '与原主图版型结构一致'
  return {
    styleLine:
      ext.styleLine ??
      [
        joinPromptItems(semanticProfile.category, fallbackStyle),
        semanticProfile.styles.length ? `风格锚点 ${semanticProfile.styles.join(' / ')}` : null,
      ]
        .filter(Boolean)
        .join('；'),
    fabric:
      ext.fabric ??
      joinPromptItems(
        semanticProfile.materials,
        pa?.fabric ?? '与原图面料质感一致',
      ),
    fit:
      ext.fitSilhouette ??
      [
        joinPromptItems(semanticProfile.silhouettes, fallbackFit),
        semanticProfile.accents.length ? `细节维持 ${semanticProfile.accents.join(' / ')}` : null,
      ]
        .filter(Boolean)
        .join('；'),
  }
}

function buildImagePrompt(
  productName: string,
  ext: Extension,
  colorLabel: string,
  patternLabel: string,
  productAttributes: StyleCluster['attributes'] | undefined,
  semantic: FinderClusterSemantic | null | undefined,
  opts?: { subjectOnly?: boolean },
): string {
  const axes = resolveExtensionAxes(ext, productAttributes, semantic)
  const semanticProfile = buildSemanticPromptProfile(semantic)
  const strategyLine =
    ext.direction === 'A'
      ? `方向 A 只做色系延伸：保留 ${joinPromptItems(semanticProfile.category, '原类目')}、${joinPromptItems(semanticProfile.silhouettes, '原版型')} 与 ${joinPromptItems(semanticProfile.materials, '原材质')}，只替换服装主色为「${colorLabel}」。`
      : ext.direction === 'B'
        ? `方向 B 做图案/细节延伸：保留 ${joinPromptItems(semanticProfile.category, '原类目')} 与 ${joinPromptItems(semanticProfile.silhouettes, '原版型')}，在 ${joinPromptItems(semanticProfile.styles, '原风格')} 基础上把图案调整为「${patternLabel}」，并延续 ${joinPromptItems(semanticProfile.patterns, '原图案语义')}。`
        : `方向 C 做结构延伸：保持 ${joinPromptItems(semanticProfile.styles, '原风格')} 与 ${joinPromptItems(semanticProfile.materials, '原材质')}，优先调整 ${joinPromptItems(semanticProfile.silhouettes, '版型结构')}，使其形成新的版型实验稿。`
  const lines = [
    `电商服装主图，${productName}，`,
    `延伸方向${ext.direction}（${ext.description}）：${ext.change}。`,
    `爆款延伸三要素——【款式】${axes.styleLine}；【面料】${axes.fabric}；【版型】${axes.fit}。`,
    semantic
      ? `当前簇语义锚点：主类目「${semantic.primary}」，核心风格「${semantic.secondary}」，补充标签「${semantic.tags.slice(0, 4).join(' / ')}」。`
      : null,
    `已选视觉参考：主色调倾向「${colorLabel}」，图案参考「${patternLabel}」。`,
    strategyLine,
  ]
  if (opts?.subjectOnly) {
    lines.push(
      '【重要】仅修改服装主体（含模特身上的衣着）的颜色与图案；背景、展台、地面、墙面、道具保持原样不变，边缘与褶皱自然过渡。',
    )
  }
  lines.push('在上述款式/面料/版型约束下完成延伸，光线柔和，4:5 竖图，高清细节。')
  return lines.join('')
}

type LibraryKind = 'element' | 'fabric' | 'silhouette'
type GenerationKey = 'color' | 'pattern' | 'fitPrompt' | 'fitLibrary'
type GenerationEntry = {
  status: 'idle' | 'loading' | 'done' | 'error'
  imageDataUrl: string | null
  text: string
  error: string
}

function buildPromptModeFitText(
  productName: string,
  userPrompt: string,
  subjectOnly: boolean,
  semantic: FinderClusterSemantic | null | undefined,
): string {
  const semanticProfile = buildSemanticPromptProfile(semantic)
  const base = [
    `电商服装主图，${productName}。`,
    `【版型延伸 · 提示词改款】用户指令：${userPrompt.trim() || '（请填写要改的元素/面料/版型说明）'}`,
    semantic
      ? `该 cluster 的语义锚点为：${joinPromptItems(semanticProfile.category, '原类目')}；${joinPromptItems(semanticProfile.styles, '原风格')}；${joinPromptItems(semanticProfile.silhouettes, '原版型')}。`
      : null,
    '请在保持镜头、光线与背景不变的前提下，按指令调整服装的结构或材质表现；边缘与褶皱自然。',
  ]
  if (subjectOnly) {
    base.push(
      '【重要】仅修改识别出的服装/前景区域（蒙版内），背景、展台、道具保持像素级不变。',
    )
  } else {
    base.push('（未提供前景蒙版时模型可能改动整图，建议先完成分割。）')
  }
  base.push('输出 4:5 竖图，高清可放大审款。')
  return base.join('')
}

function buildLibraryImg2ImgPrompt(
  productName: string,
  picks: { element: DesignLibraryItem | null; fabric: DesignLibraryItem | null; silhouette: DesignLibraryItem | null },
  subjectOnly: boolean,
  semantic: FinderClusterSemantic | null | undefined,
): string {
  const labels = [picks.element?.label, picks.fabric?.label, picks.silhouette?.label].filter(Boolean) as string[]
  const tagLine = labels.length ? labels.join(' + ') : '请从元素库、面料库、版型库各选一个设计点'
  const semanticProfile = buildSemanticPromptProfile(semantic)
  const lines = [
    `电商服装主图，${productName}。`,
    `请基于以下设计点做图生图延伸：${tagLine}。`,
    semantic
      ? `延伸时请保持 ${joinPromptItems(semanticProfile.category, '原类目')} 与 ${joinPromptItems(semanticProfile.styles, '原风格')} 的识别度，并延续 ${joinPromptItems(semanticProfile.materials, '原材质')} 的质感。`
      : null,
    '保留商品主卖点与拍摄视角，只对服装主体做设计融合，不要改模特身份、背景、地面、陈列与构图。',
    '输出一张更适合上新测款的主图效果图，细节自然，不要拼贴感。',
  ]
  if (subjectOnly) {
    lines.push('【重要】仅允许在提供的服装前景蒙版内重绘，背景和非服装区域保持不变。')
  }
  return lines.join('')
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read blob as data url failed'))
    reader.readAsDataURL(blob)
  })
}

async function fetchImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas 2d unavailable')); return }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function GeneratedResultCard({
  entry,
  title,
}: {
  entry: GenerationEntry
  title: string
}) {
  if (entry.status === 'idle') return null
  return (
    <div className="mt-3 rounded-xl border border-border bg-card/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold">{title}</p>
        {entry.status === 'loading' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary">
            <Loader2 className="size-3 animate-spin" />
            AI 生成中
          </span>
        )}
      </div>
      {entry.status === 'done' && entry.imageDataUrl && (
        <div className="rounded-lg overflow-hidden border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.imageDataUrl} alt="" className="w-full h-auto object-contain" />
        </div>
      )}
      {entry.text && (
        <p className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{entry.text}</p>
      )}
      {entry.status === 'error' && (
        <p className="text-[10px] text-destructive leading-relaxed">{entry.error || 'AI 生成失败'}</p>
      )}
    </div>
  )
}

function DesignLibraryModal({
  open,
  title,
  items,
  initial,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  items: DesignLibraryItem[]
  initial: DesignLibraryItem | null
  onClose: () => void
  onConfirm: (item: DesignLibraryItem | null) => void
}) {
  const [draft, setDraft] = useState<DesignLibraryItem | null>(initial)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-label="关闭" onClick={onClose} />
      <div className="relative z-[1] w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDraft(item)}
                className={cn(
                  'rounded-lg overflow-hidden border-2 aspect-square transition-colors',
                  draft?.id === item.id ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/40',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {draft && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              已选：<span className="font-medium text-foreground">{draft.label}</span>
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

/** A 仅换色示意 · B 换色+图案 · C 换色+版型（剪影条） */
function previewForDirection(
  dir: Extension['direction'],
  userPatternId: PatternId,
): { patternId: PatternId; cropSuggest: boolean } {
  if (dir === 'A') return { patternId: 'none', cropSuggest: false }
  if (dir === 'B') return { patternId: userPatternId, cropSuggest: false }
  return { patternId: 'none', cropSuggest: true }
}

/** 未识别前景时：整图 CSS 叠色（与 object-cover 一致） */
function CssEffectFrame({
  src,
  colorTint,
  patternId,
  cropSuggest,
  label,
}: {
  src: string
  colorTint: string | null
  patternId: PatternId
  cropSuggest?: boolean
  label?: string
}) {
  const pat = PATTERN_PRESETS.find((p) => p.id === patternId) ?? PATTERN_PRESETS[0]
  return (
    <div
      className={cn(
        'relative w-full max-w-[220px] mx-auto aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted shadow-inner',
        cropSuggest && 'ring-2 ring-amber-400/40',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {colorTint && (
        <div
          className="absolute inset-0 mix-blend-color pointer-events-none"
          style={{ backgroundColor: colorTint }}
        />
      )}
      {pat.id !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.65]"
          style={{
            backgroundImage: pat.css,
            ...(pat.id === 'dots' ? { backgroundSize: '8px 8px' } : {}),
            mixBlendMode: 'multiply',
          }}
        />
      )}
      {cropSuggest && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent py-6 px-2">
          <p className="text-[9px] text-white text-center font-medium">版型延伸示意 · 实拍需纸样确认</p>
        </div>
      )}
      {label && (
        <div className="absolute top-2 left-2 rounded-md bg-black/55 text-white text-[9px] px-1.5 py-0.5 font-medium">
          {label}
        </div>
      )}
    </div>
  )
}

/** 已识别前景：canvas 按蒙版只改前景像素；失败时回退 CSS+mask */
function EffectFrame({
  src,
  colorTint,
  patternId,
  cropSuggest,
  label,
  maskDataUrl,
  maskActive,
}: {
  src: string
  colorTint: string | null
  patternId: PatternId
  cropSuggest?: boolean
  label?: string
  maskDataUrl: string | null
  maskActive: boolean
}) {
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null)
  const [canvasBusy, setCanvasBusy] = useState(false)

  useEffect(() => {
    if (!maskActive || !maskDataUrl) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setCanvasBusy(true)
      setCanvasUrl(null)
      void compositeMaskedStylePreview(
        src,
        maskDataUrl,
        colorTint,
        patternId as ExtensionPatternId,
        520,
      ).then((url) => {
        if (!cancelled) {
          setCanvasUrl(url)
          setCanvasBusy(false)
        }
      })
    }, 50)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [src, maskDataUrl, colorTint, patternId, maskActive])

  if (maskActive && maskDataUrl) {
    return (
      <div
        className={cn(
          'relative w-full max-w-[220px] mx-auto aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted shadow-inner',
          cropSuggest && 'ring-2 ring-amber-400/40',
        )}
      >
        {canvasBusy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
            <Loader2 className="size-7 text-primary animate-spin" />
          </div>
        )}
        {canvasUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={canvasUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          !canvasBusy && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-contain opacity-50" />
              <p className="absolute inset-x-0 bottom-8 text-center text-[9px] text-amber-900/90 px-1">
                前景预览合成失败（多为跨域图），可试下载主图后上传本地再识别
              </p>
            </>
          )
        )}
        {cropSuggest && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent py-6 px-2 pointer-events-none">
            <p className="text-[9px] text-white text-center font-medium">版型延伸示意 · 实拍需纸样确认</p>
          </div>
        )}
        {label && (
          <div className="absolute top-2 left-2 rounded-md bg-black/55 text-white text-[9px] px-1.5 py-0.5 font-medium z-[1]">
            {label}
          </div>
        )}
      </div>
    )
  }

  return (
    <CssEffectFrame
      src={src}
      colorTint={colorTint}
      patternId={patternId}
      cropSuggest={cropSuggest}
      label={label}
    />
  )
}

export function ExtensionDesignLab({
  baseImageUrl,
  productName,
  extensions,
  productAttributes,
  semantic,
}: {
  baseImageUrl: string
  productName: string
  extensions: Extension[]
  /** 当前簇/款的结构化属性，用于 Extension 未写全时的兜底，并展示在延伸维度区 */
  productAttributes?: StyleCluster['attributes']
  semantic?: FinderClusterSemantic | null
}) {
  const [studioTab, setStudioTab] = useState<'color' | 'pattern' | 'fit' | 'batch'>('color')
  const [colorId, setColorId] = useState<(typeof COLOR_PRESETS)[number]['id']>('navy')
  const [patternId, setPatternId] = useState<PatternId>('none')

  const [copied, setCopied] = useState<string | null>(null)

  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null)
  const [segmentStatus, setSegmentStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [segmentHint, setSegmentHint] = useState('')
  /** 关闭后换色/图案仍作用整图（旧行为，易误伤背景） */
  const [bypassMask, setBypassMask] = useState(false)
  /** 识别完成后：原图 × 蒙版 的透明底抠图预览（跨域失败时可能为空） */
  const [cutoutPreviewUrl, setCutoutPreviewUrl] = useState<string | null>(null)

  /** 版型延伸：提示词改款 vs 设计点库 + 图生图 */
  const [fitSubMode, setFitSubMode] = useState<'prompt' | 'library'>('prompt')
  const [fitPromptText, setFitPromptText] = useState('')
  const [libraryPicks, setLibraryPicks] = useState<{
    element: DesignLibraryItem | null
    fabric: DesignLibraryItem | null
    silhouette: DesignLibraryItem | null
  }>({ element: null, fabric: null, silhouette: null })
  const [libraryModal, setLibraryModal] = useState<LibraryKind | null>(null)
  const [generations, setGenerations] = useState<Record<GenerationKey, GenerationEntry>>({
    color: { status: 'idle', imageDataUrl: null, text: '', error: '' },
    pattern: { status: 'idle', imageDataUrl: null, text: '', error: '' },
    fitPrompt: { status: 'idle', imageDataUrl: null, text: '', error: '' },
    fitLibrary: { status: 'idle', imageDataUrl: null, text: '', error: '' },
  })
  const [imageProvider, setImageProvider] = useState<ImageProviderId>('openai')
  const [imageModel, setImageModel] = useState<ImageModelId>('gpt-image-1')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('openai-api-key')
    if (saved) setApiKey(saved)
  }, [])

  const handleApiKeyChange = useCallback((value: string) => {
    setApiKey(value)
    if (value) {
      localStorage.setItem('openai-api-key', value)
    } else {
      localStorage.removeItem('openai-api-key')
    }
  }, [])

  useEffect(() => {
    setMaskDataUrl(null)
    setSegmentStatus('idle')
    setSegmentHint('')
    setBypassMask(false)
    setCutoutPreviewUrl(null)
    setGenerations({
      color: { status: 'idle', imageDataUrl: null, text: '', error: '' },
      pattern: { status: 'idle', imageDataUrl: null, text: '', error: '' },
      fitPrompt: { status: 'idle', imageDataUrl: null, text: '', error: '' },
      fitLibrary: { status: 'idle', imageDataUrl: null, text: '', error: '' },
    })
  }, [baseImageUrl])

  useEffect(() => {
    if (!maskDataUrl) {
      setCutoutPreviewUrl(null)
      return
    }
    let cancelled = false
    void buildForegroundCutoutDataUrl(baseImageUrl, maskDataUrl).then((url) => {
      if (!cancelled) setCutoutPreviewUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [baseImageUrl, maskDataUrl])

  const runForegroundSegment = useCallback(async () => {
    setSegmentStatus('loading')
    setSegmentHint('加载分割模型与权重（首次约数十 MB，请稍候）…')
    setMaskDataUrl(null)
    const mask = await buildForegroundMaskDataUrl(baseImageUrl, (key, cur, tot) => {
      setSegmentHint(`${key} ${cur}/${tot}`)
    })
    if (mask) {
      setMaskDataUrl(mask)
      setSegmentStatus('ready')
      setSegmentHint('已识别前景；换色/图案仅作用蒙版区域（含模特衣着）。')
    } else {
      setSegmentStatus('error')
      setSegmentHint('分割失败（可检查图片跨域或稍后重试）。可开启「整图模式」临时预览。')
    }
  }, [baseImageUrl])

  const maskActive = Boolean(maskDataUrl) && !bypassMask
  const promptSubjectOnly = maskActive

  const colorTint = COLOR_PRESETS.find((c) => c.id === colorId)?.tint ?? null
  const colorLabel = COLOR_PRESETS.find((c) => c.id === colorId)?.label ?? ''
  const patternLabel = PATTERN_PRESETS.find((p) => p.id === patternId)?.label ?? '无'

  const copyPrompt = useCallback(
    (key: string, text: string) => {
      void navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    },
    [],
  )

  const extByDir = (dir: Extension['direction']) => extensions.find((e) => e.direction === dir)

  const copyAllExtensionPrompts = useCallback(() => {
    const blocks = extensions.map((ext) =>
      buildImagePrompt(
        productName,
        ext,
        colorLabel,
        ext.direction === 'B' ? patternLabel : '无',
        productAttributes,
        semantic,
        { subjectOnly: promptSubjectOnly },
      ),
    )
    void navigator.clipboard.writeText(blocks.join('\n\n———\n\n'))
    setCopied('all-ext')
    setTimeout(() => setCopied(null), 2000)
  }, [extensions, productName, colorLabel, patternLabel, productAttributes, semantic, promptSubjectOnly])

  const runAiImage = useCallback(
    async (
      key: GenerationKey,
      prompt: string,
      referenceImages: Array<{ label: string; imageUrl?: string; imageDataUrl?: string }> = [],
    ) => {
      setGenerations((prev) => ({
        ...prev,
        [key]: { status: 'loading', imageDataUrl: null, text: '', error: '' },
      }))
      try {
        // Always convert to PNG data URL to avoid AVIF/WebP format rejection by OpenAI
        const sourceImageDataUrl = await fetchImageAsDataUrl(baseImageUrl)
        const res = await fetch('/api/fashion-image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'image_edit',
            prompt,
            sourceImageDataUrl,
            maskImageDataUrl: maskActive ? maskDataUrl : undefined,
            referenceImages,
            provider: imageProvider,
            model: imageModel,
            apiKey: apiKey || undefined,
          }),
        })
        const data = (await res.json()) as {
          ok?: boolean
          imageDataUrl?: string
          text?: string
          error?: string
        }
        if (!data.ok || !data.imageDataUrl) {
          throw new Error(data.error || '图像编辑接口未返回图片')
        }
        setGenerations((prev) => ({
          ...prev,
          [key]: {
            status: 'done',
            imageDataUrl: data.imageDataUrl ?? null,
            text: data.text ?? '',
            error: '',
          },
        }))
      } catch (e) {
        setGenerations((prev) => ({
          ...prev,
          [key]: {
            status: 'error',
            imageDataUrl: null,
            text: '',
            error: e instanceof Error ? e.message : String(e),
          },
        }))
      }
    },
    [baseImageUrl, imageModel, imageProvider, maskActive, maskDataUrl, apiKey],
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-[13px] text-blue-950 leading-relaxed space-y-2">
        <p>
          <strong className="font-semibold">和独立站不一样：</strong>
          很多淘宝中小商家<strong>直接跟爆款上架</strong>，不做「先延伸再打样」。延伸设计更适合<strong>已有稳定厂、想加 SKU 测色/测图案</strong>的卖家。
        </p>
        <p className="text-blue-900/90">
          下面工具是<strong>一键出「效果图 Demo」</strong>：先用<strong>浏览器端轻量前景分割</strong>抠出主体，再在「换色 / 换图案」里用
          <strong> canvas 按蒙版改像素</strong>
          ，背景保持不动；<strong>版型延伸</strong>支持<strong>提示词改款</strong>与<strong>设计点库（元素/面料/版型）→ 图生图</strong>两路，并直接调用
          <strong> OpenAI 图像编辑 API </strong>
          返回效果图。
          <strong>批量汇总</strong>可一次复制 A/B/C 文案。
        </p>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Scan className="size-4 text-amber-800 shrink-0" />
          <span className="text-xs font-semibold text-amber-950">第一步：识别服装/前景区域</span>
        </div>
        <p className="text-[11px] text-amber-950/85 leading-relaxed">
          未分割时换色会铺满整图（背景也会变色）。点击按钮在本地推理，不上传服务器；首次会下载 ONNX 权重。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={segmentStatus === 'loading'}
            onClick={runForegroundSegment}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-900 text-amber-50 text-xs font-medium hover:bg-amber-800 disabled:opacity-50"
          >
            {segmentStatus === 'loading' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Scan className="size-3.5" />
            )}
            {segmentStatus === 'ready' ? '重新识别' : '识别服装/前景'}
          </button>
          <label className="inline-flex items-center gap-2 text-[11px] text-amber-950 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bypassMask}
              onChange={(e) => setBypassMask(e.target.checked)}
              className="rounded border-amber-400"
            />
            整图模式（含背景，不推荐）
          </label>
          {segmentHint && (
            <span className="text-[10px] text-amber-900/80 flex-1 min-w-[140px]">{segmentHint}</span>
          )}
        </div>

        {segmentStatus === 'ready' && maskDataUrl && (
          <div className="rounded-lg border border-amber-200/90 bg-white/70 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-amber-950">识别结果预览</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="shrink-0 space-y-1">
                <p className="text-[9px] text-amber-900/75">蒙版预览（不透明处=换色/图案作用区）</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={maskDataUrl}
                  alt=""
                  className="w-[min(100%,160px)] h-auto max-h-44 rounded-md border border-amber-200/80 object-contain bg-zinc-900"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[9px] text-amber-900/75">服装 / 前景抠图（透明底）</p>
                <div
                  className="rounded-md border border-amber-200/80 overflow-hidden min-h-[120px] flex items-center justify-center"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {cutoutPreviewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cutoutPreviewUrl}
                      alt=""
                      className="max-h-52 w-full object-contain"
                    />
                  ) : (
                    <p className="text-[9px] text-amber-900/60 px-3 py-4 text-center leading-relaxed">
                      原图若来自外链且未允许跨域，浏览器无法合成透明底预览；换色仍可按左侧蒙版约束作用区域。
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold">真实出图后端</p>
            <p className="text-[10px] text-muted-foreground">
              当前 provider/model 会用于换色、换图案、提示词改款、设计点库图生图四类真实出图请求。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={imageProvider}
              onChange={(e) => setImageProvider(e.target.value as ImageProviderId)}
              className="text-[11px] rounded-lg border border-border bg-background px-2.5 py-2 min-w-[148px]"
            >
              {IMAGE_PROVIDER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as ImageModelId)}
              className="text-[11px] rounded-lg border border-border bg-background px-2.5 py-2 min-w-[168px]"
            >
              {IMAGE_MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          当前模型：<span className="font-medium text-foreground">{imageModel}</span> ·{' '}
          {IMAGE_MODEL_OPTIONS.find((item) => item.id === imageModel)?.note}
        </p>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <Key className="size-3" />
            OpenAI API Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className="w-full text-[11px] rounded-lg border border-border bg-background px-2.5 py-2 pr-8 font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Key 仅存在浏览器本地，不会上传存储。用于调用 OpenAI 图像编辑 API 生成效果图。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold">爆款延伸三要素（写入各方向生图提示词）</p>
        {productAttributes && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            本款簇属性参考：领型 {productAttributes.neckline} · 面料 {productAttributes.fabric} · 长度{' '}
            {productAttributes.length} · 图案 {productAttributes.pattern} · 季节 {productAttributes.season}
          </p>
        )}
        {semantic && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-semibold text-primary">当前 cluster 语义锚点</p>
            <p className="text-[10px] text-foreground">
              {semantic.generatedClusterName} · 主类目 {semantic.primary} · 核心 {semantic.secondary}
            </p>
            <div className="flex flex-wrap gap-1">
              {semantic.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-primary border border-primary/15">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[10px] text-left">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground">
                <th className="p-2 font-medium w-10">向</th>
                <th className="p-2 font-medium">款式</th>
                <th className="p-2 font-medium">面料</th>
                <th className="p-2 font-medium">版型</th>
              </tr>
            </thead>
            <tbody>
              {extensions.map((ex) => {
                const ax = resolveExtensionAxes(ex, productAttributes)
                return (
                  <tr key={ex.direction} className="border-b border-border last:border-0 align-top">
                    <td className="p-2 font-bold text-primary">{ex.direction}</td>
                    <td className="p-2 text-foreground/90 leading-snug">{ax.styleLine}</td>
                    <td className="p-2 text-foreground/90 leading-snug">{ax.fabric}</td>
                    <td className="p-2 text-foreground/90 leading-snug">{ax.fit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/40 border border-border">
        {(
          [
            { id: 'color' as const, label: '换色', Icon: Palette },
            { id: 'pattern' as const, label: '换图案', Icon: Layers },
            { id: 'fit' as const, label: '版型延伸', Icon: LayoutTemplate },
            { id: 'batch' as const, label: '批量汇总', Icon: ClipboardList },
          ]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStudioTab(id)}
            className={cn(
              'flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              studioTab === id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {studioTab === 'color' && (
        <div className="grid sm:grid-cols-2 gap-6 rounded-xl border border-border bg-card p-5">
          <div>
            <p className="text-xs font-semibold mb-3">主色倾向（点击切换，右侧实时预览）</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    colorId === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              Demo 使用颜色混合模拟「换色打样」沟通稿；与真实染缸色差无关，仅作选款会展示。
              {maskActive
                ? ' 已识别前景时由 canvas 按蒙版只改服装/主体像素，背景保持原图。'
                : ' 请先完成上方「识别服装/前景」，否则只能整图叠色（易误伤背景）。'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-3">预览</p>
            <EffectFrame
              src={baseImageUrl}
              colorTint={colorTint}
              patternId="none"
              label={`换色 · ${colorLabel}`}
              maskDataUrl={maskDataUrl}
              maskActive={maskActive}
            />
            <button
              type="button"
              onClick={() =>
                void runAiImage(
                  'color',
                  buildImagePrompt(
                    productName,
                    extByDir('A') ?? extensions[0],
                    colorLabel,
                    '无',
                    productAttributes,
                    semantic,
                    { subjectOnly: promptSubjectOnly },
                  ),
                )
              }
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              {generations.color.status === 'loading' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              AI 生成「换色」效果图
            </button>
            <GeneratedResultCard entry={generations.color} title="AI 换色结果" />
          </div>
        </div>
      )}

      {studioTab === 'pattern' && (
        <div className="grid sm:grid-cols-2 gap-6 rounded-xl border border-border bg-card p-5">
          <div>
            <p className="text-xs font-semibold mb-3">图案层次（叠加纹理，模拟换印花沟通）</p>
            <div className="flex flex-wrap gap-2">
              {PATTERN_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPatternId(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    patternId === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              条纹/格纹为像素级明暗示意（仅作用识别出的前景）；真换图案仍需工厂开版或 AI 重绘出图。
              {!maskActive ? ' 未识别前景时图案会叠在整张图上。' : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-3">预览（保留当前主色叠色）</p>
            <EffectFrame
              src={baseImageUrl}
              colorTint={colorTint}
              patternId={patternId}
              label={`图案 · ${patternLabel}`}
              maskDataUrl={maskDataUrl}
              maskActive={maskActive}
            />
            <button
              type="button"
              onClick={() =>
                void runAiImage(
                  'pattern',
                  buildImagePrompt(
                    productName,
                    extByDir('B') ?? extensions[1] ?? extensions[0],
                    colorLabel,
                    patternLabel,
                    productAttributes,
                    semantic,
                    { subjectOnly: promptSubjectOnly },
                  ),
                )
              }
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              {generations.pattern.status === 'loading' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              AI 生成「换图案」效果图
            </button>
            <GeneratedResultCard entry={generations.pattern} title="AI 换图案结果" />
          </div>
        </div>
      )}

      {studioTab === 'fit' && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/50 border border-border">
            <button
              type="button"
              onClick={() => setFitSubMode('prompt')}
              className={cn(
                'flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                fitSubMode === 'prompt' ? 'bg-card shadow-sm border border-border text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MessageSquare className="size-3.5 shrink-0" />
              提示词改款
            </button>
            <button
              type="button"
              onClick={() => setFitSubMode('library')}
              className={cn(
                'flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                fitSubMode === 'library' ? 'bg-card shadow-sm border border-border text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Library className="size-3.5 shrink-0" />
              设计点库 · 图生图
            </button>
          </div>

          {fitSubMode === 'prompt' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">路径一</strong>：用自然语言说明要改<strong>元素 / 面料 / 版型</strong>中的哪一项或组合（例如「把腰头改成双扣」「换成粗斜纹牛仔布」「裙长加长 8cm 仍 A 字」）。
                  点击下方按钮后会直接把原图和改款说明送到图像编辑模型；已识别前景时会附带「仅改蒙版内服装」约束。
                </p>
                <label className="block text-[10px] font-medium text-muted-foreground">改款说明（prompt）</label>
                <textarea
                  value={fitPromptText}
                  onChange={(e) => setFitPromptText(e.target.value)}
                  rows={6}
                  placeholder="例：保留上衣，仅将半裙改为围裹式迷你长度，腰部加本布系带；背景与模特姿态不变。"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[120px]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['加蝴蝶结系带', '换灯芯绒面料', '改 A 字中长版型', '门襟改拉链'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFitPromptText((t) => (t ? `${t}；${chip}` : chip))}
                      className="px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void runAiImage(
                      'fitPrompt',
                      buildPromptModeFitText(productName, fitPromptText, promptSubjectOnly, semantic),
                    )
                  }
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                >
                  {generations.fitPrompt.status === 'loading' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  AI 生成「提示词改款」效果图
                </button>
                <GeneratedResultCard entry={generations.fitPrompt} title="AI 提示词改款结果" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold">示意预览（仍为 canvas Demo）</p>
                <p className="text-[10px] text-muted-foreground">
                  真实改款需走图生图 API；此处沿用方向 C 的版型剪影条仅作沟通占位。
                </p>
                <div className="flex justify-center pt-2">
                  <EffectFrame
                    src={baseImageUrl}
                    colorTint={colorTint}
                    patternId="none"
                    cropSuggest
                    label="版型延伸 · 提示词"
                    maskDataUrl={maskDataUrl}
                    maskActive={maskActive}
                  />
                </div>
              </div>
            </div>
          )}

          {fitSubMode === 'library' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">路径二</strong>：参考延伸设计引擎的<strong>元素库 / 面料库 / 版型库</strong>，各选一张参考图（共最多 3 张），组合成设计点标签，再调<strong>图生图</strong>把设计点融到当前主图上。
                现在会把原图、前景蒙版和多张参考图一起发给图像编辑模型，只重绘服装区域，避免背景被洗稿。
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { kind: 'element' as const, label: '元素库', pick: libraryPicks.element },
                    { kind: 'fabric' as const, label: '面料库', pick: libraryPicks.fabric },
                    { kind: 'silhouette' as const, label: '版型库', pick: libraryPicks.silhouette },
                  ]
                ).map(({ kind, label, pick }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setLibraryModal(kind)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-left transition-colors"
                  >
                    {pick ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={pick.thumb} alt="" className="size-10 rounded-md object-cover border border-border" />
                    ) : (
                      <span className="size-10 rounded-md bg-muted border border-dashed border-border shrink-0" />
                    )}
                    <span className="text-xs font-medium">
                      {label}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {pick ? pick.label : '点击选择'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <p className="text-[10px] font-semibold text-primary mb-1">组合标签（写入图生图 prompt 前缀）</p>
                <p className="text-sm font-medium text-foreground">
                  {(() => {
                    const labels = [
                      libraryPicks.element?.label,
                      libraryPicks.fabric?.label,
                      libraryPicks.silhouette?.label,
                    ].filter(Boolean) as string[]
                    return labels.length ? `+ ${labels.join(' + ')}` : '尚未选择设计点'
                  })()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void runAiImage(
                      'fitLibrary',
                      buildLibraryImg2ImgPrompt(productName, libraryPicks, promptSubjectOnly, semantic),
                      [
                        libraryPicks.element
                          ? { label: '元素参考图', imageUrl: libraryPicks.element.thumb }
                          : null,
                        libraryPicks.fabric
                          ? { label: '面料参考图', imageUrl: libraryPicks.fabric.thumb }
                          : null,
                        libraryPicks.silhouette
                          ? { label: '版型参考图', imageUrl: libraryPicks.silhouette.thumb }
                          : null,
                      ].filter(Boolean) as Array<{ label: string; imageUrl?: string; imageDataUrl?: string }>,
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                >
                  {generations.fitLibrary.status === 'loading' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  AI 生成设计点库图生图
                </button>
                <p className="text-[10px] text-muted-foreground self-center max-w-md">
                  现在会直接把原图、前景蒙版和三库参考图一起发到图像编辑模型；如没做前景分割，模型仍可能轻微改到背景。
                </p>
              </div>
              <GeneratedResultCard entry={generations.fitLibrary} title="AI 设计点库图生图结果" />
              <div className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">延伸方向 A/B/C（文案仍可对齐测款表）</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {extensions.map((ext) => {
                    const pv = previewForDirection(ext.direction, patternId)
                    const patLabel = ext.direction === 'B' ? patternLabel : '无'
                    return (
                      <div key={ext.direction} className="rounded-lg border border-border bg-card/80 p-2 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-primary">方向 {ext.direction}</span>
                          <RiskBadge risk={ext.risk} />
                        </div>
                        <div className="flex justify-center py-2">
                          <EffectFrame
                            src={baseImageUrl}
                            colorTint={colorTint}
                            patternId={pv.patternId}
                            cropSuggest={pv.cropSuggest}
                            label={ext.direction}
                            maskDataUrl={maskDataUrl}
                            maskActive={maskActive}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyPrompt(
                              `ext-${ext.direction}`,
                              buildImagePrompt(
                                productName,
                                ext,
                                colorLabel,
                                patLabel,
                                productAttributes,
                                semantic,
                                { subjectOnly: promptSubjectOnly },
                              ),
                            )
                          }
                          className="mt-1 w-full py-1.5 rounded-md border border-border text-[10px] font-medium hover:bg-muted"
                        >
                          {copied === `ext-${ext.direction}` ? '已复制' : '复制该方向提示词'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {libraryModal && (
            <DesignLibraryModal
              open
              title={libraryModal === 'element' ? '元素库' : libraryModal === 'fabric' ? '面料库' : '版型库'}
              items={
                libraryModal === 'element'
                  ? ELEMENT_LIBRARY
                  : libraryModal === 'fabric'
                    ? FABRIC_LIBRARY
                    : SILHOUETTE_LIBRARY
              }
              initial={libraryPicks[libraryModal]}
              onClose={() => setLibraryModal(null)}
              onConfirm={(item) => {
                setLibraryPicks((p) => ({ ...p, [libraryModal]: item }))
                setLibraryModal(null)
              }}
            />
          )}
        </div>
      )}

      {studioTab === 'batch' && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            下方三张缩略图实时跟随当前「换色 / 换图案」与延伸方向 A/B/C 示意；<strong className="text-foreground">版型延伸</strong>
            页的<strong>提示词改款 / 设计点库图生图</strong>请在该 Tab 内操作。此处用于开会一次性打包文案。
          </p>
          <button
            type="button"
            onClick={copyAllExtensionPrompts}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {copied === 'all-ext' ? <Check className="size-4" /> : <ClipboardList className="size-4" />}
            一键复制 A+B+C 三份生图提示词
          </button>
          <div className="grid sm:grid-cols-3 gap-4">
            {extensions.map((ext) => {
              const pv = previewForDirection(ext.direction, patternId)
              return (
                <div key={ext.direction} className="rounded-xl border border-border bg-muted/15 p-3 flex flex-col items-center">
                  <span className="text-[10px] font-semibold text-muted-foreground mb-2">方向 {ext.direction}</span>
                  <EffectFrame
                    src={baseImageUrl}
                    colorTint={colorTint}
                    patternId={pv.patternId}
                    cropSuggest={pv.cropSuggest}
                    label={ext.direction}
                    maskDataUrl={maskDataUrl}
                    maskActive={maskActive}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Upload className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">供应商名单（可选，非跟款刚需）</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              若你维护签约工厂/档口表，后续可 CSV 导入，在延伸款上自动筛「能做针织/能做印花」的供应商并推送询价单。
              不做导入也不影响主路径：多数商家直接用 1688 以图搜 + 寄样。
            </p>
            <button
              type="button"
              disabled
              className="mt-3 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground cursor-not-allowed"
            >
              导入供应商 CSV（即将支持）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
