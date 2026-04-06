'use client'

import Image from 'next/image'
import { TrendingUp, Target, Palette, Type as TypeIcon, LayoutGrid, ChevronRight, Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/shared/SkillLayout'

/* ── Mock Data ─────────────────────────────────────────────── */

const MOCK_SCORE = {
  overall: 68,
  dimensions: [
    { key: 'composition', label: '构图', score: 82, icon: Target },
    { key: 'color', label: '色彩', score: 51, icon: Palette },
    { key: 'copy', label: '文案', score: 75, icon: TypeIcon },
    { key: 'layout', label: '版式', score: 63, icon: LayoutGrid },
  ],
  strengths: ['构图稳定，三分法到位', '文案简洁有力，信息密度高'],
  weaknesses: [
    '色彩饱和度偏低，缺乏视觉冲击',
    '主体占画面比不足 60%，商品不够突出',
    '版式留白过多，信息层级不清晰',
  ],
}

const MOCK_PATTERNS = [
  {
    id: 'p1',
    name: '纯白背景 + 模特正面 + 大字促销',
    features: ['白底', '正面站姿', '促销文案>20%', '高饱和标题'],
    roiLift: '投入产出比 提升265%', ctrLift: '点击率 提升59%', cvrLift: '成交率 提升102%',
    sampleCount: 342, strength: '效果强' as const,
    thumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=240&h=300&fit=crop',
  },
  {
    id: 'p2',
    name: '场景化街拍 + 氛围感 + 无文字',
    features: ['自然光', '户外街拍', '无叠加文案', '背景虚化'],
    roiLift: '投入产出比 提升148%', ctrLift: '点击率 提升41%', cvrLift: '成交率 提升67%',
    sampleCount: 218, strength: '效果强' as const,
    thumb: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=240&h=300&fit=crop',
  },
  {
    id: 'p3',
    name: '多角度拼图 + 细节特写 + 尺码标注',
    features: ['2-4张拼图', '细节特写', '尺码标注', '无模特'],
    roiLift: '投入产出比 提升89%', ctrLift: '点击率 提升23%', cvrLift: '成交率 提升51%',
    sampleCount: 156, strength: '效果中等' as const,
    thumb: 'https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=240&h=300&fit=crop',
  },
]

type Gap = 'good' | 'neutral' | 'bad'
const MOCK_COMPARISONS: { dimension: string; level: string; current: string; pattern: string; conclusion: string; gap: Gap }[] = [
  { dimension: '背景', level: '场景', current: '杂乱室内', pattern: '纯白背景', conclusion: '需更换为白底，提升专业感', gap: 'bad' },
  { dimension: '主体占比', level: '构图', current: '45%', pattern: '≥70%', conclusion: '主体偏小，建议裁切放大', gap: 'bad' },
  { dimension: '色彩饱和度', level: '色彩', current: '偏暗 (−15%)', pattern: '标准或 +10%', conclusion: '提高饱和度，增强吸引力', gap: 'bad' },
  { dimension: '文案位置', level: '版式', current: '无文案', pattern: '右侧 1/3 区域', conclusion: '增加促销文案，参考套路一', gap: 'bad' },
  { dimension: '构图法', level: '构图', current: '三分法', pattern: '三分法', conclusion: '构图合格，保持', gap: 'good' },
]

const MOCK_PRIORITIES = [
  { rank: 1, action: '更换纯白背景', dim: '背景/场景', lift: '点击率 预计提升 +35%', effort: 'low' as const },
  { rank: 2, action: '提高色彩饱和度 +15%', dim: '色彩', lift: '点击率 预计提升 +18%', effort: 'low' as const },
  { rank: 3, action: '裁切放大主体至 70%', dim: '构图', lift: '点击率 预计提升 +12%', effort: 'low' as const },
  { rank: 4, action: '添加促销文案（右侧 1/3）', dim: '版式', lift: '成交率 预计提升 +22%', effort: 'mid' as const },
  { rank: 5, action: '重拍户外场景图（第 4 张）', dim: '场景', lift: '成交率 预计提升 +15%', effort: 'high' as const },
]

/* ── Helpers ───────────────────────────────────────────────── */

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600'
  if (s >= 60) return 'text-amber-600'
  return 'text-red-500'
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-500'
  if (s >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function scoreLabel(s: number) {
  if (s >= 80) return '优秀'
  if (s >= 60) return '及格'
  return '需改进'
}

function effortPill(e: 'low' | 'mid' | 'high') {
  if (e === 'low') return 'bg-green-100 text-green-700 border-green-200'
  if (e === 'mid') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

/* ── Component ─────────────────────────────────────────────── */

export function ScoringTab() {
  const pct = MOCK_SCORE.overall

  return (
    <div className="space-y-8">
      {/* ── A. Creative Score Card ─────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionTitle>你的主图能打几分？</SectionTitle>
        <p className="text-xs text-muted-foreground mb-4 -mt-1">
          AI 从构图、色彩、文案、版式四个角度给你的主图打分，帮你快速发现哪里可以改进
        </p>
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Ring */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative w-32 h-32 rounded-full"
              style={{
                background: `conic-gradient(${pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg)`,
              }}
            >
              <div className="absolute inset-3 rounded-full bg-card flex flex-col items-center justify-center">
                <span className={cn('text-3xl font-bold tabular-nums', scoreColor(pct))}>{pct}</span>
                <span className={cn('text-[10px] font-medium', scoreColor(pct))}>{scoreLabel(pct)}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">满分 100</span>
          </div>

          {/* Dimension bars */}
          <div className="flex-1 space-y-3 min-w-0">
            {MOCK_SCORE.dimensions.map((d) => {
              const Icon = d.icon
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-xs w-8 shrink-0">{d.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', scoreBg(d.score))} style={{ width: `${d.score}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums w-16 text-right', scoreColor(d.score))}>
                    {d.score} {scoreLabel(d.score)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strengths / Weaknesses */}
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <div className="rounded-lg border border-green-200 bg-green-50/60 p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-green-800 flex items-center gap-1"><CheckCircle2 className="size-3" /> 做得好的地方</p>
            {MOCK_SCORE.strengths.map((s) => (
              <span key={s} className="block text-[11px] text-green-900 leading-snug">· {s}</span>
            ))}
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-red-800 flex items-center gap-1"><AlertTriangle className="size-3" /> 建议改进的地方</p>
            {MOCK_SCORE.weaknesses.map((w) => (
              <span key={w} className="block text-[11px] text-red-900 leading-snug">· {w}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── B. Winning Patterns ────────────────────────── */}
      <div>
        <SectionTitle className="flex items-center gap-2">
          <Trophy className="size-4" />
          爆款图片都长什么样？
        </SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 -mt-1">
          AI 分析了同类目近 30 天的热销商品图片，总结出 3 种最容易出爆款的拍图套路
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {MOCK_PATTERNS.map((p, idx) => (
            <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40 bg-muted">
                <Image src={p.thumb} alt={p.name} fill className="object-cover" sizes="240px" />
                <div className="absolute top-2 right-2">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold border',
                    p.strength === '效果强' ? 'bg-green-500/90 text-white border-green-600' : 'bg-amber-500/90 text-white border-amber-600',
                  )}>{p.strength}</span>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                    套路 {idx + 1}
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <p className="text-white text-[11px] font-semibold leading-tight">{p.name}</p>
                </div>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="flex flex-wrap gap-1">
                  {p.features.map((f) => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{f}</span>
                  ))}
                </div>
                <div className="space-y-1">
                  {[p.roiLift, p.ctrLift, p.cvrLift].map((m) => (
                    <div key={m} className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2 py-1">
                      <TrendingUp className="size-2.5 text-green-600 shrink-0" />
                      <p className="text-[10px] font-medium text-green-700">{m}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground">{p.sampleCount} 个样本 · 近 30 天数据</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── C. Feature Comparison Table ────────────────── */}
      <div>
        <SectionTitle>你的图 vs 爆款图，差在哪？</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 -mt-1">
          把你的主图和套路一（效果最好）做逐项对比，红色 = 需要改，绿色 = 已达标
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground text-left">
                <th className="p-2.5 font-medium">对比项</th>
                <th className="p-2.5 font-medium">属于哪方面</th>
                <th className="p-2.5 font-medium">你的图</th>
                <th className="p-2.5 font-medium">爆款标准</th>
                <th className="p-2.5 font-medium">怎么改</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_COMPARISONS.map((c, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-border last:border-0',
                    c.gap === 'bad' && 'bg-red-50/50',
                    c.gap === 'good' && 'bg-green-50/50',
                  )}
                >
                  <td className="p-2.5 font-medium">{c.dimension}</td>
                  <td className="p-2.5 text-muted-foreground">{c.level}</td>
                  <td className="p-2.5">{c.current}</td>
                  <td className="p-2.5">{c.pattern}</td>
                  <td className="p-2.5 flex items-center gap-1.5">
                    {c.gap === 'bad' && <AlertTriangle className="size-3 text-amber-500 shrink-0" />}
                    {c.gap === 'good' && <CheckCircle2 className="size-3 text-green-500 shrink-0" />}
                    <span className={cn(c.gap === 'bad' ? 'text-red-700' : 'text-green-700')}>{c.conclusion}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── D. Optimization Priority ───────────────────── */}
      <div>
        <SectionTitle className="flex items-center gap-2">
          <ChevronRight className="size-4" />
          改图优先级：先改哪个效果最大？
        </SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 -mt-1">
          按预期提升效果从大到小排序，低成本操作优先做，投入少效果好
        </p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {MOCK_PRIORITIES.map((p) => (
            <div key={p.rank} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg font-bold text-primary tabular-nums w-6 text-center">{p.rank}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{p.action}</p>
                <span className="text-[10px] text-muted-foreground">{p.dim}</span>
              </div>
              <span className="text-[10px] font-bold text-green-600 shrink-0">{p.lift}</span>
              <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-medium shrink-0', effortPill(p.effort))}>
                {p.effort === 'low' ? '简单，马上能改' : p.effort === 'mid' ? '需要一些时间' : '需要重新拍摄'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
