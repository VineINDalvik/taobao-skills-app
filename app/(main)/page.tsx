'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePipelineStore } from '@/lib/store'
import {
  ArrowRight, Sparkles, Upload, Link2, FileJson,
  CheckCircle2, AlertCircle, Send, Bot, User, Pencil, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductRecord } from '@/lib/types'
import { parseTaobaoItemUrl } from '@/lib/taobao-url'

// ─── Mock NLP parser ────────────────────────────────────────────────────────
interface ParsedIntent {
  category: string
  priceMin: string
  priceMax: string
  styleKeywords: string[]
  summary: string        // AI reply text
  /** 可选，用于 Finder 视觉簇对齐（OpenCLIP） */
  imageUrl?: string
  /** 链接解析得到；价类不会从 URL 推断 */
  taobaoItemId?: string
  taobaoSkuId?: string
  taobaoHost?: string
}

const KEYWORD_MAP: Array<{ tests: (s: string) => boolean; category: string; priceHint: [string, string] }> = [
  { tests: s => /碎花|印花|连衣裙|裙子|裙/.test(s),         category: '女装-连衣裙', priceHint: ['99', '299'] },
  { tests: s => /上衣|衬衫|T恤|t恤|tee|衬衣/.test(s) && /女/.test(s), category: '女装-上衣', priceHint: ['59', '199'] },
  { tests: s => /T恤|t恤|tee|男装|男士/.test(s),            category: '男装-T恤',   priceHint: ['49', '149'] },
  { tests: s => /外套|夹克|卫衣|风衣/.test(s),              category: '男装-外套',  priceHint: ['149', '399'] },
  { tests: s => /床品|被子|枕头|家居/.test(s),              category: '家居-床品',  priceHint: ['89', '299'] },
  { tests: s => /护肤|面霜|精华|美妆|化妆/.test(s),         category: '美妆-护肤',  priceHint: ['79', '299'] },
  { tests: s => /手机|耳机|数码|配件/.test(s),              category: '数码-手机配件', priceHint: ['29', '199'] },
]

const STYLE_KEYWORD_MAP: Record<string, string> = {
  '法式': '法式|法风|浪漫', '新中式': '新中式|国风|中国风', '韩系': '韩系|韩风|韩国',
  '极简': '极简|简约|minimalist', '复古': '复古|vintage|古着', '运动': '运动|sport|健身',
  '甜美': '甜美|少女|可爱', '通勤': '通勤|职场|OL', '街头': '街头|潮|hiphop',
  '度假': '度假|海边|沙滩', '学院': '学院|校园|preppy',
}

const PRICE_PATTERN_MAP: Array<{ re: RegExp; min: string; max: string }> = [
  { re: /便宜|实惠|低价|百元内|100以内/, min: '39', max: '99' },
  { re: /一两百|100到200|百元左右|百来块/, min: '89', max: '199' },
  { re: /两三百|200到300|中高端/, min: '199', max: '399' },
  { re: /高端|品质|三四百|300以上/, min: '299', max: '599' },
]

function mockParseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase()

  // Category
  let category = '女装-连衣裙'
  let priceMin = '99'
  let priceMax = '299'
  for (const rule of KEYWORD_MAP) {
    if (rule.tests(lower)) { category = rule.category; ;[priceMin, priceMax] = rule.priceHint; break }
  }

  // Price override
  for (const { re, min, max } of PRICE_PATTERN_MAP) {
    if (re.test(lower)) { priceMin = min; priceMax = max; break }
  }

  // Explicit price range e.g. "100-200" or "100到200"
  const rangeMatch = lower.match(/(\d{2,3})\s*[-到~至]\s*(\d{2,3})/)
  if (rangeMatch) { priceMin = rangeMatch[1]; priceMax = rangeMatch[2] }

  // Style keywords
  const styleKeywords: string[] = []
  for (const [tag, pattern] of Object.entries(STYLE_KEYWORD_MAP)) {
    if (new RegExp(pattern).test(lower)) styleKeywords.push(tag)
  }
  if (/当季|春|夏|秋|冬|今年/.test(lower) && styleKeywords.length === 0) styleKeywords.push('极简')

  const catShort = category.split('-')[1] ?? category
  const styleStr = styleKeywords.length ? `，风格偏 ${styleKeywords.join('/')}` : ''
  const summary = `好的！已锁定「${catShort}」类目，价带 ¥${priceMin}–${priceMax}${styleStr}。下一步会把您的目标**对齐到淘宝相似款簇**，给出**日销区间（P25–P75）**和**测款止损清单**——不是独立站企划，而是跟爆款可执行流 🔍`

  return { category, priceMin, priceMax, styleKeywords, summary }
}

