import { cn } from '@/lib/utils'

interface SkillHeaderProps {
  icon: string
  title: string
  subtitle: string
  children?: React.ReactNode
}

export function SkillHeader({ icon, title, subtitle, children }: SkillHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
  className?: string
}

export function MetricCard({ label, value, sub, highlight, className }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4',
      highlight && 'border-primary/30 bg-primary/5',
      className
    )}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', highlight && 'text-primary')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

interface AlertBoxProps {
  type?: 'warning' | 'info' | 'success'
  children: React.ReactNode
  className?: string
}

export function AlertBox({ type = 'warning', children, className }: AlertBoxProps) {
  return (
    <div className={cn(
      'rounded-lg border px-3.5 py-3 text-sm flex items-start gap-2',
      type === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
      type === 'info'    && 'border-blue-200 bg-blue-50 text-blue-800',
      type === 'success' && 'border-green-200 bg-green-50 text-green-800',
      className,
    )}>
      <span className="shrink-0 mt-0.5">
        {type === 'warning' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅'}
      </span>
      <div>{children}</div>
    </div>
  )
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-sm font-semibold text-foreground mb-3', className)}>
      {children}
    </h2>
  )
}
