'use client';

import { useEffect, useState } from 'react';
import { JsonlLogViewer, type JsonlEntry } from '../JsonlLogViewer';

interface AgentRequestLogsTabContentProps {
  agentId: string;
}

interface Diagnostics {
  totalRequests: number;
  totalErrors: number;
  avgDurationMs: number;
}

export function AgentRequestLogsTabContent({ agentId }: AgentRequestLogsTabContentProps) {
  const [lines, setLines] = useState<JsonlEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fetch diagnostics summary
    fetch(`/api/openclaw/agent-request-diagnostics?agentId=${encodeURIComponent(agentId)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setDiagnostics({
            totalRequests: data.totalRequests ?? 0,
            totalErrors: data.totalErrors ?? 0,
            avgDurationMs: data.avgDurationMs ?? 0,
          });
        }
      })
      .catch(() => {/* ignore diagnostics errors */});

    // SSE stream for live log entries
    const es = new EventSource(
      `/api/openclaw/agent-request-logs?agentId=${encodeURIComponent(agentId)}`
    );

    es.onmessage = (e) => {
      if (cancelled) return;
      try {
        const data: JsonlEntry = JSON.parse(e.data);
        setLines((prev) => {
          const next = [...prev, data].slice(-500);
          return next;
        });
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    es.onerror = () => {
      if (cancelled) return;
      setError('日志流连接失败');
      setLoading(false);
      es.close();
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [agentId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with diagnostics */}
      <div className="flex-shrink-0 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Agent 请求日志</span>
          {loading && (
            <span className="text-xs text-zinc-500 animate-pulse">连接中…</span>
          )}
        </div>
        {diagnostics && (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>请求 {diagnostics.totalRequests}</span>
            {diagnostics.totalErrors > 0 && (
              <span className="text-red-400">错误 {diagnostics.totalErrors}</span>
            )}
            {diagnostics.avgDurationMs > 0 && (
              <span>平均 {diagnostics.avgDurationMs}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Log viewer */}
      {error ? (
        <div className="p-3 text-xs text-red-400">{error}</div>
      ) : (
        <JsonlLogViewer
          entries={lines}
          autoScroll={true}
          maxEntries={500}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
