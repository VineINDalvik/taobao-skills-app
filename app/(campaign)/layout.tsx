export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-[#0f0f14] text-[#e0e0e0]">
      {/* CampaignSidebar placeholder */}
      <aside className="w-[220px] border-r border-[#2a2a35] bg-[#16161d] shrink-0" />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* AgentStream placeholder */}
        <div className="h-[160px] border-t border-[#2a2a35] bg-[#0a0a0f] shrink-0" />
      </div>
    </div>
  );
}
