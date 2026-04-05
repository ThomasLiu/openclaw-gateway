"use client";

/**
 * ChatPanel - 主聊天面板
 * 包含消息列表区（MessageList）、工具栏（ChatControls）和输入框（Composer）
 */
import { useState } from "react";
import type { ChatPanelProps } from "./chat-types";
import MessageList from "./MessageList";
import Composer from "./Composer";
import ChatControls from "./ChatControls";

// ============================================================================
// ChatPanel 主组件
// ============================================================================

export default function ChatPanel({
  agentId,
  sessionKey,
  messages,
  streaming,
  onSendMessage,
  onAbort,
  onDeleteMessage,
  onPinMessage,
  streamingMessageId,
  streamingDelta,
  loadingMessages,
  showThinking = true,
  onToggleThinking,
  showToolCalls = true,
  onToggleToolCalls,
  hideCron = true,
  onToggleHideCron,
  onRefresh,
}: ChatPanelProps & {
  streamingMessageId?: string;
  streamingDelta?: string;
  loadingMessages?: boolean;
  showThinking?: boolean;
  onToggleThinking?: () => void;
  showToolCalls?: boolean;
  onToggleToolCalls?: () => void;
  hideCron?: boolean;
  onToggleHideCron?: () => void;
  onRefresh?: () => void;
}) {
  // 内部状态管理（当 callback 未传入时使用）
  const [_showThinking, _setShowThinking] = useState(showThinking);
  const [_showToolCalls, _setShowToolCalls] = useState(showToolCalls);
  const [_hideCron, _setHideCron] = useState(hideCron);

  // 实际使用的值（外部传入优先，否则用内部状态）
  const effectiveShowThinking = onToggleThinking ? showThinking : _showThinking;
  const effectiveShowToolCalls = onToggleToolCalls ? showToolCalls : _showToolCalls;
  const effectiveHideCron = onToggleHideCron ? hideCron : _hideCron;

  const handleToggleThinking = onToggleThinking ?? (() => _setShowThinking((v) => !v));
  const handleToggleToolCalls = onToggleToolCalls ?? (() => _setShowToolCalls((v) => !v));
  const handleToggleHideCron = onToggleHideCron ?? (() => _setHideCron((v) => !v));

  // 无会话时显示空状态
  if (!sessionKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 gap-3">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-zinc-700"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
        </svg>
        <div className="text-sm">
          {agentId ? "请从左侧选择一个会话，或新建会话" : "请先选择一个 Agent"}
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
      {/* ChatControls 工具栏 */}
      <ChatControls
        chatLoading={loadingMessages}
        connected={!!sessionKey}
        showThinking={effectiveShowThinking}
        showToolCalls={effectiveShowToolCalls}
        hideCron={effectiveHideCron}
        onRefresh={onRefresh}
        onToggleThinking={handleToggleThinking}
        onToggleToolCalls={handleToggleToolCalls}
        onToggleHideCron={handleToggleHideCron}
      />

      {/* 消息列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            加载消息历史...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
            <span className="text-sm">开始对话吧</span>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streamingMessageId={streamingMessageId}
            streamingDelta={streamingDelta}
            onDeleteMessage={onDeleteMessage}
            onPinMessage={onPinMessage}
            showThinking={effectiveShowThinking}
            showToolCalls={effectiveShowToolCalls}
          />
        )}
      </div>

      {/* Composer 输入框 */}
      <Composer
        disabled={!sessionKey}
        streaming={streaming}
        onSend={onSendMessage}
        onAbort={onAbort}
      />
    </main>
  );
}
