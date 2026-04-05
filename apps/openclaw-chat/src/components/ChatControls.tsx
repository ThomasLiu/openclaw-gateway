"use client";

/**
 * ChatControls - 会话消息列表上方的工具栏
 *
 * 实现参考：ai-reference-sources/openclaw/ui/src/ui/app-render.helpers.ts
 * 中的 renderChatControls 函数
 *
 * 包含 5 个切换按钮：
 * 1. 刷新 - 重新加载当前聊天消息
 * 2. 大脑 - 切换思考内容显示/隐藏
 * 3. 扳手 - 切换工具调用显示/隐藏
 * 4. 聚焦 - 切换聚焦模式
 * 5. 时钟 - 切换隐藏/显示定时任务会话
 */
import { useState, useCallback } from "react";
import { showError } from "./Toast";

interface ChatControlsProps {
  /** 是否正在加载聊天 */
  chatLoading?: boolean;
  /** 是否已连接网关 */
  connected?: boolean;
  /** 是否显示思考内容 */
  showThinking?: boolean;
  /** 是否显示工具调用 */
  showToolCalls?: boolean;
  /** 是否隐藏定时任务会话 */
  hideCron?: boolean;
  /** 隐藏的定时任务数量 */
  hiddenCronCount?: number;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 切换思考内容回调 */
  onToggleThinking?: () => void;
  /** 切换工具调用回调 */
  onToggleToolCalls?: () => void;
  /** 切换隐藏定时任务回调 */
  onToggleHideCron?: () => void;
}

// ============================================================================
// SVG 图标组件
// ============================================================================

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const BrainIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
);

const WrenchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ============================================================================
// ChatControls 主组件
// ============================================================================

export default function ChatControls({
  chatLoading = false,
  connected = true,
  showThinking = true,
  showToolCalls = true,
  hideCron = true,
  hiddenCronCount = 0,
  onRefresh,
  onToggleThinking,
  onToggleToolCalls,
  onToggleHideCron,
}: ChatControlsProps) {
  const [refreshing, setRefreshing] = useState(false);

  // 刷新处理
  const handleRefresh = useCallback(async () => {
    if (refreshing || chatLoading || !connected) return;

    setRefreshing(true);
    try {
      onRefresh?.();
    } finally {
      // 模拟刷新延迟
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [refreshing, chatLoading, connected, onRefresh]);

  // 切换思考内容
  const handleToggleThinking = useCallback(() => {
    onToggleThinking?.();
  }, [onToggleThinking]);

  // 切换工具调用
  const handleToggleToolCalls = useCallback(() => {
    onToggleToolCalls?.();
  }, [onToggleToolCalls]);

  // 切换隐藏定时任务
  const handleToggleHideCron = useCallback(() => {
    onToggleHideCron?.();
  }, [onToggleHideCron]);

  const disabled = chatLoading || !connected;

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 w-full">
      {/* 刷新按钮 */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-md border border-transparent hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={handleRefresh}
        disabled={disabled || refreshing}
        title="刷新会话"
      >
        {refreshing ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        ) : (
          <RefreshIcon />
        )}
      </button>

      {/* 分隔线 */}
      <span className="text-zinc-700 mx-1 select-none">|</span>

      {/* 右侧按钮组 */}
      <div className="flex items-center gap-1 ml-auto">
        {/* 大脑按钮 - 思考 toggle */}
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all ${
            showThinking
              ? "bg-red-500/15 border-red-500/50 text-red-400 hover:bg-red-500/25"
              : "border-transparent hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={handleToggleThinking}
          title={showThinking ? "隐藏思考过程" : "显示思考过程"}
        >
          <BrainIcon />
        </button>

        {/* 扳手按钮 - 工具调用 toggle */}
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all ${
            showToolCalls
              ? "bg-red-500/15 border-red-500/50 text-red-400 hover:bg-red-500/25"
              : "border-transparent hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={handleToggleToolCalls}
          title={showToolCalls ? "隐藏工具调用" : "显示工具调用"}
        >
          <WrenchIcon />
        </button>

        {/* 时钟按钮 - 隐藏/显示 Cron 会话 */}
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all relative ${
            hideCron
              ? "bg-red-500/15 border-red-500/50 text-red-400 hover:bg-red-500/25"
              : "border-transparent hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={handleToggleHideCron}
          title={hideCron ? "显示定时任务会话" : "隐藏定时任务会话"}
        >
          <ClockIcon />
          {/* 隐藏数量徽标 */}
          {hideCron && hiddenCronCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-medium rounded-full">
              {hiddenCronCount > 9 ? "9+" : hiddenCronCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
