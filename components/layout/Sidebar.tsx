'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePipelineStore, SKILLS_META } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, ChevronRight, LayoutGrid, FlaskConical, Wand2 } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { completedSkills, activeSkill, productInput, selectedStyle, skillTesting } = usePipelineStore()

  const hasProduct = Boolean(productInput.category)

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-4 min-w-0 rounded-md py-1.5 -mx-1 px-1 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-opacity"
        >
          {/* ignite-brand-icon.png：与右侧字块垂直居中对齐 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/ignite-brand-icon.png"
            alt=""
            width={48}
            height={78}
            className="h-12 w-auto max-w-[3.25rem] shrink-0 object-contain object-center self-center"
            decoding="async"
          />
          <div className="min-w-0 flex flex-col justify-center gap-1.5">
            <p className="text-lg font-bold tracking-tight leading-tight">Ignite</p>
            <p className="text-xs text-muted-foreground leading-snug">找爆款 · 让爆款持续爆</p>
          </div>
        </Link>
      </div>

      {/* Product Card */}
      {hasProduct && (
        <div className="mx-3 my-3 p-2.5 rounded-lg bg-muted/60 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">当前商品</p>
          <p className="text-xs font-medium leading-snug truncate">
            {selectedStyle?.name ?? productInput.category}
          </p>
          {productInput.priceRange && (
            <p className="text-[10px] text-muted-foreground mt-0.5">¥{productInput.priceRange}</p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {/* Entry */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            pathname === '/'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="text-base">📦</span>
          <span className="text-xs font-medium">商品录入</span>
        </Link>

        {/* Wizard */}
        <Link
          href="/skills/workflow"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            pathname.includes('/workflow')
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Wand2 className="size-4 shrink-0" />
          <span className="text-xs font-medium">选款测款向导</span>
        </Link>

        {/* Divider */}
        <div className="my-2 border-t border-border" />

        {/* Products Library */}
        <Link
          href="/products"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            pathname === '/products'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutGrid className="size-4 shrink-0" />
          <span className="text-xs font-medium">商品库</span>
        </Link>

        {/* Campaign */}
        <Link
          href="/campaign"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            pathname === '/campaign'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="text-sm">🔥</span>
          <span className="text-xs font-medium">大促操盘</span>
        </Link>

        {/* Divider */}
        <div className="my-2 border-t border-border" />

        {SKILLS_META.map((skill) => {
          const done = completedSkills.includes(skill.id)
          const active = pathname.includes(`/${skill.slug}`)
          const locked = !hasProduct && skill.id > 0

          return (
            <div key={skill.id}>
              <Link
                href={locked ? '/' : `/skills/${skill.slug}`}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : done
                    ? 'text-foreground hover:bg-muted'
                    : locked
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-sm shrink-0">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{skill.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate hidden group-hover:block">
                    {skill.desc}
                  </p>
                </div>
                <div className="shrink-0">
                  {done ? (
                    <CheckCircle className="size-3.5 text-green-500" />
                  ) : active ? (
                    <ChevronRight className="size-3 text-primary" />
                  ) : (
                    <Circle className="size-3 text-muted-foreground/30" />
                  )}
                </div>
              </Link>
              {skill.id === 1 && (() => {
                const testingDone = Boolean(skillTesting)
                const testingActive = pathname.includes('/testing')
                const testingLocked = !hasProduct
                return (
                  <Link
                    href={testingLocked ? '/' : '/skills/testing'}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group ml-3 border-l border-border/60',
                      testingActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : testingDone
                        ? 'text-foreground hover:bg-muted'
                        : testingLocked
                        ? 'text-muted-foreground/40 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FlaskConical className="size-3.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">测款验证</p>
                      <p className="text-[10px] text-muted-foreground truncate hidden group-hover:block">
                        7天数据 · 放量评估
                      </p>
                    </div>
                    <div className="shrink-0">
                      {testingDone ? (
                        <CheckCircle className="size-3.5 text-green-500" />
                      ) : testingActive ? (
                        <ChevronRight className="size-3 text-primary" />
                      ) : (
                        <Circle className="size-3 text-muted-foreground/30" />
                      )}
                    </div>
                  </Link>
                )
              })()}
            </div>
          )
        })}
      </nav>

      {/* Footer progress */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">完成进度</span>
          <span className="text-[10px] font-medium">{completedSkills.filter(id => id >= 1 && id <= 6).length}/6</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedSkills.filter(id => id >= 1 && id <= 6).length / 6) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
