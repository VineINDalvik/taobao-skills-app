'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { usePipelineStore } from '@/lib/store'
import { SkillHeader, SectionTitle, AlertBox } from '@/components/shared/SkillLayout'
import { CopyButton } from '@/components/shared/CopyButton'
import { LoadingSteps } from '@/components/shared/LoadingSteps'
import { ModelInsightPanel } from '@/components/shared/ModelInsightPanel'
import { ExportButton } from '@/components/shared/ExportButton'
import { DataFlowHint, CaseStudyBanner } from '@/components/shared/DataFlowHint'
import { MODEL_INSIGHTS } from '@/lib/model-insights'
import {
  ArrowRight, Zap, Upload, CheckCircle2, Camera, Sun, Frame, Package, User, Plus, TrendingUp, Send,
  LayoutGrid, Type, Image as ImageIconLucide, Cpu, BarChart3, Lightbulb,
} from 'lucide-react'
import { ScoringTab } from './ScoringTab'
import { SmartOptimizePipeline } from './SmartOptimizePipeline'
import { SkillWorkspaceShell, type SkillShellTab } from '@/components/shared/SkillWorkspaceShell'
import { cn } from '@/lib/utils'
import type { MainImagePlan } from '@/lib/types'

type PageState = 'idle' | 'loading' | 'done'
type MaterialStatus = 'pending' | 'shooting' | 'done' | 'testing'

const STATUS_CONFIG: Record<MaterialStatus, { label: string; color: string; next: MaterialStatus }> = {
  pending:  { label: '待拍摄',  color: 'bg-zinc-100 text-zinc-500 border-zinc-200',   next: 'shooting' },
  shooting: { label: '拍摄中',  color: 'bg-blue-100 text-blue-600 border-blue-200',   next: 'done' },
  done:     { label: '已完成',  color: 'bg-green-100 text-green-600 border-green-200', next: 'testing' },
  testing:  { label: '测试中',  color: 'bg-purple-100 text-purple-600 border-purple-200', next: 'pending' },
}

// Photography briefs per slot — concrete specs for the photographer
const PHOTO_BRIEFS = [
  {
    scene: '白底棚拍',
    lighting: '正面柔光箱，消除阴影',
    composition: '模特正面站立，服装占画面 70%，三分法',
    props: '无道具',
    model: '165cm，M 码，正常上身',
    ctrBoost: '+18%',
    priority: 'P0',
  },
  {
    scene: '局部特写（棚内）',
    lighting: '侧光打出面料质感，强化纹理',
    composition: '领口 + 腰部收褶，2:1 竖版裁切',
    props: '无，突出面料本身',
    model: '只需上半身，不需要完整全身',
    ctrBoost: '+11%',
    priority: 'P1',
  },
  {
    scene: '多尺码对比（棚内）',
    lighting: '均匀补光，无明显阴影',
    composition: '三位模特并排，清晰标注 S/M/L 尺码',
    props: '透明尺码标签或标注贴纸',
    model: 'S/M/L 三码各一位，身高统一 165cm',
    ctrBoost: '+9%',
    priority: 'P1',
  },
  {
    scene: '户外街拍',
    lighting: '自然光，上午 10–11 点最佳，顺光或侧光',
    composition: '全身街拍，背景虚化，展示真实穿着效果',
    props: '手提包 + 咖啡杯，营造通勤感',
    model: '165cm M 码，妆容自然，氛围感造型',
    ctrBoost: '+15%',
    priority: 'P0',
  },
  {
    scene: '促销图（设计合成）',
    lighting: '品牌底色背景，设计师后期合成',
    composition: '服装居中悬挂/平铺 + 右侧大字文案',
    props: '无需道具，纯品牌色背景',
    model: '不需要模特，纯商品图即可',
    ctrBoost: '+7%',
    priority: 'P2',
  },
]

// Reference images per slot
const REF_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop',
]

