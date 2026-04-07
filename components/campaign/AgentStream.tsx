'use client'

import { useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AgentLog } from '@/lib/campaign-types'

interface AgentStreamProps {
  logs: AgentLog[]
  collapsed: boolean
  onToggle: () => void
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toTimeString().slice(0, 8)
  } catch {
    return '??:??:??'
  }
}

const LEVEL_COLOR: Record<AgentLog['level'], string> = {
  info: 'text-muted-foreground',
  success: 'text-green-400',
  error: 'text-red-400',
}

export default function AgentStream({
  logs,
  collapsed,
  onToggle,
}: AgentStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrolled = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isUserScrolled.current =
      el.scrollTop + el.clientHeight < el.scrollHeight - 20
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || isUserScrolled.current) return
    el.scrollTop = el.scrollHeight
  }, [logs.length])

  const Icon = collapsed ? ChevronUp : ChevronDown

  return (
    <div
      className="border-t border-border bg-muted/50 shrink-0 flex flex-col"
      style={{ height: collapsed ? 32 : 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-8 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-mono text-green-400">
          SYSTEM.AGENT_STREAM
        </span>
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          CONNECTION ESTABLISHED // {logs.length} PACKETS
        </span>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon size={14} />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 pb-2 font-mono text-xs min-h-0"
        >
          {logs.length === 0 ? (
            <div className="text-amber-400/70 animate-pulse mt-2">
              Awaiting next instruction...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5 leading-relaxed">
                <span className="text-muted-foreground/60 shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                <span className="bg-green-900/50 text-green-400 rounded px-1.5 text-[10px] uppercase shrink-0">
                  {log.tag}
                </span>
                <span className={`shrink-0 ${LEVEL_COLOR[log.level]}`}>
                  [{log.level}]
                </span>
                <span className="text-foreground/80">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
