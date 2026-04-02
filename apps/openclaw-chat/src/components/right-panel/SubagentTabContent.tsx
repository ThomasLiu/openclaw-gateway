'use client';

import { useEffect, useState } from 'react';
import { SubagentPolicyEditModal, type SubagentPolicy, type SubagentPolicyKind } from './SubagentPolicyEditModal';

interface SubagentTabContentProps {
  agentId: string;
  sessionKey?: string;
  onSelectSession?: (sessionKey: string) => void;
}

interface SubagentSession {
  key: string;
  agentId: string;
  label?: string;
  title?: string;
  preview?: string;
  model?: string | null;
  spawnedBy?: string;
  updatedAt: string;
  createdAt: string;
}

interface OpenClawConfig {
  hash?: string;
  agents?: {
    defaults?: {
      subagents?: SubagentPolicy;
    };
    list?: Array<{ id: string; subagents?: SubagentPolicy }>;
  };
  tools?: {
    subagents?: SubagentPolicy;
  };
}

export function SubagentTabContent({ agentId, sessionKey, onSelectSession }: SubagentTabContentProps) {
  const [sessions, setSessions] = useState<SubagentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<OpenClawConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Fetch sessions and config in parallel
    Promise.all([
      sessionKey
        ? fetch(`/api/gateway/sessions?agentId=${encodeURIComponent(agentId)}&spawnedBy=${encodeURIComponent(sessionKey)}`)
            .then((r) => r.json())
            .then((data) => {
              const raw = Array.isArray(data) ? data : data.sessions ?? [];
              return raw as SubagentSession[];
            })
            .catch(() => [] as SubagentSession[])
        : Promise.resolve([] as SubagentSession[]),
      fetch('/api/openclaw/config')
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([sessionData, configData]) => {
      setSessions(sessionData);
      setConfig(configData);
      setError(null);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : '加载失败');
    }).finally(() => {
      setLoading(false);
    });
  }, [agentId, sessionKey]);

  const getCurrentPolicy = (kind: SubagentPolicyKind): SubagentPolicy => {
    if (!config) return {};
    if (kind === 'defaults') return config.agents?.defaults?.subagents ?? {};
    if (kind === 'tools') return config.tools?.subagents ?? {};
    if (kind === 'agent') {
      const agentEntry = config.agents?.list?.find((a) => a.id === agentId);
      return agentEntry?.subagents ?? {};
    }
    return {};
  };

  const handleSave = async (kind: SubagentPolicyKind, policy: SubagentPolicy) => {
    const res = await fetch('/api/openclaw/subagent-policy/patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseHash: config?.hash ?? '',
        kind,
        agentId: kind === 'agent' ? agentId : undefined,
        subagents: policy,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'STALE_HASH') {
        throw new Error('配置已被他人修改，请刷新后重试');
      }
      throw new Error(data.error ?? `保存失败 (${res.status})`);
    }
    // Refresh config
    const newConfig = await fetch('/api/openclaw/config').then((r) => r.json());
    setConfig(newConfig);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400">子会话</span>
        <button
          onClick={() => setShowEditModal(true)}
          className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
        >
          策略
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {!sessionKey ? (
          <div className="p-3 text-xs text-zinc-500">请先选择一个主会话以查看子会话</div>
        ) : loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : error ? (
          <div className="p-3 text-xs text-red-400">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无子会话</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {sessions.map((session) => (
              <button
                key={session.key}
                onClick={() => onSelectSession?.(session.key)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors"
              >
                <div className="text-sm text-zinc-200 font-medium truncate">
                  {session.title ?? session.label ?? session.key}
                </div>
                {session.model && (
                  <div className="text-xs text-zinc-500 mt-0.5">{session.model}</div>
                )}
                {session.preview && (
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">{session.preview}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showEditModal && config && (
        <SubagentPolicyEditModal
          agentId={agentId}
          currentPolicy={getCurrentPolicy('agent')}
          onSave={handleSave}
          onClose={() => {
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
