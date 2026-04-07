import { cn } from '@/lib/utils'

type Tier = 'S' | 'A' | 'B'
type Priority = 'P0' | 'P1' | 'P2'

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold',
        tier === 'S' && 'bg-amber-100 text-amber-700',
        tier === 'A' && 'bg-blue-100 text-blue-700',
        tier === 'B' && 'bg-zinc-100 text-zinc-600',
      )}
    >
      {tier}
    </span>
  )
}

/** 选品模型 S/A/B 销量潜力分级（GATv2 + LightGBM 输出）— 大卡强调 */
export function TierGradePill({
  tier,
  className,
}: {
  tier: Tier
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2 min-w-[4.5rem] shadow-sm',
        tier === 'S' && 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/80',
        tier === 'A' && 'border-blue-300 bg-gradient-to-b from-blue-50 to-blue-100/80',
        tier === 'B' && 'border-zinc-300 bg-gradient-to-b from-zinc-50 to-zinc-100/80',
        className,
      )}
    >
      <span
        className={cn(
          'text-2xl font-black tabular-nums leading-none tracking-tight',
          tier === 'S' && 'text-amber-800',
          tier === 'A' && 'text-blue-800',
          tier === 'B' && 'text-zinc-700',
        )}
      >
        {tier}
      </span>
      <span className="text-[9px] font-semibold text-muted-foreground mt-1 uppercase tracking-wide">潜力</span>
    </div>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold',
        priority === 'P0' && 'bg-red-100 text-red-700',
        priority === 'P1' && 'bg-orange-100 text-orange-700',
        priority === 'P2' && 'bg-zinc-100 text-zinc-600',
      )}
    >
      {priority}
    </span>
  )
}

export function ScoreBadge({ score, max = 100 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color =
    pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <span className={cn('text-sm font-semibold tabular-nums', color)}>
      {score}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: 'low' | 'mid' | 'high' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium',
        risk === 'low' && 'bg-green-100 text-green-700',
        risk === 'mid' && 'bg-amber-100 text-amber-700',
        risk === 'high' && 'bg-red-100 text-red-700',
      )}
    >
      {risk === 'low' ? '低风险' : risk === 'mid' ? '中风险' : '高风险'}
    </span>
  )
}

export function ActionBadge({ action }: { action: 'pause' | 'raise' | 'keep' | 'add' }) {
  const map = {
    pause: { label: '暂停', cls: 'bg-red-100 text-red-700' },
    raise: { label: '加价', cls: 'bg-green-100 text-green-700' },
    keep:  { label: '保持', cls: 'bg-zinc-100 text-zinc-600' },
    add:   { label: '新增', cls: 'bg-blue-100 text-blue-700' },
  }
  const { label, cls } = map[action]
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold', cls)}>
      {label}
    </span>
  )
}
