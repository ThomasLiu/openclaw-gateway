'use client';

import { useEffect, useState } from 'react';

interface AgentTabContentProps {
  agentId: string;
}

interface AgentInfo {
  id: string;
  label: string;
  workspacePath?: string;
  model?: string;
  modelProvider?: string;
  description?: string;
  version?: string;
}

export function AgentTabContent({ agentId }: AgentTabContentProps) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent info from agents endpoint + workspace config
    Promise.all([
      fetch('/api/agents').then((r) => r.json()).catch(() => ({ agents: [] })),
      fetch('/api/openclaw/config').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([agentsData, configData]) => {
        const agents: Array<{ id: string; label: string }> = agentsData.agents ?? [];
        const found = agents.find((a) => a.id === agentId);
        const workspacePath = configData?.workspace?.path;
        const model = configData?.agents?.find?.((a: { id: string }) => a.id === agentId)?.model;
        const version = configData?.version;

        setAgentInfo({
          id: agentId,
          label: found?.label ?? agentId,
          workspacePath,
          model,
          version,
        });
      })
      .catch(() =>
        setAgentInfo({
          id: agentId,
          label: agentId,
        })
      )
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">Agent 信息</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : !agentInfo ? (
          <div className="p-3 text-xs text-zinc-500">未找到 Agent 信息</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            <InfoRow label="ID" value={agentInfo.id} />
            <InfoRow label="名称" value={agentInfo.label} />
            {agentInfo.workspacePath && <InfoRow label="工作区" value={agentInfo.workspacePath} mono />}
            {agentInfo.model && <InfoRow label="模型" value={agentInfo.model} />}
            {agentInfo.version && <InfoRow label="版本" value={agentInfo.version} />}
            <div className="px-3 py-2">
              <div className="text-xs text-zinc-500 mb-1">操作</div>
              <button
                onClick={() => {
                  window.open(`/api/agents/${encodeURIComponent(agentId)}/export`, '_blank');
                }}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
              >
                导出 Agent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-sm text-zinc-200 mt-0.5 ${mono ? 'font-mono text-xs' : ''} break-all`}>
        {value}
      </div>
    </div>
  );
}
