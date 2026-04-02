'use client';

import { useEffect, useState } from 'react';
import { McpDeleteConfirmDialog } from './McpDeleteConfirmDialog';

interface McpServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function McpServicesTabContent() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/openclaw/config')
      .then((r) => r.json())
      .then((data) => {
        // Support both array and object forms
        const raw = data.mcp?.servers;
        if (Array.isArray(raw)) {
          setServers(raw);
        } else if (raw && typeof raw === 'object') {
          // Object form: keys are server names
          const list = Object.entries(raw as Record<string, unknown>).map(([name, val]) => {
            const v = val as Record<string, unknown>;
            return {
              name,
              command: typeof v.command === 'string' ? v.command : '',
              args: Array.isArray(v.args) ? v.args as string[] : [],
              env: (v.env && typeof v.env === 'object') ? v.env as Record<string, string> : undefined,
            };
          });
          setServers(list);
        } else {
          setServers([]);
        }
      })
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/openclaw/mcp-servers/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deleteTarget }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400">MCP 服务</span>
        <span className="text-xs text-zinc-600">{servers.length} 个服务</span>
      </div>

      {deleteError && (
        <div className="flex-shrink-0 px-3 py-2 bg-red-950/50 border-b border-red-900">
          <span className="text-xs text-red-400">删除失败: {deleteError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : servers.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无 MCP 服务</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {servers.map((srv) => (
              <div key={srv.name} className="px-3 py-2.5 group hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-200 font-mono truncate" title={srv.name}>
                      {srv.name}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate" title={`${srv.command} ${(srv.args ?? []).join(' ')}`}>
                      {srv.command}{srv.args && srv.args.length > 0 && ` ${srv.args.join(' ')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(srv.name)}
                    className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors mt-0.5 opacity-0 group-hover:opacity-100"
                    title={`删除 ${srv.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <McpDeleteConfirmDialog
          serverName={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          deleting={deleting}
        />
      )}
    </div>
  );
}