// ─── Sample prompts ──────────────────────────────────────────────────────────
const SAMPLE_PROMPTS = [
  '想跟一条淘宝爆款法式碎花裙，帮我看还有没有空间、怎么测款',
  '我想卖今夏流行的碎花连衣裙，价格别太贵',
  '看到新中式很火，想做一批女装上衣，中等价位',
  '想卖男士运动T恤，走量，百元以内',
]

// ─── Types ───────────────────────────────────────────────────────────────────
type ChatMsg = { role: 'user' | 'assistant'; text: string }
type SecondaryTab = 'json' | 'url' | null

// ─── Classify Section (paste image URL) ─────────────────────────────────────
function ClassifySection() {
  const router = useRouter()
  const { setClassifyResult } = usePipelineStore()
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClassify = async () => {
    if (!imageUrl.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/classify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || '分析失败')
        return
      }
      setClassifyResult(data)
      router.push('/skills/finder')
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Upload className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">快速图片找款</h2>
          <p className="text-xs text-muted-foreground">粘贴商品图片 URL → AI 自动归入相似款簇 → 查看测款 SOP</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClassify() }}
          placeholder="粘贴商品图片 URL..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
        />
        <button
          onClick={handleClassify}
          disabled={!imageUrl.trim() || loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              分析中…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              分析这个款
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const { setProductInput, loadSession } = usePipelineStore()

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [parsed, setParsed] = useState<ParsedIntent | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState({
    category: '',
    priceMin: '',
    priceMax: '',
    styleKeywords: [] as string[],
    imageUrl: '',
  })
  const msgEndRef = useRef<HTMLDivElement>(null)

  // Secondary tab (JSON / URL)
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [jsonStatus, setJsonStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [jsonMsg, setJsonMsg] = useState('')
  const [taobaoUrl, setTaobaoUrl] = useState('')
  const [urlParsed, setUrlParsed] = useState(false)
  const [urlParseError, setUrlParseError] = useState('')
  const [intentFormError, setIntentFormError] = useState('')

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const sendMessage = (text: string) => {
    if (!text.trim() || isThinking) return
    const userMsg: ChatMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsThinking(true)
    setParsed(null)

    setTimeout(() => {
      const result = mockParseIntent(text)
      setMessages(prev => [...prev, { role: 'assistant', text: result.summary }])
      setParsed(result)
      setEditFields({
        category: result.category,
        priceMin: result.priceMin,
        priceMax: result.priceMax,
        styleKeywords: result.styleKeywords,
        imageUrl: '',
      })
      setIsThinking(false)
    }, 1400)
  }

  const handleConfirm = () => {
    const fields = editMode ? editFields : (parsed ?? editFields)
    if (!fields.category.trim() || !fields.priceMin.trim() || !fields.priceMax.trim()) {
      setIntentFormError('请填写类目与价格区间。链接在未登录、无开放平台权限时无法读出价类，避免误判。')
      return
    }
    setIntentFormError('')
    const fromLink = parsed
    const f = fields as ParsedIntent & { imageUrl?: string }
    const img = f.imageUrl?.trim() ? f.imageUrl.trim() : undefined
    setProductInput({
      category: fields.category.trim(),
      priceRange: `${fields.priceMin.trim()}-${fields.priceMax.trim()}`,
      styleKeywords: fields.styleKeywords,
      ...(img ? { imageUrl: img } : {}),
      ...(fromLink?.taobaoItemId
        ? { taobaoItemId: fromLink.taobaoItemId, ...(fromLink.taobaoSkuId ? { taobaoSkuId: fromLink.taobaoSkuId } : {}) }
        : {}),
    })
    router.push('/skills/finder')
  }

  const toggleEditTag = (tag: string) => {
    setEditFields(prev => ({
      ...prev,
      styleKeywords: prev.styleKeywords.includes(tag)
        ? prev.styleKeywords.filter(t => t !== tag)
        : [...prev.styleKeywords, tag],
    }))
  }

  const handleJsonImport = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ProductRecord
        if (!data.session?.productInput || !Array.isArray(data.completedSkills)) {
          throw new Error('不是有效的商品方案文件')
        }
        loadSession(data)
        setJsonStatus('ok')
        setJsonMsg(`已加载「${data.name}」— ${data.completedSkills.length} 个 Skill 已完成`)
        setTimeout(() => {
          const lastSkillId = Math.max(...data.completedSkills, 0)
          const slugMap: Record<number, string> = { 1: 'finder', 2: 'listing', 3: 'pricing', 4: 'reviews', 5: 'ads', 6: 'promo' }
          router.push(`/skills/${slugMap[lastSkillId] ?? 'finder'}`)
        }, 1000)
      } catch (err) {
        setJsonStatus('error')
        setJsonMsg(err instanceof Error ? err.message : '文件解析失败')
      }
    }
    reader.readAsText(file)
  }, [loadSession, router])

  const handleUrlParse = () => {
    setUrlParseError('')
    const result = parseTaobaoItemUrl(taobaoUrl)
    if (!result.ok) {
      setUrlParseError(result.error)
      return
    }
    const hostLabel = result.host === 'tmall' ? '天猫' : '淘宝'
    const skuLine = result.skuId ? `，SKU ${result.skuId}` : ''
    setMessages((prev) => [...prev, { role: 'user', text: taobaoUrl.trim() }])
    setIsThinking(true)
    setTimeout(() => {
      const intent: ParsedIntent = {
        category: '',
        priceMin: '',
        priceMax: '',
        styleKeywords: [],
        taobaoItemId: result.itemId,
        taobaoSkuId: result.skuId,
        taobaoHost: result.host,
        summary:
          `已从链接解析 **${hostLabel}商品 id：${result.itemId}**${skuLine}（免费模式仅读 URL，**不请求淘宝**）。` +
          `请在下方**手工填写**你在商品页看到的**类目**与**价格区间**（含券后/到手价），确认后再做相似簇对齐与测款 SOP。`,
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: intent.summary }])
      setParsed(intent)
      setEditFields({ category: '', priceMin: '', priceMax: '', styleKeywords: [], imageUrl: '' })
      setIntentFormError('')
      setEditMode(true)
      setIsThinking(false)
      setSecondaryTab(null)
      setUrlParsed(true)
    }, 400)
  }

  const STYLE_TAGS = ['法式', '新中式', '韩系', '极简', '复古', '运动', '商务', '甜美', '通勤', '街头', '度假', '学院']

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles className="size-3" />
          为淘宝中小卖家 · 让爆款持续爆
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5">你想卖什么？</h1>
        <p className="text-sm text-muted-foreground">描述选款方向，AI 帮你找准爆款、测款验证——不只爆一次，让它一直爆下去</p>
      </div>

      {/* Paste image classification */}
      <ClassifySection />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">或用文字描述</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Chat window */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        {/* Message list */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-2 min-h-[120px] max-h-64 overflow-y-auto">
          {messages.length === 0 && !isThinking && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground max-w-xs">
                你好！告诉我你想卖什么，比如"我想卖今夏流行的碎花连衣裙"——我不只帮你找爆款，更帮它持续爆 🔥
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex items-end gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                msg.role === 'user' ? 'bg-primary' : 'bg-primary/10')}>
                {msg.role === 'user'
                  ? <User className="size-3 text-primary-foreground" />
                  : <Bot className="size-3.5 text-primary" />}
              </div>
              <div className={cn(
                'rounded-2xl px-3.5 py-2.5 text-sm max-w-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              )}>
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-end gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Confirm card (shows after parse) */}
        {parsed && !editMode && (
          <div className="mx-4 mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                <p className="text-xs font-semibold text-primary">已识别选款目标</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditFields({
                    category: parsed.category,
                    priceMin: parsed.priceMin,
                    priceMax: parsed.priceMax,
                    styleKeywords: parsed.styleKeywords,
                    imageUrl: parsed.imageUrl ?? '',
                  })
                  setEditMode(true)
                }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="size-3" />修改
              </button>
            </div>
            {parsed.taobaoItemId && (
              <p className="text-[10px] text-muted-foreground mb-2">
                参照链接商品 id {parsed.taobaoItemId}
                {parsed.taobaoSkuId ? ` · sku ${parsed.taobaoSkuId}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {parsed.category.trim() && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{parsed.category}</span>
              )}
              {(parsed.priceMin || parsed.priceMax) && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">¥{parsed.priceMin}–{parsed.priceMax}</span>
              )}
              {parsed.styleKeywords.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
            <div className="mt-2">
              <label className="block text-[10px] text-muted-foreground mb-1">灵感图 URL（可选，用于视觉相似簇排序）</label>
              <input
                value={parsed.imageUrl ?? ''}
                onChange={(e) => setParsed((p) => (p ? { ...p, imageUrl: e.target.value } : null))}
                placeholder="https://… 商品主图或参考图"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            {intentFormError && <p className="mt-2 text-[10px] text-destructive">{intentFormError}</p>}
            <button
              onClick={handleConfirm}
              className="mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              对齐淘宝簇，生成测款清单
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Edit mode card */}
        {parsed && editMode && (
          <div className="mx-4 mb-3 rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{parsed.taobaoItemId ? '填写价类（链接已解析 id）' : '修改选款目标'}</p>
              <button type="button" onClick={() => { setEditMode(false); setIntentFormError('') }} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
            </div>
            {parsed.taobaoItemId && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                已解析商品 id <span className="font-mono text-foreground">{parsed.taobaoItemId}</span>
                {parsed.taobaoSkuId ? <> · sku <span className="font-mono text-foreground">{parsed.taobaoSkuId}</span></> : null}
                。请打开商品页复制类目路径，并填写挂牌价或券后价区间。
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">类目</label>
                <input value={editFields.category} onChange={e => setEditFields(p => ({ ...p, category: e.target.value }))}
                  placeholder="如：女装-连衣裙"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs bg-muted focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">价格区间（元）</label>
                <div className="flex items-center gap-1">
                  <input value={editFields.priceMin} onChange={e => setEditFields(p => ({ ...p, priceMin: e.target.value }))}
                    placeholder="如 499" className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-muted focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  <span className="text-muted-foreground text-xs shrink-0">—</span>
                  <input value={editFields.priceMax} onChange={e => setEditFields(p => ({ ...p, priceMax: e.target.value }))}
                    placeholder="可与低价相同" className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-muted focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1.5">风格标签</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleEditTag(tag)}
                    className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                      editFields.styleKeywords.includes(tag) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/30')}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">灵感图 URL（可选）</label>
              <input
                value={editFields.imageUrl}
                onChange={(e) => setEditFields((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://…"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs bg-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            {intentFormError && <p className="text-[10px] text-destructive">{intentFormError}</p>}
            <button
              type="button"
              onClick={() => {
                if (!editFields.category.trim() || !editFields.priceMin.trim() || !editFields.priceMax.trim()) {
                  setIntentFormError('请填写类目与价格区间（单价位可填相同数字，如 499—499）。')
                  return
                }
                setIntentFormError('')
                setParsed({ ...parsed, ...editFields })
                setEditMode(false)
                handleConfirm()
              }}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              确认并生成找款报告
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Input bar */}
        {!parsed && (
          <div className="border-t border-border px-3 py-2.5 flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="描述你想卖的商品，比如：我想卖今夏流行的碎花连衣裙，价格别太贵…"
              rows={2}
              className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Send className="size-3.5 text-primary-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Sample prompts */}
      {messages.length === 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">快速开始</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Secondary actions */}
      {!parsed && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">或</span>
          <button onClick={() => setSecondaryTab(prev => prev === 'json' ? null : 'json')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
              secondaryTab === 'json' ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
            <FileJson className="size-3.5" />导入已有方案
          </button>
          <button onClick={() => setSecondaryTab(prev => prev === 'url' ? null : 'url')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
              secondaryTab === 'url' ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
            <Link2 className="size-3.5" />淘宝链接解析
          </button>
        </div>
      )}

      {/* JSON import panel */}
      {secondaryTab === 'json' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.json')) handleJsonImport(f) }}
            onClick={() => fileInputRef.current?.click()}
            className={cn('rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
              jsonStatus === 'ok' ? 'border-green-400 bg-green-50' :
              jsonStatus === 'error' ? 'border-red-300 bg-red-50' :
              'border-border hover:bg-muted/40 hover:border-foreground/30')}
          >
            {jsonStatus === 'ok' ? (
              <><CheckCircle2 className="size-8 text-green-500 mx-auto mb-2" /><p className="text-sm font-medium text-green-700">{jsonMsg}</p><p className="text-xs text-green-600 mt-1">正在跳转…</p></>
            ) : jsonStatus === 'error' ? (
              <><AlertCircle className="size-8 text-red-400 mx-auto mb-2" /><p className="text-sm font-medium text-red-600">{jsonMsg}</p><p className="text-xs text-muted-foreground mt-1">请选择从各 Skill 页面导出的 .json 文件</p></>
            ) : (
              <><Upload className="size-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium mb-1">拖放或点击上传方案文件</p><p className="text-xs text-muted-foreground">上传后自动恢复至最后完成的步骤</p></>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleJsonImport(f) }} />
        </div>
      )}

      {/* URL import panel */}
      {secondaryTab === 'url' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">粘贴淘宝/天猫商品链接（跟款入口）</p>
          <div className="flex gap-2">
            <input type="url" placeholder="https://item.taobao.com/item.htm?id=..."
              value={taobaoUrl} onChange={e => { setTaobaoUrl(e.target.value); setUrlParsed(false); setUrlParseError('') }}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            <button onClick={handleUrlParse} disabled={!taobaoUrl.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
              解析
            </button>
          </div>
          {urlParseError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{urlParseError}</p>
          )}
          <p className="text-xs text-muted-foreground bg-muted/50 border border-border px-3 py-2 rounded-lg leading-relaxed">
            <strong className="text-foreground">免费方案：</strong>只从链接里读 <code className="text-[10px]">id</code> / <code className="text-[10px]">skuId</code>，不访问淘宝服务器。
            标题、类目、到手价请在下一步<strong className="text-foreground">手工填写</strong>；接开放平台后可自动拉取。
          </p>
        </div>
      )}

      {/* Pipeline preview */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">完整作业流程</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {[
            { n: 1, label: 'AI 找款',  icon: '🔍', sub: '跟款' },
            { n: 2, label: '测款验证', icon: '🧪', sub: '测款', highlight: true },
            { n: 3, label: '上架优化', icon: '📝', sub: '放量' },
            { n: 4, label: '智能定价', icon: '💰', sub: '放量' },
            { n: 5, label: '评价诊断', icon: '⭐', sub: '放量' },
            { n: 6, label: '推广诊断', icon: '📊', sub: '放量' },
            { n: 7, label: '活动促销', icon: '🎯', sub: '放量' },
          ].map((step, i) => (
            <div key={step.n} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1 px-2">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-sm',
                  step.highlight ? 'bg-primary/15 ring-1 ring-primary/30' : 'bg-muted')}>
                  {step.icon}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{step.label}</span>
                <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                  step.sub === '跟款' ? 'bg-blue-50 text-blue-500' :
                  step.sub === '测款' ? 'bg-primary/10 text-primary' :
                  'bg-green-50 text-green-600')}>{step.sub}</span>
              </div>
              {i < 6 && <div className={cn('w-3 h-px shrink-0', i === 1 ? 'bg-primary/40' : 'bg-border')} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
