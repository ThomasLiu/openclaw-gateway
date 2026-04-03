'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single parsed JSONL line entry */
export interface JsonlEntry {
  /** ISO timestamp string, if available */
  timestamp?: string;
  /** Agent ID that produced this entry */
  agentId?: string;
  /** Session key associated with this entry */
  sessionKey?: string;
  /** Run / request ID */
  runId?: string;
  /** Model used in the request */
  model?: string;
  /** Request duration in milliseconds */
  durationMs?: number;
  /** Number of messages exchanged */
  messageCount?: number;
  /** Status of the request */
  status?: 'success' | 'error' | 'streaming' | 'pending';
  /** Human-readable summary */
  summary?: string;
  /** Raw line text (for unparsed lines) */
  line?: string;
  /** Entry type for filtering */
  type?: 'session' | 'error' | 'info' | 'status' | 'request' | 'response';
  /** Additional free-form fields */
  [key: string]: unknown;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface JsonlLogViewerProps {
  /** Optional className for the root element */
  className?: string;
  /** Entries to display (already parsed) */
  entries?: JsonlEntry[];
  /** Whether to auto-scroll to the bottom */
  autoScroll?: boolean;
  /** Maximum number of entries to keep in memory (default 500) */
  maxEntries?: number;
  /** Called when user clicks on a session key */
  onSessionClick?: (sessionKey: string) => void;
  /** Custom entry renderer */
  renderEntry?: (entry: JsonlEntry) => React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleTimeString();
  } catch {
    return ts;
  }
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(status: JsonlEntry['status']): string {
  switch (status) {
    case 'success': return 'text-green-400';
    case 'error':   return 'text-red-400';
    case 'streaming': return 'text-blue-400';
    case 'pending': return 'text-yellow-400';
    default:        return 'text-zinc-400';
  }
}

function statusLabel(status: JsonlEntry['status']): string {
  switch (status) {
    case 'success': return '成功';
    case 'error':   return '错误';
    case 'streaming': return '进行中';
    case 'pending': return '等待';
    default:        return '未知';
  }
}

const DEFAULT_INDENT = '  ';

/** Pretty-prints a value as indented JSON. Returns React nodes. */
function JsonPretty({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null) return <span className="text-orange-400">null</span>;
  if (value === undefined) return <span className="text-orange-400">undefined</span>;
  if (typeof value === 'boolean') return <span className="text-blue-400">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-purple-400">{String(value)}</span>;
  if (typeof value === 'string') {
    // Collapse very long strings
    const display = value.length > 200 ? value.slice(0, 200) + '\u2026' : value;
    return <span className="text-green-400">{'"'}{display}{'"'}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-500">[]</span>;
    return (
      <>
        <span className="text-zinc-500">{'['}</span>
        {value.map((item, i) => (
          <div key={i} style={{ paddingLeft: DEFAULT_INDENT.repeat(depth + 1) }}>
            <JsonPretty value={item} depth={depth + 1} />
            {i < value.length - 1 && <span className="text-zinc-500">,</span>}
          </div>
        ))}
        <span className="text-zinc-500">{']'}</span>
      </>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-zinc-500">{'{}'}</span>;
    return (
      <>
        <span className="text-zinc-500">{'{'}</span>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ paddingLeft: DEFAULT_INDENT.repeat(depth + 1) }}>
            <span className="text-blue-300">{'"'}{k}{'"'}</span>
            <span className="text-zinc-500">: </span>
            <JsonPretty value={v} depth={depth + 1} />
            {i < entries.length - 1 && <span className="text-zinc-500">,</span>}
          </div>
        ))}
        <span className="text-zinc-500">{'}'}</span>
      </>
    );
  }
  return <span className="text-zinc-400">{String(value)}</span>;
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: JsonlEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onSessionClick?: (sessionKey: string) => void;
  renderEntry?: (entry: JsonlEntry) => React.ReactNode;
}

