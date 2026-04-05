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

  // 同步 autoScrollModeRef
  useEffect(() => {
    autoScrollModeRef.current = autoScrollMode;
  }, [autoScrollMode]);

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
  const logsLengthRef = useRef(0);

  // 同步 pendingCountRef
  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);

  // 同步 logsLengthRef
  useEffect(() => {
    logsLengthRef.current = logs.length;
  }, [logs.length]);

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
      // 重置状态，重新回到自动滚动模式
      autoScrollModeRef.current = true;
      setAutoScrollMode(true);
      setDomStartIndex(0);
      setPendingCount(0);
      pendingCountRef.current = 0;
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
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connect() {
      console.log(`[Frontend Logs] Attempting to connect to SSE endpoint... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      // 关闭之前的连接
      if (es) {
        es.close();
        es = null;
      }

      try {
        es = new EventSource("/api/openclaw/logs");
        console.log("[Frontend Logs] SSE connection established");
        reconnectAttempts = 0;

        es.onopen = () => {
          console.log("[Frontend Logs] SSE connection opened");
        };

        es.onmessage = (e) => {
          if (e.data.startsWith(":")) {
            console.log("[Frontend Logs] SSE heartbeat received");
            return;
          }
          console.log("[Frontend Logs] SSE message received:", e.data);
          try {
            const data = JSON.parse(e.data);
            console.log("[Frontend Logs] Parsed log entry:", data);
            const entry: LogEntry = {
              id: `log-${++counterRef.current}`,
              level: (data.level as LogEntry["level"]) ?? "info",
              message: data.message ?? String(data),
              timestamp: new Date(data.timestamp ?? Date.now()),
            };

            console.log("[Frontend Logs] Adding log entry:", entry);
            setLogs((prev) => {
              const next = [...prev, entry];
              const updated = next.length > MAX_TOTAL_LOGS
                ? next.slice(-MAX_TOTAL_LOGS)
                : next;
              console.log("[Frontend Logs] Updated logs length:", updated.length);
              // 直接更新 logsLengthRef，确保在 SSE 回调中能够使用最新的日志长度
              logsLengthRef.current = updated.length;
              return updated;
            });

            console.log("[Frontend Logs] SSE message processed, scheduling scroll logic");
            // 使用 setTimeout 确保 DOM 更新后再执行滚动逻辑
            setTimeout(() => {
              console.log("[Frontend Logs] Executing scroll logic after DOM update");
              const el = containerRef.current;
              if (el) {
                console.log("[Frontend Logs] Current autoScrollModeRef:", autoScrollModeRef.current);
                console.log("[Frontend Logs] Current logsLengthRef:", logsLengthRef.current);
                console.log("[Frontend Logs] Current bottomRef:", bottomRef.current);
                console.log("[Frontend Logs] Container scrollHeight:", el.scrollHeight);
                console.log("[Frontend Logs] Container clientHeight:", el.clientHeight);
                if (autoScrollModeRef.current) {
                  console.log("[Frontend Logs] Auto-scrolling to bottom");
                  // 确保 domStartIndex 指向最新的日志
                  const newDomStartIndex = Math.max(0, logsLengthRef.current - PAGE_SIZE);
                  console.log("[Frontend Logs] Setting domStartIndex to:", newDomStartIndex);
                  setDomStartIndex(newDomStartIndex);
                  // 直接设置 scrollTop 到最底部，确保滚动条在底部
                  const scrollTopValue = el.scrollHeight - el.clientHeight;
                  console.log("[Frontend Logs] Setting scrollTop to:", scrollTopValue);
                  el.scrollTop = scrollTopValue;
                  console.log("[Frontend Logs] After scrollTop set:", el.scrollTop);
                } else {
                  pendingCountRef.current += 1;
                  setPendingCount(pendingCountRef.current);
                  console.log("[Frontend Logs] New logs pending:", pendingCountRef.current);
                }
              } else {
                console.log("[Frontend Logs] Container ref not found");
              }
            }, 0);
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
            // 3秒后重试连接
            console.log(`[Frontend Logs] Reconnecting in 3 seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            reconnectTimeout = setTimeout(connect, 3000);
          } else {
            console.error("[Frontend Logs] Max reconnect attempts reached. Stopping reconnect attempts.");
          }
        };
      } catch (error) {
        console.error("[Frontend Logs] Failed to connect to SSE:", error);
        
        reconnectAttempts++;
        if (reconnectAttempts < maxReconnectAttempts) {
          // 连接失败，3秒后重试
          console.log(`[Frontend Logs] Reconnecting in 3 seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          reconnectTimeout = setTimeout(connect, 3000);
        } else {
          console.error("[Frontend Logs] Max reconnect attempts reached. Stopping reconnect attempts.");
        }
      }
    }

    connect();

    // 初始加载后设置为 done，避免一直显示加载中
    setTimeout(() => {
      console.log("[Frontend Logs] Setting load state to done");
      setLoadState("done");
    }, 1000);

    return () => {
      console.log("[Frontend Logs] Cleaning up SSE connection");
      if (es) {
        es.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) {
      console.log("[Frontend Logs] Scroll event ignored (isScrollingRef is true)");
      return;
    }

    const el = containerRef.current;
    if (!el) {
      console.log("[Frontend Logs] Scroll event ignored (container ref not found)");
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distToBottom < 40;
    const nearTop = scrollTop < 100;
    
    console.log("[Frontend Logs] Scroll event - scrollTop:", scrollTop, "distToBottom:", distToBottom, "nearBottom:", nearBottom, "nearTop:", nearTop, "autoScrollMode:", autoScrollMode);

    // 已在底部且是自动模式：忽略
    if (autoScrollMode && nearBottom) {
      console.log("[Frontend Logs] Scroll event ignored (already at bottom in auto mode)");
      return;
    }

    // 从底部往上滚：切换到手动模式
    // 只有当用户确实在滚动时才切换到手动模式，而不是因为新日志添加导致的 scrollHeight 变化
    if (autoScrollMode && !nearBottom) {
      // 检查是否是用户主动滚动（scrollTop > 0 且滚动距离较大）
      // 当新日志添加时，scrollHeight 会增加，导致 distToBottom 增加，但这不是用户主动滚动
      // 只有当 scrollTop 明显大于 0 时，才认为是用户主动滚动
      if (scrollTop > 50) {
        console.log("[Frontend Logs] Switching to manual mode (user scroll detected)");
        isScrollingRef.current = true;
        autoScrollModeRef.current = false;
        setAutoScrollMode(false);
        const start = Math.max(0, filteredLogs.length - PAGE_SIZE);
        console.log("[Frontend Logs] Setting domStartIndex to:", start);
        setDomStartIndex(start);
        setPendingCount(0);
        pendingCountRef.current = 0;
        setLoadState("done");
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          console.log("[Frontend Logs] isScrollingRef reset to false");
        });
      } else {
        console.log("[Frontend Logs] Not switching to manual mode (scrollTop too small):", scrollTop);
      }
      return;
    }

    // 手动模式
    if (!autoScrollMode) {
      if (nearTop && domStartIndex > 0) {
        console.log("[Frontend Logs] Loading more logs (near top)");
        // 滚动到顶部：加载更老的一页
        isScrollingRef.current = true;
        const nextStart = Math.max(0, domStartIndex - PAGE_SIZE);
        console.log("[Frontend Logs] Setting domStartIndex to:", nextStart);
        const prevHeight = el.scrollHeight;
        setLoadState("loading-more");
        setDomStartIndex(nextStart);
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          el.scrollTop = el.scrollHeight - prevHeight;
          setLoadState("done");
          console.log("[Frontend Logs] More logs loaded");
        });
      } else if (nearBottom) {
        console.log("[Frontend Logs] Switching back to auto mode (near bottom)");
        // 滚动到底部：回到自动模式
        isScrollingRef.current = true;
        autoScrollModeRef.current = true;
        setAutoScrollMode(true);
        setPendingCount(0);
        pendingCountRef.current = 0;
        const start = Math.max(0, filteredLogs.length - PAGE_SIZE);
        console.log("[Frontend Logs] Setting domStartIndex to:", start);
        setDomStartIndex(start);
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
          // 直接设置 scrollTop 到最底部，确保滚动条在底部
          el.scrollTop = el.scrollHeight - el.clientHeight;
          setLoadState("exhausted");
          console.log("[Frontend Logs] Switched back to auto mode");
        });
      } else {
        console.log("[Frontend Logs] Manual mode - no action needed");
      }
    }
  }, [autoScrollMode, domStartIndex, filteredLogs.length]);

  const scrollToBottom = useCallback(() => {
    console.log("[Frontend Logs] scrollToBottom called");
    autoScrollModeRef.current = true;
    setAutoScrollMode(true);
    setPendingCount(0);
    pendingCountRef.current = 0;
    const start = Math.max(0, filteredLogs.length - PAGE_SIZE);
    console.log("[Frontend Logs] Setting domStartIndex to:", start);
    setDomStartIndex(start);
    requestAnimationFrame(() => {
      console.log("[Frontend Logs] Scrolling to bottom");
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      console.log("[Frontend Logs] scrollToBottom completed");
    });
  }, [filteredLogs.length]);

  // 首次挂载：设置 domStartIndex 并滚动到底部
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
            onChange={(e) => {
              setTextFilter(e.target.value);
              // 重置状态，重新回到自动滚动模式
              autoScrollModeRef.current = true;
              setAutoScrollMode(true);
              setDomStartIndex(0);
              setPendingCount(0);
              pendingCountRef.current = 0;
            }}
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
                  "↑ 距顶部 100px 时加载更多"
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
