"use client";

/**
 * OpenClawLogsPanel - 右侧日志面板
 *
 * 设计原则：
 * - autoScrollMode: 自动滚动模式（底部）/ manualMode: 手动模式（用户已滚动）
 * - 切换时机：用户滚动到顶部(且不在底部)时进入 manualMode
 * - 切换回 autoScrollMode：用户滚动到底部时
 * - SSE 收到新日志时：autoScrollMode → scrollIntoView；manualMode → pending++
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

type LoadState = "loading" | "done" | "loading-more" | "exhausted";

export default function OpenClawLogsPanel({
  width,
  onClose,
}: {
  width: number;
  onClose: () => void;
}) {
  const [selectedLevels, setSelectedLevels] = useState<Set<LogEntry["level"]>>(() => {
    if (typeof window === "undefined") return new Set(["info", "warn", "error"]);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        const valid = arr.filter((l) =>
          ["info", "warn", "error"].includes(l)
        ) as LogEntry["level"][];
        return valid.length > 0
          ? new Set(valid)
          : new Set(["info", "warn", "error"]);
      }
    } catch {}
    return new Set(["info", "warn", "error"]);
  });

  const [textFilter, setTextFilter] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // autoScrollMode=true: 自动滚动; autoScrollMode=false: 手动模式
  const [autoScrollMode, setAutoScrollMode] = useState(true);
  // 同步 ref，避免 SSE 回调读到 stale 闭包值
  const autoScrollModeRef = useRef(true);

  // manualMode 时的 DOM 起始索引
  const [domStartIndex, setDomStartIndex] = useState(0);

  // manualMode 时新到的日志数
  const [pendingCount, setPendingCount] = useState(0);

  const [loadState, setLoadState] = useState<LoadState>("loading");

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const pendingCountRef = useRef(0);
  const isScrollingRef = useRef(false);
  const isMountedRef = useRef(false);

  // 同步 pendingCountRef
  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);

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
          if (next.size === 1) return prev;
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

  // 过滤后的完整列表
  const filteredLogs = logs.filter((l) => {
    if (!selectedLevels.has(l.level)) return false;
    if (
      textFilter &&
      !l.message.toLowerCase().includes(textFilter.toLowerCase())
    )
      return false;
    return true;
  });

  // DOM 渲染的切片
  const visibleLogs = autoScrollMode
    ? filteredLogs.slice(-PAGE_SIZE)
    : filteredLogs.slice(domStartIndex, domStartIndex + PAGE_SIZE);

  const atOldest = !autoScrollMode && domStartIndex === 0;
  const hasNewer = !autoScrollMode && domStartIndex + PAGE_SIZE < filteredLogs.length;

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
            return next.length > MAX_TOTAL_LOGS
              ? next.slice(-MAX_TOTAL_LOGS)
              : next;
          });

          // 等 DOM 更新后再判断滚动位置（用 ref 避免闭包 stale）
          requestAnimationFrame(() => {
            const el = containerRef.current;
            if (!el) return;
            if (autoScrollModeRef.current) {
              bottomRef.current?.scrollIntoView({ behavior: "auto" });
            } else {
              pendingCountRef.current += 1;
              setPendingCount(pendingCountRef.current);
            }
          });
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
  }, [autoScrollMode]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distToBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distToBottom < 8;
    const atTop = scrollTop < 8;

    // 已在底部且是自动模式：忽略
    if (autoScrollMode && atBottom) {
      return;
    }

    // 从底部往上滚：切换到手动模式
    if (autoScrollMode && atTop && !atBottom) {
      isScrollingRef.current = true;
      autoScrollModeRef.current = false;
      setAutoScrollMode(false);
      const start = Math.max(0, filteredLogs.length - PAGE_SIZE);
      setDomStartIndex(start);
      setPendingCount(0);
      pendingCountRef.current = 0;
      setLoadState("done");
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
      return;
    }

    // 手动模式
    if (!autoScrollMode) {
      if (atTop && domStartIndex > 0) {
        // 滚动到顶部：加载更老的一页
        isScrollingRef.current = true;
        const nextStart = Math.max(0, domStartIndex - PAGE_SIZE);
        const prevHeight = el.scrollHeight;
        setLoadState("loading-more");
        setDomStartIndex(nextStart);
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          el.scrollTop = el.scrollHeight - prevHeight;
          setLoadState("done");
        });
      } else if (atBottom) {
        // 滚动到底部：回到自动模式
        if (domStartIndex + PAGE_SIZE >= filteredLogs.length) {
          // 已全部加载
          autoScrollModeRef.current = true;
          setAutoScrollMode(true);
          setPendingCount(0);
          pendingCountRef.current = 0;
          setLoadState("exhausted");
        } else {
          // 加载更新的日志（往新方向翻页）
          isScrollingRef.current = true;
          setDomStartIndex((prev) => prev + PAGE_SIZE);
          requestAnimationFrame(() => {
            isScrollingRef.current = false;
          });
        }
      }
    }
  }, [autoScrollMode, domStartIndex, filteredLogs.length]);

  const scrollToBottom = useCallback(() => {
    autoScrollModeRef.current = true;
    setAutoScrollMode(true);
    setPendingCount(0);
    pendingCountRef.current = 0;
    setDomStartIndex(Math.max(0, filteredLogs.length - PAGE_SIZE));
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [filteredLogs.length]);

  // 首次挂载
  useEffect(() => {
    if (!isMountedRef.current && filteredLogs.length > 0) {
      isMountedRef.current = true;
      setDomStartIndex(Math.max(0, filteredLogs.length - PAGE_SIZE));
      setLoadState("done");
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
            return (
              <button
                key={tag.value}
                onClick={() => toggleLevel(tag.value)}
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                  selected
                    ? tag.value === "error"
                      ? "bg-red-500/20 text-red-400 border-red-500/50"
                      : tag.value === "warn"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
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
          <div className="text-zinc-600 py-4 text-center">
            {loadState === "loading" ? "加载中..." : "暂无日志"}
          </div>
        ) : (
          <>
            {/* 顶部提示 */}
            {!autoScrollMode && (
              <div className="text-zinc-600 py-1 text-center text-[10px] sticky top-0 bg-zinc-950 z-10">
                {loadState === "loading-more" ? (
                  "加载中..."
                ) : atOldest ? (
                  "已加载全部历史日志"
                ) : hasNewer ? (
                  "↑ 滚动到顶部加载更老的日志"
                ) : (
                  "已加载全部日志"
                )}
              </div>
            )}
            {visibleLogs.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-1.5 items-start py-0.5"
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
                  {entry.level === "error"
                    ? "✕"
                    : entry.level === "warn"
                      ? "!"
                      : "i"}
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

      {/* 底部状态栏 + 新日志浮窗 */}
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
            {autoScrollMode
              ? `${Math.min(PAGE_SIZE, filteredLogs.length)} 条可见`
              : `${Math.min(domStartIndex + PAGE_SIZE, filteredLogs.length)} / ${filteredLogs.length} 条`}
          </span>
          {autoScrollMode ? (
            <span className="text-[10px] text-zinc-500">自动滚动</span>
          ) : (
            <span className="text-[10px] text-zinc-600">已暂停</span>
          )}
        </div>
      </div>
    </aside>
  );
}
