'use client'

import { MOCK_TASK_HISTORY } from '@/lib/mock-campaign'
import type { CampaignPipeline } from '@/lib/campaign-types'

const STATUS_STYLE: Record<
  CampaignPipeline['status'],
  { label: string; color: string }
> = {
  draft: { label: '\u8349\u7A3F', color: 'bg-gray-700 text-gray-300' },
  running: { label: '\u8FD0\u884C\u4E2D', color: 'bg-amber-900/60 text-amber-400' },
  review: { label: '\u5BA1\u6838\u4E2D', color: 'bg-amber-900/60 text-amber-400' },
  done: { label: '\u5DF2\u5B8C\u6210', color: 'bg-green-900/60 text-green-400' },
}

export default function CampaignSidebar() {
  return (
    <aside className="w-[220px] border-r border-[#2a2a35] bg-[#16161d] shrink-0 flex flex-col h-full overflow-hidden">
      {/* Logo block */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white leading-none">
          AI
        </div>
        <div>
          <div className="text-lg font-bold text-white leading-tight">
            Tidal
          </div>
          <div className="text-xs text-gray-500">
            {'\u667A\u80FD\u5B9A\u4EF7\u4E0E\u4F1A\u573A\u751F\u6210'}
          </div>
        </div>
      </div>

      {/* Nav section */}
      <div className="mt-2">
        <div className="px-3 mb-1 text-xs uppercase text-gray-500 tracking-wider">
          AI {'\u64CD\u76D8\u4E2D\u67A2'}
        </div>
        <div className="border-l-2 border-indigo-400 bg-[#1e1e28] px-3 py-2 text-sm text-white cursor-default">
          {'\u667A\u80FD\u5B9A\u4EF7\u7BA1\u7EBF'}
        </div>
        <div className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300 cursor-pointer transition-colors">
          {'\u6298\u6263\u6D1E\u5BDF\u5206\u6790'}
        </div>
      </div>

      {/* Task history */}
      <div className="mt-4 flex-1 overflow-y-auto min-h-0">
        <div className="px-3 mb-1 text-xs uppercase text-gray-500 tracking-wider">
          {'\u8FD1\u671F\u4EFB\u52A1'}
        </div>
        <div className="space-y-1">
          {MOCK_TASK_HISTORY.map((task) => {
            const st = STATUS_STYLE[task.status]
            return (
              <div
                key={task.id}
                className="bg-[#1e1e28] rounded-lg p-2 mx-2 cursor-pointer hover:bg-[#252530] transition-colors"
              >
                <div className="text-sm text-white truncate">{task.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-400">{task.market}</span>
                  <span className="text-[10px] bg-indigo-900/50 text-indigo-300 rounded px-1">
                    {(task.targetMargin * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`text-[10px] rounded px-1 ${st.color}`}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom badge */}
      <div className="py-3 text-center text-[10px] text-gray-600 uppercase tracking-wider leading-snug shrink-0">
        Human-in-the-loop
        <br />
        PRICING COMMANDER
      </div>
    </aside>
  )
}
