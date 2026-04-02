'use client';

import { useEffect, useState } from 'react';

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

export function SubagentTabContent({ agentId, sessionKey, onSelectSession }: SubagentTabContentProps) {
  const [sessions, setSessions] = useState<SubagentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionKey) {
      // No session selected — nothing to load
      return;
    }

    let cancelled = false;

    fetch(`/api/gateway/sessions?agentId=${encodeURIComponent(agentId)}&spawnedBy=${encodeURIComponent(sessionKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : data.sessions ?? [];
        setSessions(raw as SubagentSession[]);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentId, sessionKey]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">子会话</span>
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
    </div>
  );
}
