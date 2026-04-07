'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Database, FileJson, Upload, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'user' | 'assistant'

interface ChatMsg {
  id: string
  role: Role
  text: string
}

const WELCOME =
  '本页支持两件事：① **上传 CSV** 调用 `/api/cluster` 做离线聚类，并可选接 GPT-4o 做 45 标签多标签语义标注；② 下方对话区粘贴指标 / JSON / 数据源说明。公开基准数据来自 HuggingFace「服装+销量+向量」数据集，**Hub 上全量仅 933 条**，不是缓存截断——更大样本请用自有 CSV 或 API 导入。'

function mockReply(userText: string): string {
  const t = userText.trim()
  if (!t) return '请输入内容或粘贴数据。'
  if (t.startsWith('{') && t.includes('recommendations')) {
    return '检测到 JSON 结构（含 recommendations 字段）。可配合 Pipeline Store 解析后刷新左侧簇与区间。'
  }
  if (/\d+\s*[,，]\s*\d+/.test(t) || t.includes('CTR') || t.includes('加购')) {
    return '检测到指标类文本。正式版可映射到测款 Tab 或更新簇级校准特征。'
  }
  return `已记录（Demo）：「${t.slice(0, 80)}${t.length > 80 ? '…' : ''}」。`
}

export function FinderDataChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'w', role: 'assistant', text: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [embeddingMode, setEmbeddingMode] = useState<'precomputed' | 'openclip'>('precomputed')
  const [semanticMode, setSemanticMode] = useState<'heuristic' | 'gpt4o'>('gpt4o')
  const [busy, setBusy] = useState(false)
  const [lastJson, setLastJson] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const pushAssistant = (text: string) => {
    setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text }])
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: 'user', text },
      { id: `a-${Date.now()}`, role: 'assistant', text: mockReply(text) },
    ])
  }

  const onPickCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setLastJson(null)
    setCopied(false)
    const fd = new FormData()
    fd.append('file', f)
    fd.append('embeddingBackend', embeddingMode)
    fd.append('method', 'hdbscan')
    fd.append('preset', 'fine')
    fd.append('topClusters', '12')
    fd.append('semanticBackend', semanticMode)
    fd.append('semanticMaxClusters', '12')
    try {
      const res = await fetch('/api/cluster', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) {
        pushAssistant(`聚类失败（HTTP ${res.status}）：\n${String(data.error || '').slice(0, 4000)}`)
        return
      }
      const jsonStr = JSON.stringify(data.clusters, null, 2)
      setLastJson(jsonStr)
      pushAssistant(
        `聚类完成：共 **${data.clusterCount}** 个簇（已按簇内均销量取 Top）。${data.semanticAnnotated ? '\n已额外完成 GPT-4o 多标签语义标注。' : ''}\n\n${data.hint}\n\n可复制下方 JSON 覆盖 \`lib/cluster-data.json\` 后执行 \`npm run build\`。`,
      )
    } catch (err) {
      pushAssistant(`请求异常：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const copyJson = async () => {
    if (!lastJson) return
    await navigator.clipboard.writeText(lastJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-[min(620px,calc(100vh-240px))] rounded-xl border border-border bg-card overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3 space-y-3 bg-muted/30">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Database className="size-3.5 shrink-0" />
          <span>数据接入 · CSV 聚类</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
            <FileJson className="size-3" /> POST /api/cluster
          </span>
          <a
            href="/api/cluster"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            查看接口说明
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={embeddingMode}
            onChange={(e) => setEmbeddingMode(e.target.value as 'precomputed' | 'openclip')}
            className="text-[11px] rounded-lg border border-border bg-background px-2 py-1.5 max-w-[200px]"
          >
            <option value="precomputed">向量：CSV 已含 embedding（推荐 API）</option>
            <option value="openclip">向量：OpenCLIP 算图（需本机 GPU/依赖）</option>
          </select>
          <select
            value={semanticMode}
            onChange={(e) => setSemanticMode(e.target.value as 'heuristic' | 'gpt4o')}
            className="text-[11px] rounded-lg border border-border bg-background px-2 py-1.5 max-w-[220px]"
          >
            <option value="gpt4o">语义：GPT-4o 45 标签多标签标注</option>
            <option value="heuristic">语义：本地规则兜底</option>
          </select>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onPickCsv} />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {busy ? '聚类中…' : '上传 CSV 聚类'}
          </button>
          {lastJson && (
            <button
              type="button"
              onClick={copyJson}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              {copied ? '已复制' : '复制 cluster JSON'}
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          预计算模式要求 CSV 含 <code className="text-foreground">embedding</code> 列（768 维，与 HF 服装集一致）。
          {semanticMode === 'gpt4o' ? ' 已开启 GPT-4o 服务端多标签语义理解，聚类后会额外做 cluster 命名与归类。' : ''}
          Vercel 无 Python 时会返回错误——请在本地或 Docker 跑 Next +{' '}
          <code className="text-foreground">pip install -r scripts/requirements-cluster.txt</code>。
        </p>
      </div>

      {lastJson && (
        <div className="shrink-0 border-b border-border px-3 py-2 max-h-36 overflow-auto bg-muted/20">
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {lastJson.slice(0, 1200)}
            {lastJson.length > 1200 ? '…' : ''}
          </pre>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="size-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/80 text-foreground rounded-bl-md',
              )}
            >
              <p className="whitespace-pre-wrap text-[13px]">{msg.text}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <User className="size-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3 flex gap-2 bg-card">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="粘贴指标、JSON 片段，或描述要接入的数据源…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim()}
          className="shrink-0 self-end h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
