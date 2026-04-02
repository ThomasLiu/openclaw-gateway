"use client";

import { useEffect, useState } from "react";
import type { GatewaySessionRow } from "./chat-types";
import { OPENCLAW_AGENT_ARCHITECT_ID } from "@/lib/openclaw-agent-architect/constants";

interface AgentSidebarProps {
  agentId: string;
  onSelectAgent: (id: string) => void;
  gatewaySessions: GatewaySessionRow[];
}

interface AgentInfo {
  id: string;
  label: string;
}

function pickLatestSessionRowForAgent(
  sessions: GatewaySessionRow[],
  agentId: string
): GatewaySessionRow | undefined {
  const agentSessions = sessions.filter((s) => s.agentId === agentId);
  if (agentSessions.length === 0) return undefined;
  return agentSessions.reduce((latest, s) =>
    s.updatedAt > latest.updatedAt ? s : latest
  );
}

function formatSessionListRowTime(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

export function AgentSidebar({
  agentId,
  onSelectAgent,
  gatewaySessions,
}: AgentSidebarProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
      })
      .catch(() => {
        setAgents([{ id: "main", label: "main" }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className="w-48 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Agent
      </div>
      {loading ? (
        <div className="px-3 py-2 text-zinc-500 text-sm">加载中…</div>
      ) : (
        <nav className="flex-1 overflow-y-auto">
          {agents.map((agent) => {
            const previewSession = pickLatestSessionRowForAgent(
              gatewaySessions,
              agent.id
            );
            const isArchitect = agent.id === OPENCLAW_AGENT_ARCHITECT_ID;
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 hover:bg-zinc-800 transition-colors ${
                  agent.id === agentId ? "bg-zinc-800 text-white" : "text-zinc-300"
                }`}
              >
                <span className="font-medium truncate">
                  {isArchitect ? "Agent 设计专家" : agent.label}
                </span>
                <span className="text-xs text-zinc-500 truncate">
                  {previewSession
                    ? `${previewSession.preview ?? "暂无消息"} · ${formatSessionListRowTime(previewSession.updatedAt)}`
                    : "暂无消息"}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