function EntryRow({ entry, isExpanded, onToggle, onSessionClick, renderEntry }: EntryRowProps) {
  // If there's a custom renderer, use it
  if (renderEntry) {
    return <div className="py-0.5">{renderEntry(entry)}</div>;
  }

  const isExpandable = Object.keys(entry).length > 1 || !!entry.line;

  const row = (
    <div className="flex items-start gap-1.5 hover:bg-zinc-800/30 rounded px-1 py-0.5 cursor-pointer group">
      {/* Expand toggle */}
      {isExpandable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="mt-0.5 flex-shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            {isExpanded
              ? <path d="M2 4l2-2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              : <path d="M2 2l2 2 2-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
          </svg>
        </button>
      ) : (
        <span className="mt-0.5 w-[8px] flex-shrink-0" />
      )}

      {/* Type indicator */}
      <TypeIndicator type={entry.type ?? entry.status} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Primary line */}
        <div className="flex items-center gap-2 flex-wrap">
          {entry.timestamp && (
            <span className="text-zinc-600 text-[10px] flex-shrink-0">
              {formatTimestamp(entry.timestamp)}
            </span>
          )}
          {entry.agentId && (
            <span className="text-amber-400/70 text-xs font-mono truncate">
              {entry.agentId}
            </span>
          )}
          {entry.sessionKey && (
            <button
              onClick={(e) => { e.stopPropagation(); onSessionClick?.(entry.sessionKey!); }}
              className="text-xs text-blue-400/80 hover:text-blue-300 font-mono truncate transition-colors"
              title={entry.sessionKey}
            >
              {entry.sessionKey.split('/').pop() ?? entry.sessionKey}
            </button>
          )}
          {entry.model && (
            <span className="text-zinc-500 text-xs truncate">{entry.model}</span>
          )}
          {entry.status && (
            <span className={`text-xs px-1 rounded ${statusColor(entry.status)} bg-zinc-800`}>
              {statusLabel(entry.status)}
            </span>
          )}
          {entry.durationMs !== undefined && entry.durationMs > 0 && (
            <span className="text-zinc-600 text-xs">
              {formatDuration(entry.durationMs)}
            </span>
          )}
          {entry.messageCount !== undefined && (
            <span className="text-zinc-600 text-xs">
              {entry.messageCount} msg
            </span>
          )}
          {entry.summary && (
            <span className="text-zinc-400 text-xs truncate">{entry.summary}</span>
          )}
        </div>

        {/* Expanded JSON detail */}
        {isExpanded && (
          <div className="mt-1 p-2 bg-zinc-900/80 rounded border border-zinc-800 text-xs font-mono overflow-x-auto">
            <div className="text-zinc-600 mb-1">detail:</div>
            <JsonPretty value={entry} depth={0} />
          </div>
        )}
      </div>
    </div>
  );

  return row;
}

// ─── Type Indicator ────────────────────────────────────────────────────────────

function TypeIndicator({ type }: { type?: string }) {
  const color = type === 'error' || type === 'error'
    ? 'text-red-500'
    : type === 'info' || type === 'status'
    ? 'text-zinc-600'
    : type === 'session' || type === 'request'
    ? 'text-blue-500'
    : 'text-zinc-600';

  const label = type === 'error' ? '!' : type === 'info' || type === 'status' ? 'i' : '›';

  return (
    <span className={`mt-0.5 flex-shrink-0 text-[10px] font-bold w-[10px] leading-[14px] text-center ${color}`}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JsonlLogViewer({
  className = '',
  entries: initialEntries = [],
  autoScroll = true,
  maxEntries: _maxEntries = 500,
  onSessionClick,
  renderEntry,
}: JsonlLogViewerProps) {
  const [entries, setEntries] = useState<JsonlEntry[]>(initialEntries);
  const [filter, setFilter] = useState<'all' | 'session' | 'error' | 'info'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);


  // Expose addEntry via ref pattern — parent can call this
  // (We use a different approach: parent passes entries directly)

  const filteredEntries = filter === 'all'
    ? entries
    : filter === 'error'
    ? entries.filter((e) => e.type === 'error' || e.status === 'error')
    : filter === 'session'
    ? entries.filter((e) => e.type === 'session')
    : entries.filter((e) => e.type === 'info' || e.type === 'status');

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEntries.length, autoScroll]);

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const errorCount = entries.filter((e) => e.type === 'error' || e.status === 'error').length;
  const sessionCount = entries.filter((e) => e.type === 'session').length;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Header / filter bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 border-b border-zinc-800 bg-zinc-900/30">
        {(['all', 'session', 'error', 'info'] as const).map((f) => {
          const count =
            f === 'all' ? entries.length
            : f === 'error' ? errorCount
            : f === 'session' ? sessionCount
            : entries.length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? '全部' : f === 'session' ? '会话' : f === 'error' ? '错误' : '信息'} {count}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => setEntries([])}
          className="px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          清空
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs text-zinc-400 p-2 space-y-0.5 min-h-0"
      >
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">
            {filter === 'error'
              ? '暂无错误'
              : filter === 'session'
              ? '暂无会话日志'
              : filter === 'info'
              ? '暂无信息'
              : '暂无日志'}
          </div>
        ) : (
          filteredEntries.map((entry, i) => (
            <EntryRow
              key={i}
              entry={entry}
              isExpanded={expandedIds.has(i)}
              onToggle={() => toggleExpanded(i)}
              onSessionClick={onSessionClick}
              renderEntry={renderEntry}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Standalone parse function ────────────────────────────────────────────────

/**
 * Parse a raw JSONL string (one JSON object per line) into JsonlEntry[].
 * Lines that fail to parse are returned as { type: 'error', line, summary: 'parse error' }.
 */
export function parseJsonl(raw: string): JsonlEntry[] {
  const entries: JsonlEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as JsonlEntry);
    } catch {
      entries.push({
        type: 'error',
        line: trimmed.slice(0, 200),
        summary: 'JSON 解析失败',
      });
    }
  }
  return entries;
}
