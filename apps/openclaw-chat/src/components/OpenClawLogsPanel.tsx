"use client";

/**
 * OpenClawLogsPanel - 右侧日志面板
 * 动态导入（ssr: false），可折叠
 * 显示网关实时日志流
 */
import { useEffect, useRef, useState } from "react";

export type LogEntry = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: Date;
};

const LOG_COLORS: Record<LogEntry["level"], string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function OpenClawLogsPanel({
  width,
  onClose,
}: {
  width: number;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogEntry["level"] | "all">("all");

  // 建立 SSE 连接获取日志流
  useEffect(() => {
    let es: EventSource;
    let counter = 0;

    function connect() {
      es = new EventSource("/api/openclaw/logs");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const entry: LogEntry = {
            id: `log-${++counter}`,
            level: data.level ?? "info",
            message: data.message ?? String(data),
            timestamp: new Date(data.timestamp ?? Date.now()),
          };
          setLogs((prev) => {
            // 最多保留 500 条
            const next = [...prev, entry];
            return next.length > 500 ? next.slice(-500) : next;
          });
        } catch {
          // 解析失败，当作普通文本
          setLogs((prev) => {
            const entry: LogEntry = {
              id: `log-${++counter}`,
              level: "info",
              message: e.data,
              timestamp: new Date(),
            };
            const next = [...prev, entry];
            return next.length > 500 ? next.slice(-500) : next;
          });
        }
      };

      es.onerror = () => {
        es.close();
        // 3 秒后重连
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
    };
  }, []);

  // 自动滚动
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [logs, autoScroll]);

  // 监听滚动，暂停 autoScroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    setAutoScroll(atBottom);
  };

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <aside
      className="flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs text-zinc-400 font-medium">网关日志</span>
        <div className="flex items-center gap-1">
          {/* 过滤按钮 */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogEntry["level"] | "all")}
            className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 rounded px-1 py-0.5 outline-none"
          >
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
          </select>

        </div>
      </div>

      {/* 日志列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto font-mono text-[11px] px-2 py-1 space-y-0.5"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 py-2 text-center">暂无日志</div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="flex gap-1.5 items-start py-0.5">
              <span className="text-zinc-600 flex-shrink-0 mt-0.5 select-none">
                {entry.timestamp.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={`flex-shrink-0 mt-0.5 select-none ${
                  entry.level === "error"
                    ? "text-red-500"
                    : entry.level === "warn"
                    ? "text-yellow-500"
                    : "text-blue-500"
                }`}
              >
                {entry.level === "error" ? "✕" : entry.level === "warn" ? "!" : "i"}
              </span>
              <span className={`flex-1 break-all ${LOG_COLORS[entry.level]}`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 底部状态栏 */}
      <div className="flex-shrink-0 px-2 py-1 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">{filteredLogs.length} 条日志</span>
        {autoScroll && (
          <span className="text-[10px] text-zinc-600">自动滚动</span>
        )}
      </div>
    </aside>
  );
}
