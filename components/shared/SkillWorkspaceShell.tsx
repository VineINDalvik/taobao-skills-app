'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SkillShellTab = {
  id: string
  label: string
  /** 窄屏显示 */
  short: string
  icon: LucideIcon
}

type SkillWorkspaceShellProps = {
  header: React.ReactNode
  primaryTabs: SkillShellTab[]
  referenceTabs?: SkillShellTab[]
  activeTab: string
  onTabChange: (id: string) => void
  /** Tab 下方一行说明（与找款页「当前位置」一致） */
  hint?: React.ReactNode
  children: React.ReactNode
  /** 内容区最外层宽度，默认 max-w-3xl */
  contentClassName?: string
}

/**
 * 与 AI 找款页一致的顶栏 + 粘性 Tab，用于其他 Skill 的流程分区。
 */
export function SkillWorkspaceShell({
  header,
  primaryTabs,
  referenceTabs,
  activeTab,
  onTabChange,
  hint,
  children,
  contentClassName = 'max-w-3xl mx-auto w-full',
}: SkillWorkspaceShellProps) {
  return (
    <div className="min-h-[calc(100dvh-0px)] flex flex-col bg-background">
      <div className="shrink-0 px-4 sm:px-6 pt-8 pb-2 max-w-[1400px] mx-auto w-full">{header}</div>

      <div className="shrink-0 sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-1 sm:gap-x-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0 mr-1 hidden sm:inline">
              流程
            </span>
            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
              {primaryTabs.map(({ id, label, short, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5 sm:size-4 shrink-0 opacity-90" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              ))}
            </div>
            {referenceTabs && referenceTabs.length > 0 && (
              <>
                <div className="hidden sm:block h-6 w-px bg-border shrink-0 mx-1" aria-hidden />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0 mr-1 hidden md:inline">
                  参考
                </span>
                <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
                  {referenceTabs.map(({ id, label, short, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onTabChange(id)}
                      className={cn(
                        'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-transparent',
                        activeTab === id
                          ? 'bg-muted text-foreground border-border shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-3.5 sm:size-4 shrink-0 opacity-90" />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {hint ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground border-t border-border/60 pt-2">
              {hint}
            </div>
          ) : null}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-w-0 max-w-[1400px] mx-auto w-full">
        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  )
}