function buildPhotoBriefText(plan: MainImagePlan, brief: typeof PHOTO_BRIEFS[0]): string {
  return `【拍摄简报 — 主图${plan.index}：${plan.role}】
场景：${brief.scene}
光线：${brief.lighting}
构图：${brief.composition}
道具：${brief.props}
模特要求：${brief.model}
图上文字：${plan.copyText}
背景：${plan.bgStyle}
优先级：${brief.priority}（CTR 预计提升 ${brief.ctrBoost}）`
}

function MaterialCard({
  plan, brief, refImage, status, onStatusChange,
}: {
  plan: MainImagePlan
  brief: typeof PHOTO_BRIEFS[0]
  refImage: string
  status: MaterialStatus
  onStatusChange: (s: MaterialStatus) => void
}) {
  const [copied, setCopied] = useState(false)
  const cfg = STATUS_CONFIG[status]

  const handleCopyBrief = async () => {
    await navigator.clipboard.writeText(buildPhotoBriefText(plan, brief))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden transition-all',
      status === 'done' ? 'border-green-200' :
      status === 'testing' ? 'border-purple-200' :
      status === 'shooting' ? 'border-blue-200' :
      'border-border'
    )}>
      {/* Reference image */}
      <div className="relative h-44 bg-muted">
        <Image src={refImage} alt={plan.role} fill className="object-cover opacity-65" sizes="300px" />
        {/* Slot number */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
          {plan.index}
        </div>
        {/* Priority badge */}
        <div className={cn(
          'absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold border',
          brief.priority === 'P0' ? 'bg-red-500/90 text-white border-red-600' :
          brief.priority === 'P1' ? 'bg-amber-500/90 text-white border-amber-600' :
          'bg-zinc-500/90 text-white border-zinc-600'
        )}>{brief.priority}</div>
        {/* CTR boost */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60">
          <TrendingUp className="size-2.5 text-green-400" />
          <span className="text-[9px] text-green-300 font-medium">CTR {brief.ctrBoost}</span>
        </div>
        {/* Copy text overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
          <p className="text-white text-[10px] font-medium leading-tight">{plan.copyText}</p>
        </div>
      </div>

      {/* Role title + status */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-[11px] font-semibold truncate flex-1">{plan.role}</p>
        <button
          onClick={() => onStatusChange(cfg.next)}
          className={cn('shrink-0 ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors hover:opacity-80', cfg.color)}
        >
          {cfg.label}
        </button>
      </div>

      {/* Photography brief */}
      <div className="px-3 py-2.5 space-y-1.5">
        {[
          { Icon: Frame,   label: '构图', value: plan.compositionGuide },
          { Icon: Sun,     label: '光线', value: brief.lighting },
          { Icon: Camera,  label: '场景', value: brief.scene },
          { Icon: Package, label: '道具', value: brief.props },
          { Icon: User,    label: '模特', value: brief.model },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-1.5">
            <Icon className="size-3 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex items-start gap-1 min-w-0">
              <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 w-6">{label}</span>
              <span className="text-[10px] text-foreground leading-tight">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-1.5">
        <button
          onClick={handleCopyBrief}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors"
        >
          {copied ? <CheckCircle2 className="size-3" /> : <Send className="size-3" />}
          {copied ? '已复制' : '复制拍摄单'}
        </button>
        {status !== 'done' && (
          <button
            onClick={() => onStatusChange('done')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 text-[10px] font-medium hover:bg-green-50 transition-colors"
          >
            <CheckCircle2 className="size-3" />
            完成
          </button>
        )}
        {status === 'done' && (
          <button
            onClick={() => onStatusChange('testing')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-[10px] font-medium hover:bg-purple-50 transition-colors"
          >
            上线测试
          </button>
        )}
      </div>
    </div>
  )
}

const TITLE_CTR_ESTIMATES = [
  { tag: 'SEO', hint: '商品标题栏', ctr: '+22%', channel: '淘宝搜索' },
  { tag: '种草', hint: '短视频/笔记', ctr: '+31%', channel: '小红书/抖音' },
  { tag: '大促', hint: '活动/直播间', ctr: '+19%', channel: '站内活动' },
]

const KW_BID = ['1.2', '0.9', '1.0', '0.8', '0.7']

const LISTING_TABS_PRIMARY: SkillShellTab[] = [
  { id: 'workbench', label: '待办清单', short: '待办', icon: LayoutGrid },
  { id: 'content', label: '标题·详情·SKU', short: '文案', icon: Type },
  { id: 'visual', label: 'AI改图·拍摄简报', short: '图片', icon: ImageIconLucide },
  { id: 'scoring', label: '图片诊断', short: '诊断', icon: BarChart3 },
]
const LISTING_TABS_REF: SkillShellTab[] = [
  { id: 'reference', label: '模型与案例', short: '说明', icon: Cpu },
]

export default function ListingPage() {
  const router = useRouter()
  const { skill2, skill4, selectedStyle, runSkill2, productInput } = usePipelineStore()
  const [pageState, setPageState] = useState<PageState>(skill2 ? 'done' : 'idle')
  const [imageStatuses, setImageStatuses] = useState<MaterialStatus[]>(['pending', 'pending', 'pending', 'pending', 'pending'])
  const [addedKws, setAddedKws] = useState<Set<number>>(new Set())
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [topTab, setTopTab] = useState<string>('workbench')

  const insight = MODEL_INSIGHTS[2]
  const productName = selectedStyle?.name ?? productInput.category

  const doneCount = imageStatuses.filter(s => s === 'done' || s === 'testing').length
  const setStatus = (i: number, s: MaterialStatus) =>
    setImageStatuses(prev => prev.map((v, idx) => idx === i ? s : v))

  if (pageState === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="📝" title="上架优化" subtitle="标题优化 · 主图拍摄简报 · 详情页文案 · SKU 建议" />
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 mb-6">
          <div className="flex items-start gap-3">
            <Upload className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">上传供应商实拍图（可选）</p>
              <p className="text-xs text-muted-foreground mb-3">
                上传 1–3 张供应商提供的商品实拍图，AI 基于图片内容生成更精准的拍摄简报
              </p>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors">
                <Upload className="size-3" />
                选择图片（JPG/PNG，最多 3 张）
              </button>
              <span className="ml-2 text-[10px] text-muted-foreground">Demo 模式</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-base font-medium mb-2">为「{productName}」生成完整上架包</h2>
          <p className="text-sm text-muted-foreground mb-2">
            通义千问 qwen-max · 标题×3 · 5 张主图拍摄简报 · 详情页文案
          </p>
          {skill4 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 mb-4">
              <CheckCircle2 className="size-3.5" />
              已融合 Skill 4 好评关键词：{skill4.goodKeywords.slice(0, 3).join('、')}
            </div>
          )}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setPageState('loading')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Zap className="size-4" />
              生成上架方案
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkillHeader icon="📝" title="上架优化" subtitle="标题优化 · 主图拍摄简报 · 详情页文案 · SKU 建议" />
        <LoadingSteps steps={insight.steps} onComplete={() => { runSkill2(); setPageState('done') }} />
      </div>
    )
  }

  if (!skill2) return null
  const { titles, mainImagePlan, detailCopy, skuSuggestion, keywords } = skill2

  const listingHint =
    topTab === 'workbench' ? (
      <span>看看整体进度，按照清单一步步操作</span>
    ) : topTab === 'content' ? (
      <span>复制标题、详情文案、SKU 和关键词，粘贴到千牛后台</span>
    ) : topTab === 'visual' ? (
      <span>上传商品图让 AI 帮你优化，或查看拍摄简报发给摄影师</span>
    ) : topTab === 'scoring' ? (
      <span>看看你的图能打多少分，哪里可以改进</span>
    ) : (
      <span>了解背后的数据逻辑和成功案例</span>
    )

  return (
    <SkillWorkspaceShell
      header={
        <SkillHeader icon="📝" title="上架优化" subtitle="标题优化 · 主图拍摄简报 · 详情页文案 · SKU 建议">
          <div className="flex items-center gap-2">
            <ExportButton skillLabel="上架优化" data={skill2} />
            <button
              type="button"
              onClick={() => setPageState('idle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              重新生成
            </button>
          </div>
        </SkillHeader>
      }
      primaryTabs={LISTING_TABS_PRIMARY}
      referenceTabs={LISTING_TABS_REF}
      activeTab={topTab}
      onTabChange={setTopTab}
      hint={listingHint}
    >
      {topTab === 'visual' && (
      <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle className="mb-0">AI 帮你改图</SectionTitle>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">找问题 → 看原因 → 选方案 → 出新图</span>
        </div>
        <SmartOptimizePipeline
          uploadedUrl={uploadedUrl}
          onUploadedUrlChange={setUploadedUrl}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle className="mb-0">② 主图拍摄简报（{mainImagePlan.length} 张）</SectionTitle>
          {/* Progress tracker */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {imageStatuses.map((s, i) => (
                <div key={i} className={cn(
                  'w-2 h-2 rounded-full',
                  s === 'done' || s === 'testing' ? 'bg-green-500' :
                  s === 'shooting' ? 'bg-blue-400' : 'bg-muted-foreground/20'
                )} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{doneCount}/5 完成</span>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-3 mb-3 px-1">
          {(Object.entries(STATUS_CONFIG) as [MaterialStatus, typeof STATUS_CONFIG[MaterialStatus]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium border', cfg.color)}>{cfg.label}</span>
            </div>
          ))}
          <span className="text-[9px] text-muted-foreground ml-1">点击状态标签切换</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mainImagePlan.map((img, idx) => (
            <MaterialCard
              key={img.index}
              plan={img}
              brief={PHOTO_BRIEFS[idx]}
              refImage={REF_IMAGES[idx]}
              status={imageStatuses[idx]}
              onStatusChange={(s) => setStatus(idx, s)}
            />
          ))}
        </div>

        {doneCount < 2 && (
          <AlertBox type="warning" className="mt-3">
            P0 素材（第1、4张）优先拍摄——白底首图决定搜索点击率，户外场景图决定转化。
          </AlertBox>
        )}
        {doneCount >= 3 && (
          <AlertBox type="success" className="mt-3">
            已完成 {doneCount} 张主图，可进入 Skill 3 定价，主图可边上线边补充。
          </AlertBox>
        )}
      </div>
      </>
      )}

      {topTab === 'content' && (
      <div className="space-y-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle className="mb-0">① 标题方案</SectionTitle>
          <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">复制 → 粘贴千牛后台</span>
        </div>
        <div className="space-y-2">
          {([
            { label: '搜索导向', value: titles.search, ...TITLE_CTR_ESTIMATES[0] },
            { label: '种草导向', value: titles.seeding, ...TITLE_CTR_ESTIMATES[1] },
            { label: '活动导向', value: titles.promo, ...TITLE_CTR_ESTIMATES[2] },
          ] as const).map(({ label, value, tag, hint, ctr, channel }) => (
            <div key={label} className="flex items-stretch gap-0 rounded-xl border border-border bg-card overflow-hidden group">
              {/* Left meta */}
              <div className="w-16 shrink-0 bg-muted/50 flex flex-col items-center justify-center gap-1 px-2 py-3 border-r border-border">
                <span className="text-[10px] font-bold text-foreground">{tag}</span>
                <div className="flex items-center gap-0.5 text-green-600">
                  <TrendingUp className="size-2.5" />
                  <span className="text-[9px] font-semibold">{ctr}</span>
                </div>
                <span className="text-[8px] text-muted-foreground text-center leading-tight">{channel}</span>
              </div>
              {/* Content */}
              <div className="flex-1 px-3 py-3 min-w-0">
                <p className="text-[10px] text-muted-foreground mb-0.5">{hint}</p>
                <p className="text-sm leading-relaxed">{value}</p>
              </div>
              {/* Actions */}
              <div className="flex flex-col items-center justify-center gap-1.5 px-2.5 border-l border-border bg-muted/20">
                <CopyButton text={value} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle className="mb-0">③ 详情页文案</SectionTitle>
          <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">直接复制 → 粘贴千牛详情编辑器</span>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {/* Hook */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">开</span>
                开场钩子
                <span className="text-[9px] text-muted-foreground font-normal">放在详情页第一屏，影响停留时间</span>
              </span>
              <CopyButton text={detailCopy.hook} />
            </div>
            <p className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3">{detailCopy.hook}</p>
          </div>
          {/* Features */}
          <div className="p-4">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold inline-flex items-center justify-center">卖</span>
              核心卖点（第 2–3 屏）
            </p>
            <div className="space-y-1.5">
              {detailCopy.features.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-2 group rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground leading-relaxed flex-1">{f}</span>
                  <CopyButton text={f} className="shrink-0 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
          {/* Scene */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 text-[9px] font-bold inline-flex items-center justify-center">景</span>
                场景描述（第 4 屏）
              </span>
              <CopyButton text={detailCopy.scene} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{detailCopy.scene}</p>
          </div>
          {/* FAQ */}
          <div className="p-4">
            <p className="text-xs font-semibold mb-2.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold inline-flex items-center justify-center">问</span>
              FAQ（末屏固定区）
            </p>
            <div className="space-y-2">
              {detailCopy.faq.map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground flex-1">{q}</span>
                  <CopyButton text={q} className="shrink-0 py-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ④ SKU + ⑤ Keywords */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* SKU */}
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>④ SKU 方案</SectionTitle>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">颜色（推荐上架顺序）</p>
              <div className="space-y-1.5">
                {skuSuggestion.colors.map((c, i) => (
                  <div key={c} className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg',
                    i === 0 ? 'bg-amber-50 border border-amber-200' : ''
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', i === 0 ? 'bg-amber-500' : 'bg-muted-foreground/30')} />
                    <span className="text-xs flex-1">{c}</span>
                    {i === 0 && <span className="text-[9px] text-amber-600 font-bold">🔥 主推</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">尺码</p>
              <div className="flex gap-1">
                {skuSuggestion.sizes.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{s}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <p className="text-[10px] text-amber-700 font-medium mb-0.5">预测最热 SKU</p>
              <p className="text-xs text-amber-800">{skuSuggestion.hotCombo}</p>
            </div>
          </div>
        </div>

        {/* Keywords — with actionable add button */}
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>⑤ 直通车关键词</SectionTitle>
          <p className="text-[10px] text-muted-foreground mb-2">上架后立即加入直通车，冷启动阶段用</p>
          <div className="space-y-1.5">
            {keywords.map((kw, i) => (
              <div key={i} className={cn(
                'flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border transition-colors',
                addedKws.has(i)
                  ? 'bg-green-50 border-green-200'
                  : 'border-transparent hover:bg-muted/40'
              )}>
                <div className="flex-1 min-w-0">
                  <span className="text-xs truncate">{kw}</span>
                  <span className="text-[9px] text-muted-foreground ml-1.5">建议出价 ¥{KW_BID[i]}</span>
                </div>
                <button
                  onClick={() => setAddedKws(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                  className={cn(
                    'shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors',
                    addedKws.has(i)
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                  )}
                >
                  {addedKws.has(i) ? <CheckCircle2 className="size-2.5" /> : <Plus className="size-2.5" />}
                  {addedKws.has(i) ? '已加入' : '加入'}
                </button>
              </div>
            ))}
          </div>
          {addedKws.size > 0 && (
            <div className="mt-2 pt-2 border-t border-border text-[10px] text-green-600 font-medium">
              ✓ 已加入 {addedKws.size} 个关键词，完成后前往 Skill 5 推广诊断
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {topTab === 'workbench' && (
      <>
      {/* ── Progress Dashboard ──────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <SectionTitle className="mb-0">上架进度：完成了多少？</SectionTitle>
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start mt-4">
          {/* Overall ring */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative w-28 h-28 rounded-full"
              style={{ background: `conic-gradient(hsl(var(--primary)) ${65 * 3.6}deg, #e5e7eb ${65 * 3.6}deg)` }}
            >
              <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                <span className="text-2xl font-bold text-primary tabular-nums">65%</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">总体完成度</span>
          </div>
          {/* Section bars */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {[
              { label: '标题方案', done: true, pct: 100 },
              { label: '主图拍摄', done: false, pct: Math.round(doneCount / 5 * 100) },
              { label: '详情页文案', done: true, pct: 100 },
              { label: 'SKU 上架', done: false, pct: 0 },
              { label: '直通车词', done: false, pct: Math.round(addedKws.size / 5 * 100) },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                {s.done ? (
                  <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                ) : (
                  <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className="text-xs w-20 shrink-0">{s.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', s.done ? 'bg-green-500' : s.pct > 0 ? 'bg-primary' : 'bg-muted-foreground/10')}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Recommendations ──────────────────────── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 mb-6">
        <p className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-1.5">
          <Lightbulb className="size-4" />
          AI 建议你先做这些
        </p>
        <div className="space-y-2">
          {[
            { priority: 'P0', action: '主图评分只有 68 分，先改一下色彩和背景，点击率预计能提升 35%', tab: 'scoring' },
            { priority: 'P0', action: '白底图和户外场景图还没拍，这两张对点击率影响最大', tab: 'visual' },
            { priority: 'P1', action: '直通车关键词还没加，会影响新品冷启动速度', tab: 'content' },
          ].map((rec, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2">
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0',
                rec.priority === 'P0' ? 'bg-red-500/90 text-white border-red-600' : 'bg-amber-500/90 text-white border-amber-600',
              )}>
                {rec.priority}
              </span>
              <span className="text-xs text-amber-950 flex-1">{rec.action}</span>
              <button
                type="button"
                onClick={() => setTopTab(rec.tab)}
                className="text-[10px] text-primary font-medium hover:underline shrink-0"
              >
                前往 →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Existing Checklist ──────────────────────── */}
      <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 mb-6">
        <p className="text-sm font-semibold text-green-800 mb-2.5">接下来你要做的事（按重要程度排序）</p>
        <ol className="space-y-1.5 list-decimal list-inside">
          {[
            '复制"搜索导向"标题 → 粘贴千牛商品标题栏（CTR 预计 +22%）',
            '复制主图 1、4 的拍摄简报 → 发给摄影师，P0 优先拍摄',
            '复制"开场钩子"文案 → 粘贴千牛详情编辑器第一屏',
            '按 SKU 建议上架颜色，优先上"奶白碎花"（预测最热）',
            '在关键词列表点击"加入"→ 去千牛直通车按建议出价创建推广计划',
          ].map((item, i) => (
            <li key={i} className="text-xs text-green-800 leading-relaxed">{item}</li>
          ))}
        </ol>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push('/skills/pricing')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          继续智能定价
          <ArrowRight className="size-4" />
        </button>
      </div>
      </>
      )}

      {topTab === 'scoring' && <ScoringTab />}

      {topTab === 'reference' && (
      <>
      <DataFlowHint
        title="上架数据 → 下游步骤"
        flows={[
          { from: 'Skill 2', value: '优化后标题关键词', toLabel: 'Skill 5 推广', to: '直通车关键词初始列表（减少人工筛选）' },
          { from: 'Skill 2', value: '主图 CTR 预测', toLabel: 'Skill 3 定价', to: '高 CTR 主图允许更高定价溢价' },
          { from: 'Skill 4 评价', value: '差评痛点词', toLabel: 'Skill 2', to: '可回来修改详情页，补充痛点解答', loop: true },
        ]}
        className="my-6"
      />

      <CaseStudyBanner
        cases={[
          { merchant: '深圳女装 阿珊', label: '主图优化后', metric: 'CTR 从 1.8% → 4.3%', detail: '重拍白底图 + 自然光外景图，点击率提升 139%，同期 CVR 同步提升至 1.4%，月销量从 82 件跃升至 310 件', highlight: true },
          { merchant: '杭州饰品 小欣', label: '标题优化前后', metric: '自然流量 +84%', detail: '将"韩系气质法式项链"优化为"2024春夏法式轻奢锁骨链女细腻感"，搜索排名提升 27 位' },
        ]}
        className="mb-6"
      />

      <ModelInsightPanel insight={insight} />
      </>
      )}
    </SkillWorkspaceShell>
  )
}
