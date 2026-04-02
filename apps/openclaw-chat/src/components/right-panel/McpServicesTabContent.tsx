"use client";

import { useEffect, useState } from "react";

interface McpServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function McpServicesTabContent() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/openclaw/config")
      .then((r) => r.json())
      .then((data) => setServers(data.mcp?.servers ?? []))
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">MCP 服务</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : servers.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无 MCP 服务</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {servers.map((srv) => (
              <div key={srv.name} className="px-3 py-2">
                <div className="text-sm text-zinc-200 font-mono">{srv.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                  {srv.command} {srv.args.join(" ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
