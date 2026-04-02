'use client';

import { useState } from 'react';
import type { GatewaySessionRow } from './chat-types';

interface SessionSidebarProps {
  agentId: string;
  sessionKey?: string;
  gatewaySessions: GatewaySessionRow[];
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
}

export function SessionSidebar({
  agentId,
  sessionKey,
  gatewaySessions,
  onSelectSession,
  onNewSession,
}: SessionSidebarProps) {
  const [search, setSearch] = useState('');
  const agentSessions = gatewaySessions.filter((s) => s.agentId === agentId);
  const filtered = search
    ? agentSessions.filter(
        (s) =>
          s.label?.toLowerCase().includes(search.toLowerCase()) ||
          s.title?.toLowerCase().includes(search.toLowerCase())
      )
    : agentSessions;

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900/50 border-r border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">会话</span>
        <button
          onClick={onNewSession}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
          title="新建会话"
        >
          ＋ 新建
        </button>
      </div>

      <div className="px-2 pb-2">
        <input
          type="text"
          placeholder="搜索会话…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      </div>

      <nav className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-500 text-center">暂无会话</div>
        ) : (
          filtered.map((session) => (
            <button
              key={session.key}
              onClick={() => onSelectSession(session.key)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                session.key === sessionKey ? 'bg-zinc-800 text-white' : 'text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {session.hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
                <span className="truncate font-medium">
                  {session.title || session.label || '无标题'}
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate mt-0.5">{session.preview ?? ''}</div>
            </button>
          ))
        )}
      </nav>
    </aside>
  );
}
