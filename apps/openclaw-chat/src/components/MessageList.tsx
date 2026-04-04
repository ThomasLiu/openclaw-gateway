"use client";

/**
 * MessageList - 渲染消息历史
 * 支持流式 delta 更新、Markdown 渲染、Markdown 预览
 */
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageListProps } from "./chat-types";
import StreamingWaveBar from "./StreamingWaveBar";

export default function MessageList({
  messages,
  streamingMessageId,
  streamingDelta,
}: MessageListProps & {
  streamingMessageId?: string;
  streamingDelta?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部（最新消息）
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingDelta]);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 pb-0">
      {messages.map((message) => {
        const isStreaming = message.id === streamingMessageId;
        const displayContent = isStreaming && streamingDelta !== undefined
          ? streamingDelta
          : message.content;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming}
            displayContent={displayContent}
          />
        );
      })}

      {/* 流式波浪条（最后一条是 assistant 且正在流式时） */}
      {streamingMessageId && streamingDelta !== undefined && (
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <StreamingWaveBar />
        </div>
      )}

      {/* 滚动锚点 */}
      <div ref={bottomRef} />
    </div>
  );
}

// ============================================================================
// MessageBubble 子组件
// ============================================================================

function MessageBubble({
  message,
  isStreaming,
  displayContent,
}: {
  message: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    meta?: { model?: string; durationMs?: number };
  };
  isStreaming: boolean;
  displayContent: string;
}) {
  const timeStr = message.timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.role === "system") {
    return (
      <div className="message-system text-center py-1 text-xs">
        {displayContent}
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="message-user px-3 py-2 text-sm leading-relaxed">
            {displayContent}
          </div>
          <div className="text-[10px] text-zinc-600 mt-0.5 text-right">{timeStr}</div>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex flex-col gap-1">
      {/* 助手消息头：模型信息 */}
      {message.meta?.model && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="text-[11px] text-zinc-500">{message.meta.model}</span>
          {isStreaming && (
            <span className="text-[11px] text-zinc-600 animate-pulse">生成中...</span>
          )}
          {message.meta.durationMs !== undefined && !isStreaming && (
            <span className="text-[11px] text-zinc-600">
              {(message.meta.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {/* 头像区 */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center mt-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>

        {/* 消息内容 */}
        <div className="flex-1 min-w-0">
          <div className="message-assistant px-3 py-2.5 text-sm leading-relaxed text-zinc-100">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 代码块使用默认样式（已在 globals.css 定义）
                  pre: ({ children }) => <pre>{children}</pre>,
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <code className={className}>{children}</code>
                    ) : (
                      <code className="not-prose bg-zinc-800 px-1 py-0.5 rounded text-xs text-zinc-300">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {displayContent || (isStreaming ? "" : "（无内容）")}
              </ReactMarkdown>
            </div>
          </div>
          <div className="text-[10px] text-zinc-600 mt-0.5 pl-1">{timeStr}</div>
        </div>
      </div>
    </div>
  );
}
