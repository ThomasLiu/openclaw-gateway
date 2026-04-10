// ============================================================
// OpenClaw Chat - LogPanelTab 组件
// 日志面板 - 支持虚拟滚动、智能过滤、搜索高亮、反向分页
// ============================================================

"use client";

import React, { 
  useState, 
  useRef, 
  useEffect, 
  useCallback, 
  useMemo,
  memo 
} from "react";
import { useTranslations } from "next-intl";
import { useVirtualizer } from "@tanstack/react-virtual";
import { 
  Terminal, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ArrowDown, 
  AlertTriangle, 
  XCircle, 
  Bug, 
  Info, 
  AlertCircle,
  Users,
  Maximize2,
  RotateCcw
} from "lucide-react";

// ==================== 类型定义 ====================

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  raw: string;
}

interface LogFilters {
  levels: Set<LogEntry['level']>;
  sources: Set<string>;
  searchQuery: string;
}

interface LogPanelProps {
  agentId?: string;
  initialLogs?: LogEntry[];
  onCollaborate?: (logEntry: LogEntry) => void;
  onNewLog?: (log: LogEntry) => void;
  onLoadOlder?: () => Promise<LogEntry[]>;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
  className?: string;
}

// ==================== 常量 ====================

const LOG_LEVELS: LogEntry['level'][] = ['debug', 'info', 'warn', 'error', 'fatal'];
const MAX_MESSAGE_LENGTH = 500;
const SCROLL_THRESHOLD = 100; // 距离底部多少像素算"在底部"
const SEARCH_DEBOUNCE_MS = 300;
const STORAGE_KEY = 'log-panel-filters';

// ==================== Level 配置 ====================

const LEVEL_CONFIG = {
  debug: {
    icon: Bug,
    label: 'DEBUG',
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-l-gray-400',
    badgeClass: 'bg-gray-500/20 text-gray-300'
  },
  info: {
    icon: Info,
    label: 'INFO',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-l-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300'
  },
  warn: {
    icon: AlertTriangle,
    label: 'WARN',
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-l-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-300'
  },
  error: {
    icon: XCircle,
    label: 'ERROR',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-l-red-400',
    badgeClass: 'bg-red-500/20 text-red-300'
  },
  fatal: {
    icon: AlertCircle,
    label: 'FATAL',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-900/20',
    borderClass: 'border-l-red-600',
    badgeClass: 'bg-red-900/30 text-red-400 font-bold'
  }
};

// ==================== 辅助函数 ====================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function truncateMessage(message: string, maxLength: number = MAX_MESSAGE_LENGTH): { 
  text: string; 
  isTruncated: boolean 
} {
  if (message.length <= maxLength) {
    return { text: message, isTruncated: false };
  }
  return { 
    text: message.substring(0, maxLength) + '...', 
    isTruncated: true 
  };
}

function highlightText(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text];
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ==================== 子组件 ====================

// Level Badge 组件
const LevelBadge = memo(({ level }: { level: LogEntry['level'] }) => {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${config.badgeClass}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
});

LevelBadge.displayName = 'LevelBadge';

// Log Entry 行组件
const LogEntryRow = memo(({
  log,
  isExpanded,
  onToggleExpand,
  searchQuery,
  onCollaborate
}: {
  log: LogEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchQuery: string;
  onCollaborate?: (logEntry: LogEntry) => void;
}) => {
  const config = LEVEL_CONFIG[log.level];
  const { text, isTruncated } = truncateMessage(log.message);
  const displayText = isExpanded && isTruncated ? log.message : text;
  const isErrorOrWarn = log.level === 'error' || log.level === 'warn';

  return (
    <div 
      className={`log-entry log-entry-${log.level} border-l-2 ${config.borderClass} ${config.bgClass} px-3 py-2 hover:bg-white/5 transition-colors group ${isErrorOrWarn ? 'error-highlighted' : ''}`}
      data-log-id={log.id}
      data-log-level={log.level}
    >
      <div className="flex items-start gap-2 text-xs">
        {/* Timestamp */}
        <span className="font-mono text-text-muted whitespace-nowrap shrink-0">
          {formatTimestamp(log.timestamp)}
        </span>

        {/* Level Badge */}
        <span className="shrink-0">
          <LevelBadge level={log.level} />
        </span>

        {/* Source */}
        <span className="font-mono text-text-muted shrink-0 max-w-[120px] truncate">
          [{log.source}]
        </span>

        {/* Message */}
        <div 
          className={`flex-1 min-w-0 ${isTruncated && !isExpanded ? 'cursor-pointer' : ''}`}
          onClick={isTruncated ? onToggleExpand : undefined}
        >
          <span className={`log-message break-all ${isExpanded ? 'expanded' : ''} ${isTruncated && !isExpanded ? 'truncated' : ''}`}>
            {searchQuery ? highlightText(displayText, searchQuery) : displayText}
          </span>
          {isTruncated && !isExpanded && (
            <button 
              className="ml-2 text-xs text-blue-400 hover:text-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              展开
            </button>
          )}
        </div>

        {/* Collaborate Button for errors/warnings */}
        {isErrorOrWarn && onCollaborate && (
          <button
            className="collaborate-btn opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
            onClick={() => onCollaborate(log)}
            title="协作排查"
          >
            <Users size={14} className="text-text-muted hover:text-blue-400" />
          </button>
        )}
      </div>
    </div>
  );
});

