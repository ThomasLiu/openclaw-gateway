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
const MAX_TOTAL_LOGS = 40;
const STORAGE_KEY = "openclaw-logs-levels";

type LoadState = "loading" | "done" | "loading-more" | "exhausted" | "error";

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
  const autoScrollModeRef = useRef(true);

  useEffect(() => {
    autoScrollModeRef.current = autoScrollMode;
  }, [autoScrollMode]);

  const [pendingCount, setPendingCount] = useState(0);
  const pendingCountRef = useRef(0);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const isScrollingRef = useRef(false);
  const isMountedRef = useRef(false);

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

  const filteredLogs = logs.filter((l) => {
    if (!selectedLevels.has(l.level)) return false;
    if (
      textFilter &&
      !l.message.toLowerCase().includes(textFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const visibleLogs = filteredLogs.slice(-PAGE_SIZE);

  // 加载初始日志
  const loadInitialLogs = useCallback(async () => {
    setLoadState("loading");
    setHasMoreHistory(true);
    setLoadingHistory(false);
    setPendingCount(0);
    pendingCountRef.current = 0;
    setAutoScrollMode(true);
    autoScrollModeRef.current = true;

    try {
      const params = new URLSearchParams();
      params.append("cursor", "0");
      params.append("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/openclaw/logs/history?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();

      const initialLogs = result.entries.map((entry: any, index: number) => ({
        id: `log-initial-${Date.now()}-${index}`,
        level: entry.level as LogEntry["level"] ?? "info",
        message: entry.message,
        timestamp: new Date(entry.timestamp),
      }));

      setLogs(initialLogs);
      setHasMoreHistory(result.hasMore);
      setLoadState("done");

      // 滚动到底部
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    } catch (error) {
      console.error("[Frontend Logs] Failed to load initial logs:", error);
      setLoadState("error");
    }
  }, []);

  // 加载更多历史日志
  const loadMoreHistory = useCallback(async () => {
    if (loadingHistory || !hasMoreHistory || logs.length === 0) {
      return;
    }

    setLoadingHistory(true);
    setLoadState("loading-more");

    try {
      // 简单实现：由于没有保存历史 cursor，我们暂时不支持加载更多历史
      // 实际项目中需要保存 historyCursor 状态
      setHasMoreHistory(false);
      setLoadState("done");
    } catch (error) {
      console.error("[Frontend Logs] Failed to load more history:", error);
      setLoadState("error");
    } finally {
      setLoadingHistory(false);
    }
  }, [loadingHistory, hasMoreHistory, logs.length]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distToBottom < 40;
    const nearTop = scrollTop < 100;

    // 已在底部且是自动模式：忽略
    if (autoScrollMode && nearBottom) {
      return;
    }

    // 从底部往上滚：切换到手动模式
    if (autoScrollMode && !nearBottom && scrollTop > 50) {
      isScrollingRef.current = true;
      autoScrollModeRef.current = false;
      setAutoScrollMode(false);
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
      return;
    }

    // 手动模式
    if (!autoScrollMode) {
      if (nearTop) {
        loadMoreHistory();
      } else if (nearBottom) {
        isScrollingRef.current = true;
        autoScrollModeRef.current = true;
        setAutoScrollMode(true);
        setPendingCount(0);
        pendingCountRef.current = 0;
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          if (el) {
            el.scrollTop = el.scrollHeight - el.clientHeight;
          }
        });
      }
    }
  }, [autoScrollMode, loadMoreHistory]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    autoScrollModeRef.current = true;
    setAutoScrollMode(true);
    setPendingCount(0);
    pendingCountRef.current = 0;
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, []);

  // SSE 连接
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connect() {
      if (es) {
        es.close();
        es = null;
      }

      try {
        es = new EventSource("/api/openclaw/logs");
        reconnectAttempts = 0;

        es.onopen = () => {};

        es.onmessage = (e) => {
          if (e.data.startsWith(":")) {
            return;
          }
          try {
            const data = JSON.parse(e.data);
            const entry: LogEntry = {
              id: `log-${++counterRef.current}`,
              level: (data.level as LogEntry["level"]) ?? "info",
              message: data.message ?? String(data),
              timestamp: new Date(data.timestamp ?? Date.now()),
            };

            if (autoScrollModeRef.current) {
              setLogs((prev) => {
                const next = [...prev, entry];
                const updated = next.length > MAX_TOTAL_LOGS
                  ? next.slice(-MAX_TOTAL_LOGS)
                  : next;
                return updated;
              });

              // 滚动到底部
              setTimeout(() => {
                if (containerRef.current && autoScrollModeRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              }, 0);
            } else {
              pendingCountRef.current += 1;
              setPendingCount(pendingCountRef.current);
            }
          } catch (error) {
            console.error("[Frontend Logs] Failed to parse SSE message:", error);
          }
        };

        es.onerror = (error) => {
          console.error("[Frontend Logs] SSE connection error:", error);
          if (es) {
            es.close();
            es = null;
          }

          reconnectAttempts++;
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectTimeout = setTimeout(connect, 3000);
          } else {
            console.error("[Frontend Logs] Max reconnect attempts reached. Stopping reconnect attempts.");
          }
        };
      } catch (error) {
        console.error("[Frontend Logs] Failed to connect to SSE:", error);

        reconnectAttempts++;
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeout = setTimeout(connect, 3000);
        } else {
          console.error("[Frontend Logs] Max reconnect attempts reached. Stopping reconnect attempts.");
        }
      }
    }

    // 先加载初始日志
    loadInitialLogs().then(() => {
      connect();
    });

    return () => {
      if (es) {
        es.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [loadInitialLogs]);

  // 当筛选条件改变时，重新加载初始日志
  useEffect(() => {
    if (isMountedRef.current) {
      loadInitialLogs();
    } else {
      isMountedRef.current = true;
    }
  }, [selectedLevels, textFilter, loadInitialLogs]);

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
                ) : !hasMoreHistory ? (
                  "已加载全部历史日志"
                ) : (
                  "↑ 距顶部 100px 时加载更多"
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
              : `${Math.min(filteredLogs.length, filteredLogs.length)} / ${filteredLogs.length} 条`}
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
