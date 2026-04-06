'use client'

import { useState } from 'react'
import CampaignSidebar from '@/components/campaign/CampaignSidebar'
import AgentStream from '@/components/campaign/AgentStream'
import { useCampaignStore } from '@/lib/campaign-store'

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const agentLogs = useCampaignStore((s) => s.agentLogs)

  return (
    <div className="flex h-full bg-[#0f0f14] text-[#e0e0e0]">
      <CampaignSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        <AgentStream
          logs={agentLogs}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>
    </div>
  )
}