LogEntryRow.displayName = 'LogEntryRow';

// ==================== 主组件 ====================

export function LogPanelTab({
  agentId,
  initialLogs = [],
  onCollaborate,
  onNewLog,
  onLoadOlder,
  hasMoreOlder = false,
  isLoadingOlder = false,
  className = ""
}: LogPanelProps) {
  const t = useTranslations("detailPanel.logPanel");

  // ==================== 状态管理 ====================
  
  // 日志数据
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [bufferedLogs, setBufferedLogs] = useState<LogEntry[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(initialLogs.length === 0);

  useEffect(() => {
    if (initialLogs.length > 0) return;
    setIsLoadingInitial(true);
    import('@/lib/actions').then(({ getLogs }) => getLogs())
      .then((rawLogs) => {
        const entries: LogEntry[] = (rawLogs as any[]).map((line, i) => {
          if (typeof line === 'string') {
            try {
              const parsed = JSON.parse(line);
              return {
                id: `log-${i}`,
                timestamp: parsed.timestamp ?? Date.now(),
                level: (parsed.level ?? 'info') as LogEntry['level'],
                source: parsed.source ?? parsed.module ?? 'system',
                message: parsed.message ?? parsed.msg ?? line,
                raw: line,
              };
            } catch {
              return {
                id: `log-${i}`,
                timestamp: Date.now(),
                level: 'info' as const,
                source: 'system',
                message: line,
                raw: line,
              };
            }
          }
          return {
            id: `log-${i}`,
            timestamp: (line as any).timestamp ?? Date.now(),
            level: ((line as any).level ?? 'info') as LogEntry['level'],
            source: (line as any).source ?? (line as any).module ?? 'system',
            message: (line as any).message ?? (line as any).msg ?? JSON.stringify(line),
            raw: JSON.stringify(line),
          };
        });
        setLogs(entries);
      })
      .catch(() => {})
      .finally(() => setIsLoadingInitial(false));
  }, [initialLogs.length]);
  
  // 滚动状态
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  
  // 展开状态
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  // 过滤器状态
  const [filters, setFilters] = useState<LogFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          levels: new Set(parsed.levels || LOG_LEVELS),
          sources: new Set(parsed.sources || []),
          searchQuery: parsed.searchQuery || ''
        };
      }
    } catch {}
    
    return {
      levels: new Set(LOG_LEVELS),
      sources: new Set<string>(),
      searchQuery: ''
    };
  });
  
  // 搜索状态
  const [searchInputValue, setSearchInputValue] = useState(filters.searchQuery);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // Loading 状态
  const [isLoadingTop, setIsLoadingTop] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== 过滤后的日志 ====================
  
  const filteredLogs = useMemo(() => {
    let result = logs;
    
    // 级别过滤
    if (filters.levels.size < LOG_LEVELS.length) {
      result = result.filter(log => filters.levels.has(log.level));
    }
    
    // 来源过滤
    if (filters.sources.size > 0) {
      result = result.filter(log => filters.sources.has(log.source));
    }
    
    // 搜索过滤
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.raw.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [logs, filters]);

  // 搜索匹配结果
  const searchMatches = useMemo(() => {
    if (!filters.searchQuery.trim()) return [];
    
    return filteredLogs.reduce<(number & { logId: string })[]>((matches, log, index) => {
      if (log.message.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        matches.push(index as number & { logId: string });
      }
      return matches;
    }, []);
  }, [filteredLogs, filters.searchQuery]);

  // 唯一来源列表
  const uniqueSources = useMemo(() => {
    const sources = new Set(logs.map(log => log.source));
    return Array.from(sources).sort();
  }, [logs]);

  // ==================== 虚拟滚动配置 ====================
  
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 40, // 每行大约高度
    overscan: 5
  });

  // ==================== 事件处理 ====================

  // 处理新日志到达
  const handleNewLog = useCallback((log: LogEntry) => {
    if (onNewLog) {
      onNewLog(log);
    }
    
    if (isAutoScrolling) {
      setLogs(prev => [...prev, log]);
    } else {
      setBufferedLogs(prev => [...prev, log]);
      setShowFloatingBar(true);
    }
  }, [isAutoScrolling, onNewLog]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // 判断是否在底部
    const isAtBottom = distanceFromBottom <= SCROLL_THRESHOLD;
    
    setIsAutoScrolling(isAtBottom);
    
    if (isAtBottom && bufferedLogs.length > 0) {
      // 回到底部时插入缓冲日志
      setLogs(prev => [...prev, ...bufferedLogs]);
      setBufferedLogs([]);
      setShowFloatingBar(false);
    }

    // 反向分页检测
    if (scrollTop <= 50 && hasMoreOlder && !isLoadingTop && onLoadOlder) {
      loadOlderLogs();
    }
  }, [bufferedLogs, hasMoreOlder, isLoadingTop, onLoadOlder]);

  // 加载更旧日志
  const loadOlderLogs = useCallback(async () => {
    if (!onLoadOlder || isLoadingTop) return;
    
    setIsLoadingTop(true);
    try {
      const olderLogs = await onLoadOlder();
      setLogs(prev => [...olderLogs, ...prev]);
    } catch (error) {
      console.error('Failed to load older logs:', error);
    } finally {
      setIsLoadingTop(false);
    }
  }, [onLoadOlder, isLoadingTop]);

  // 回到底部
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    setIsAutoScrolling(true);
    
    // 插入缓冲日志
    if (bufferedLogs.length > 0) {
      setLogs(prev => [...prev, ...bufferedLogs]);
      setBufferedLogs([]);
    }
    setShowFloatingBar(false);
  }, [bufferedLogs]);

  // 切换展开/折叠
  const toggleExpand = useCallback((logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }, []);

  // 切换级别过滤器
  const toggleLevelFilter = useCallback((level: LogEntry['level']) => {
    setFilters(prev => {
      const nextLevels = new Set(prev.levels);
      if (nextLevels.has(level)) {
        nextLevels.delete(level);
      } else {
        nextLevels.add(level);
      }
      
      const next = { ...prev, levels: nextLevels };
      
      // 持久化到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          levels: Array.from(nextLevels),
          sources: Array.from(next.sources),
          searchQuery: next.searchQuery
        }));
      } catch {}
      
      return next;
    });
  }, []);

  // 切换来源过滤器
  const toggleSourceFilter = useCallback((source: string) => {
    setFilters(prev => {
      const nextSources = new Set(prev.sources);
      if (nextSources.has(source)) {
        nextSources.delete(source);
      } else {
        nextSources.add(source);
      }
      
      const next = { ...prev, sources: nextSources };
      
      // 持久化
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          levels: Array.from(next.levels),
          sources: Array.from(next.sources),
          searchQuery: next.searchQuery
        }));
      } catch {}
      
      return next;
    });
  }, []);

  // 搜索输入处理（带 debounce）
  const handleSearchChange = useCallback((value: string) => {
    setSearchInputValue(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchQuery: value }));
      setCurrentMatchIndex(0);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // 搜索导航
  const navigateSearch = useCallback((direction: 'prev' | 'next') => {
    if (searchMatches.length === 0) return;
    
    setCurrentMatchIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % searchMatches.length;
      } else {
        return prev === 0 ? searchMatches.length - 1 : prev - 1;
      }
    });

    // 滚动到对应位置
    const targetIndex = direction === 'next' 
      ? (currentMatchIndex + 1) % searchMatches.length
      : currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    
    virtualizer.scrollToIndex(searchMatches[targetIndex] as number, { align: 'center' });
  }, [searchMatches, currentMatchIndex, virtualizer]);

  // ==================== Effects ====================

  // 监听滚动
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 新日志时自动滚动到底部
  useEffect(() => {
    if (isAutoScrolling && logs.length > 0) {
      scrollToBottom();
    }
  }, [logs.length, isAutoScrolling]); // eslint-disable-line react-hooks/exhaustive-deps

  // 清理 debounce timer
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className={`log-panel-tab flex flex-col h-full bg-bg-primary ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Terminal size={14} />
          {t("title")}
        </h3>
        
        {/* 搜索框 */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              className="log-search-input pl-7 pr-8 py-1 text-xs bg-bg-primary border border-border-primary rounded w-48 focus:outline-none focus:border-blue-500"
              placeholder={t("searchPlaceholder")}
              value={searchInputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchInputValue && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                onClick={() => handleSearchChange('')}
              >
                <XCircle size={12} />
              </button>
            )}
          </div>
          
          {/* 搜索结果导航 */}
          {searchMatches.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span>{currentMatchIndex + 1}/{searchMatches.length}</span>
              <button
                className="search-prev-btn p-0.5 hover:bg-white/10 rounded"
                onClick={() => navigateSearch('prev')}
                disabled={searchMatches.length <= 1}
              >
                <ChevronUp size={14} />
              </button>
              <button
                className="search-next-btn p-0.5 hover:bg-white/10 rounded"
                onClick={() => navigateSearch('next')}
                disabled={searchMatches.length <= 1}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          
          {/* 过滤按钮 */}
          <button
            className="p-1 hover:bg-white/10 rounded relative"
            title={t("filter")}
          >
            <Filter size={14} className="text-text-muted" />
            {(filters.levels.size < LOG_LEVELS.length || filters.sources.size > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary/50 flex items-center gap-4 text-xs overflow-x-auto">
        {/* Level Filter */}
        <div className="log-level-filter flex items-center gap-2 shrink-0">
          <Filter size={12} className="text-text-muted" />
          <label className="text-text-muted">级别:</label>
          {LOG_LEVELS.map(level => (
            <label key={level} className="flex items-center gap-1 cursor-pointer hover:text-text-primary">
              <input
                type="checkbox"
                checked={filters.levels.has(level)}
                onChange={() => toggleLevelFilter(level)}
                value={level}
                className="w-3 h-3 rounded"
              />
              <span className={`${LEVEL_CONFIG[level].colorClass}`}>{LEVEL_CONFIG[level].label}</span>
            </label>
          ))}
        </div>

        {/* Source Filter */}
        {uniqueSources.length > 0 && (
          <div className="log-source-filter flex items-center gap-2 shrink-0">
            <label className="text-text-muted">来源:</label>
            <select
              multiple
              size={1}
              className="bg-bg-primary border border-border-primary rounded px-1 max-w-[150px]"
              value={Array.from(filters.sources)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                // 简化处理：直接设置
                setFilters(prev => ({
                  ...prev,
                  sources: new Set(selected)
                }));
              }}
            >
              {uniqueSources.map(source => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Scroll Container with Virtual Scrolling */}
      <div 
        ref={scrollContainerRef}
        className="log-scroll-container flex-1 overflow-y-auto relative"
      >
        {/* Older Logs Loader */}
        {isLoadingTop && (
          <div className="log-loader sticky top-0 z-10 flex items-center justify-center py-4 bg-bg-primary">
            <RotateCcw size={16} className="animate-spin text-text-muted mr-2" />
            <span className="text-xs text-text-muted">{t("loading")}</span>
          </div>
        )}

        {/* Virtual List */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const log = filteredLogs[virtualRow.index];
            if (!log) return null;

            return (
              <div
                key={log.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <LogEntryRow
                  log={log}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggleExpand={() => toggleExpand(log.id)}
                  searchQuery={filters.searchQuery}
                  onCollaborate={onCollaborate}
                />
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && !isLoadingTop && (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Terminal size={48} className="mb-4 opacity-20" />
            <p className="text-sm">{t("empty")}</p>
            {(filters.levels.size < LOG_LEVELS.length || filters.sources.size > 0 || filters.searchQuery) && (
              <button
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                onClick={() => {
                  setFilters({
                    levels: new Set(LOG_LEVELS),
                    sources: new Set(),
                    searchQuery: ''
                  });
                  setSearchInputValue('');
                }}
              >
                {t("clearFilters")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Bar (New Logs Indicator) */}
      {showFloatingBar && bufferedLogs.length > 0 && (
        <div 
          className="log-floating-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-bg-secondary border border-border-primary shadow-lg rounded-lg px-4 py-2 flex items-center gap-3 text-xs group"
          onMouseEnter={(e) => {
            // Show tooltip with latest log preview
            const tooltip = e.currentTarget.querySelector('.log-tooltip');
            if (tooltip) {
              (tooltip as HTMLElement).style.display = 'block';
            }
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.querySelector('.log-tooltip');
            if (tooltip) {
              (tooltip as HTMLElement).style.display = 'none';
            }
          }}
        >
          <span className="text-text-muted">
            {bufferedLogs.length} {t("newLogs")}
          </span>
          
          {/* Tooltip with latest log preview */}
          <div 
            className="log-tooltip hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg-primary border border-border-primary rounded p-2 shadow-xl min-w-[300px] max-w-[500px]"
          >
            <div className="text-[10px] text-text-muted mb-1">最新日志:</div>
            <div className="text-xs font-mono break-all max-h-32 overflow-y-auto">
              {bufferedLogs[bufferedLogs.length - 1]?.raw}
            </div>
          </div>
          
          <button
            className="scroll-to-bottom-btn flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            onClick={scrollToBottom}
          >
            <ArrowDown size={12} />
            {t("scrollToBottom")}
          </button>
        </div>
      )}
    </div>
  );
}

export default LogPanelTab;
