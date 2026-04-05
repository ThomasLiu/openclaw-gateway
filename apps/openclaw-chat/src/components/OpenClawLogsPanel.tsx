"use client";

/**
 * OpenClawLogsPanel - 右侧日志面板
 * 动态导入（ssr: false），可折叠
 * 显示网关实时日志流
 *
 * 渲染策略：
 * - 日志顺序：最老在上，最新在下
 * - 底部自动滚动时：DOM 只有最新 40 条
 * - 向上滚动查看历史时：分页加载
 */
import { useEffect, useRef, useState, useCallback } from "react";

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

const LEVEL_TAGS: { value: LogEntry["level"]; label: string }[] = [
  { value: "info", label: "信息" },
  { value: "warn", label: "警告" },
  { value: "error", label: "错误" },
];

const PAGE_SIZE = 40;
const MAX_TOTAL_LOGS = 500;
const STORAGE_KEY = "openclaw-logs-levels";

export default function OpenClawLogsPanel({
  width,
}: {
  width: number;
  onClose: () => void;
}) {
  // 多选标签状态
  const [selectedLevels, setSelectedLevels] = useState<Set<LogEntry["level"]>>(() => {
    if (typeof window === "undefined") return new Set(["info", "warn", "error"]);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        const valid = arr.filter((l) => ["info", "warn", "error"].includes(l)) as LogEntry["level"][];
        return valid.length > 0 ? new Set(valid) : new Set(["info", "warn", "error"]);
      }
    } catch {}
    return new Set(["info", "warn", "error"]);
  });

  const [textFilter, setTextFilter] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // 是否固定在底部（自动滚动模式）
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  // DOM 渲染范围的起始索引
  const [domStartIndex, setDomStartIndex] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  // Refs 追踪最新状态（避免闭包问题）
  const pinnedRef = useRef(true);
  pinnedRef.current = pinnedToBottom;
  const pendingCountRef = useRef(0);
  pendingCountRef.current = pendingCount;
  const logsRef = useRef<LogEntry[]>([]);
  const isScrollingRef = useRef(false);
  const isMountedRef = useRef(false);

  const persistLevels = useCallback((levels: Set<LogEntry["level"]>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...levels]));
    } catch {}
  }, []);

  const toggleLevel = useCallback(
    (level: LogEntry["level"]) => {
      setSelectedLevels((prev) => {
        const next = new Set(prev);
        if (next.has(level)) {
          if (next.size === 1) return prev; // 至少保留一个
          next.delete(level);
        } else {
          next.add(level);
        }
        persistLevels(next);
        return next;
      });
    },
    [persistLevels]
  );

  // 过滤后的日志（最老 → 最新）
  const filteredLogs = logs
    .filter((l) => {
      if (!selectedLevels.has(l.level)) return false;
      if (textFilter && !l.message.toLowerCase().includes(textFilter.toLowerCase()))
        return false;
      return true;
    })
    .slice(0, MAX_TOTAL_LOGS);

  // 当前 DOM 渲染的日志
  const visibleLogs = pinnedToBottom
    ? filteredLogs.slice(-PAGE_SIZE)
    : filteredLogs.slice(domStartIndex, domStartIndex + PAGE_SIZE);

  const atOldest = !pinnedToBottom && domStartIndex === 0;
  const hasNewer = !pinnedToBottom && domStartIndex + PAGE_SIZE < filteredLogs.length;

  // SSE 连接
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource("/api/openclaw/logs");

      es.onmessage = (e) => {
        if (e.data.startsWith(":")) return;
        try {
          const data = JSON.parse(e.data);
          const entry: LogEntry = {
            id: `log-${++counterRef.current}`,
            level: (data.level as LogEntry["level"]) ?? "info",
            message: data.message ?? String(data),
            timestamp: new Date(data.timestamp ?? Date.now()),
          };

          setLogs((prev) => {
            const next = [...prev, entry];
            return next.length > MAX_TOTAL_LOGS ? next.slice(-MAX_TOTAL_LOGS) : next;
          });

          if (pinnedRef.current) {
            requestAnimationFrame(() => {
              bottomRef.current?.scrollIntoView({ behavior: "auto" });
            });
          } else {
            pendingCountRef.current += 1;
            setPendingCount(pendingCountRef.current);
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
    };
  }, []);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return;

    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distToBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distToBottom < 8;
    const atTop = scrollTop < 8;

    if (pinnedRef.current && atBottom) {
      // 已经在底部，无需操作
      return;
    }

    if (pinnedRef.current && atTop) {
      // 从底部往上滚：切换到历史浏览模式
      isScrollingRef.current = true;
      const start = Math.max(0, filteredLogs.length - PAGE_SIZE);
      setDomStartIndex(start);
      setPinnedToBottom(false);
      setPendingCount(0);
      pendingCountRef.current = 0;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
      return;
    }

    if (!pinnedRef.current) {
      if (atTop && domStartIndex > 0) {
        // 滚动到顶部：加载更老的一页
        isScrollingRef.current = true;
        const nextStart = Math.max(0, domStartIndex - PAGE_SIZE);
        const prevHeight = el.scrollHeight;

        setDomStartIndex(nextStart);

        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      } else if (atBottom) {
        if (domStartIndex + PAGE_SIZE >= filteredLogs.length) {
          // 已全部加载：回到底部固定模式
          setPinnedToBottom(true);
          setPendingCount(0);
          pendingCountRef.current = 0;
        } else {
          // 还有更新的日志：加载下一页
          isScrollingRef.current = true;
          setDomStartIndex((prev) => prev + PAGE_SIZE);
          requestAnimationFrame(() => {
            isScrollingRef.current = false;
          });
        }
      }
    }
  }, [pinnedToBottom, domStartIndex, filteredLogs.length]);

  const scrollToBottom = useCallback(() => {
    setPinnedToBottom(true);
    setPendingCount(0);
    pendingCountRef.current = 0;
    setDomStartIndex(Math.max(0, filteredLogs.length - PAGE_SIZE));
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [filteredLogs.length]);

  // 首次挂载时固定到底部
  useEffect(() => {
    if (!isMountedRef.current && filteredLogs.length > 0) {
      isMountedRef.current = true;
      setDomStartIndex(Math.max(0, filteredLogs.length - PAGE_SIZE));
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
    }
  }, [filteredLogs.length]);

  return (
    <aside
      className="flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800">
        {/* 多选标签 */}
        <div className="flex items-center gap-1 px-2 pt-2">
          {LEVEL_TAGS.map((tag) => {
            const selected = selectedLevels.has(tag.value);
            const activeColor =
              tag.value === "error"
                ? "bg-red-500/20 text-red-400 border-red-500/50"
                : tag.value === "warn"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                  : "bg-blue-500/20 text-blue-400 border-blue-500/50";
            return (
              <button
                key={tag.value}
                onClick={() => toggleLevel(tag.value)}
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                  selected ? activeColor : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        {/* 文本过滤 */}
        <div className="px-2 py-1.5">
          <input
            type="text"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            placeholder="过滤日志内容..."
            className="w-full text-[11px] bg-zinc-900 text-zinc-300 border border-zinc-700 rounded px-2 py-1 outline-none placeholder-zinc-600 focus:border-zinc-500"
          />
        </div>
      </div>

      {/* 日志列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto font-mono text-[11px] px-2 py-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 py-4 text-center">暂无日志</div>
        ) : (
          <>
            {/* 顶部提示 */}
            {!pinnedToBottom && (
              <div className="text-zinc-600 py-1 text-center text-[10px] sticky top-0 bg-zinc-950 z-10">
                {atOldest
                  ? "已加载全部历史日志"
                  : hasNewer
                    ? "↑ 滚动到顶部加载更老的日志"
                    : "已加载全部日志"}
              </div>
            )}
            {visibleLogs.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-1.5 items-start py-0.5"
                style={{ contain: "content" }}
              >
                <span className="text-zinc-600 flex-shrink-0 select-none w-14">
                  {entry.timestamp.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  className={`flex-shrink-0 select-none w-3 text-center ${
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
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 底部状态栏 + 新日志提示 */}
      <div className="flex-shrink-0 relative">
        {pendingCount > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded-full shadow-lg transition-colors"
          >
            ↓ {pendingCount} 条新日志
          </button>
        )}
        <div className="px-2 py-1 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">
            {pinnedToBottom
              ? `${Math.min(PAGE_SIZE, filteredLogs.length)} 条可见`
              : `${Math.min(domStartIndex + PAGE_SIZE, filteredLogs.length)} / ${filteredLogs.length} 条`}
          </span>
          {pinnedToBottom ? (
            <span className="text-[10px] text-zinc-500">自动滚动</span>
          ) : (
            <span className="text-[10px] text-zinc-600">已暂停</span>
          )}
        </div>
      </div>
    </aside>
  );
}
