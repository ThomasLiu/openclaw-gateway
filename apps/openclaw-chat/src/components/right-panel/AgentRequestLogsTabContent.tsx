'use client';

import { useEffect, useRef, useState } from 'react';

interface AgentRequestLogsTabContentProps {
  agentId: string;
}

interface LogEntry {
  type: 'session' | 'error' | 'info' | 'status';
  line?: string;
  message?: string;
  sessionKey?: string;
  agentId?: string;
  model?: string;
  timestamp?: string;
}

interface Diagnostics {
  totalRequests: number;
  totalErrors: number;
  avgDurationMs: number;
}

export function AgentRequestLogsTabContent({ agentId }: AgentRequestLogsTabContentProps) {
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [filter, setFilter] = useState<'all' | 'session' | 'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const data: LogEntry = JSON.parse(e.data);
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const filteredLines = filter === 'all' ? lines : lines.filter((l) => l.type === filter);

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

      {/* Filter bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 border-b border-zinc-800 bg-zinc-900/30">
        {(['all', 'session', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'all' ? '全部' : f === 'session' ? '会话' : '错误'}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setLines([])}
          className="px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          清空
        </button>
      </div>

      {/* Log content */}
      {error ? (
        <div className="p-3 text-xs text-red-400">{error}</div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto font-mono text-xs text-zinc-400 p-2 space-y-0.5 min-h-0"
        >
          {filteredLines.length === 0 && !loading ? (
            <div className="text-center py-8 text-zinc-600">
              {filter === 'error' ? '暂无错误' : '暂无日志'}
            </div>
          ) : (
            filteredLines.map((line, i) => (
              <LogLine key={i} line={line} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LogLine({ line }: { line: LogEntry }) {
  if (line.type === 'error') {
    return (
      <div className="flex items-start gap-1.5 text-red-400">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="mt-0.5 flex-shrink-0">
          <circle cx="5" cy="5" r="4.5" strokeWidth="0" />
          <path d="M5 3v2.5M5 6.5v.5" stroke="black" strokeWidth="1" />
        </svg>
        <span>{line.message}</span>
      </div>
    );
  }

  if (line.type === 'info' || line.type === 'status') {
    return (
      <div className="text-zinc-600 italic pl-4">
        {line.message}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 hover:bg-zinc-800/30 rounded px-1 py-0.5 group">
      <span className="text-zinc-600 flex-shrink-0 select-none">›</span>
      <span className="whitespace-pre-wrap break-all flex-1">
        {line.line ?? line.message ?? ''}
      </span>
      {line.timestamp && (
        <span className="text-zinc-700 flex-shrink-0 ml-2">
          {new Date(line.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
