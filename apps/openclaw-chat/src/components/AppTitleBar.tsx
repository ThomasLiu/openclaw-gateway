"use client";

interface AppTitleBarProps {
  gatewayConnected: boolean;
  onOpenPanel: (tab: string) => void;
  onGatewayAlert: (msg: string | null) => void;
}

export function AppTitleBar({
  gatewayConnected,
  onOpenPanel,
  onGatewayAlert: _onGatewayAlert,
}: AppTitleBarProps) {
  return (
    <header className="h-12 flex-shrink-0 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 z-50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white tracking-tight">
          openClaw Chat
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            gatewayConnected ? "bg-green-500" : "bg-red-500"
          }`}
          title={gatewayConnected ? "网关已连接" : "网关未连接"}
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {(["logs", "skills", "modelManagement"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onOpenPanel(tab)}
            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            {tab === "logs" ? "日志" : tab === "skills" ? "Skill" : "模型"}
          </button>
        ))}
      </div>
    </header>
  );
}
