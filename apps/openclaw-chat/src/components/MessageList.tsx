"use client";

/**
 * MessageList - OpenClaw Web UI 风格消息列表
 *
 * 气泡式布局，用户消息在右，助手消息在左，与 OpenClaw Web UI 一致
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type { MessageItem } from "./chat-types";
import StreamingWaveBar from "./StreamingWaveBar";
import { useRouter } from "next/navigation";
import "./message-list.css";

// ============================================================================
// 类型
// ============================================================================

type MessageListProps = {
  messages: MessageItem[];
  streamingMessageId?: string;
  streamingDelta?: string;
  onDeleteMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  showThinking?: boolean;
  showToolCalls?: boolean;
  onOpenSidebar?: (content: string) => void;
};

type MessageGroup = {
  id: string;
  role: string;
  messages: MessageItem[];
  timestamp: number;
  isStreaming: boolean;
};

// ============================================================================
// 消息分组
// ============================================================================

function groupMessages(messages: MessageItem[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const message of messages) {
    if (message.isDeleted) continue;

    if (!currentGroup || currentGroup.role !== message.role) {
      currentGroup = {
        id: `group:${message.role}:${message.id}`,
        role: message.role,
        messages: [message],
        timestamp: message.timestamp.getTime(),
        isStreaming: false,
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
    }
  }

  return groups;
}

// ============================================================================
// Avatar 图标组件
// ============================================================================

function AvatarIcon({ role }: { role: string }) {
  if (role === "user") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    );
  }

  if (role === "assistant") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2L8 14 2 9.2h7.6z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53a7.76 7.76 0 0 0 .07-1 7.76 7.76 0 0 0-.07-.97l2.11-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.15 7.15 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65a7.15 7.15 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64L4.57 11a7.9 7.9 0 0 0 0 1.94l-2.11 1.69a.49.49 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.72 1.69.98l.38 2.65c.05.24.26.42.49.42h4c.23 0 .44-.18.49-.42l.38-2.65a7.15 7.15 0 0 0 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.49.49 0 0 0-.12-.64z" />
      </svg>
    );
}

// ============================================================================
// TTS 语音合成
// ============================================================================

let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speakText(text: string, onEnd?: () => void, onError?: () => void) {
  if (!isTtsSupported()) return;

  stopTts();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
    onError?.();
  };

  currentUtterance = utterance;
  isSpeaking = true;
  window.speechSynthesis.speak(utterance);
}

function stopTts() {
  if (isSpeaking && currentUtterance) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
  }
}

// ============================================================================
// JSON 检测
// ============================================================================

const MAX_JSON_AUTOPARSE_CHARS = 20000;

function detectJson(text: string): { parsed: unknown; pretty: string } | null {
  const t = text.trim();
  if (t.length > MAX_JSON_AUTOPARSE_CHARS) return null;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      const parsed = JSON.parse(t);
      return { parsed, pretty: JSON.stringify(parsed, null, 2) };
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================================
// 思考内容
// ============================================================================

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="chat-thinking">
      <div className="chat-thinking__header" onClick={() => setExpanded(!expanded)}>
        <span className={`chat-thinking__toggle ${expanded ? "chat-thinking__toggle--expanded" : ""}`}>
          ▼
        </span>
        <span className="chat-thinking__label">思考过程</span>
      </div>
      {expanded && (
        <div className="chat-thinking__content">
          {thinking.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 消息操作按钮
// ============================================================================

function MessageActions({
  messageId,
  content,
  onDelete,
  onOpenSidebar,
  role,
}: {
  messageId: string;
  content: string;
  onDelete?: (id: string) => void;
  onOpenSidebar?: (content: string) => void;
  role: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [ttsActive, setTtsActive] = useState(false);

  const handleTts = () => {
    if (ttsActive) {
      stopTts();
      setTtsActive(false);
    } else {
      speakText(content, () => setTtsActive(false), () => setTtsActive(false));
      setTtsActive(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      // 可以添加复制成功的反馈
    });
  };

  const handleExpand = () => {
    if (onOpenSidebar && content) {
      onOpenSidebar(content);
    }
  };

  const canExpand = role === "assistant" && onOpenSidebar && content;
  const canCopy = role === "assistant" && content;

  return (
    <span className="chat-bubble-actions">
      {canExpand && (
        <button
          className="chat-expand-btn"
          onClick={handleExpand}
          title="在侧边栏中打开"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
            <line x1="21" y1="15" x2="3" y2="15" />
          </svg>
        </button>
      )}

      {canCopy && (
        <button
          className="chat-copy-btn"
          onClick={handleCopy}
          title="复制为 Markdown"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
      )}

      {isTtsSupported() && role === "assistant" && (
        <button
          className={`chat-tts-btn ${ttsActive ? "chat-tts-btn--active" : ""}`}
          onClick={handleTts}
          title={ttsActive ? "停止朗读" : "朗读"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        </button>
      )}

      {onDelete && (
        <span className="chat-delete-wrap">
          <button
            className="chat-group-delete"
            onClick={() => setShowConfirm(true)}
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          {showConfirm && (
            <div className={`chat-delete-confirm chat-delete-confirm--${role === "user" ? "left" : "right"}`}>
              <p className="chat-delete-confirm__text">删除此消息？</p>
              <div className="chat-delete-confirm__remember">
                <input type="checkbox" className="chat-delete-confirm__check" />
                <span>不再询问</span>
              </div>
              <div className="chat-delete-confirm__actions">
                <button className="chat-delete-confirm__cancel" onClick={() => setShowConfirm(false)}>取消</button>
                <button className="chat-delete-confirm__yes" onClick={() => { onDelete(messageId); setShowConfirm(false); }}>删除</button>
              </div>
            </div>
          )}
        </span>
      )}
    </span>
  );
}

// ============================================================================
// 工具调用显示
// ============================================================================

function ToolCallsDisplay({ toolCalls }: { toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  const toolNames = [...new Set(toolCalls.map((c) => c.name))];
  const summaryLabel = toolNames.length <= 3 ? toolNames.join(", ") : `${toolNames.slice(0, 2).join(", ")} +${toolNames.length - 2} 更多`;

  return (
    <details className="chat-tools-collapse">
      <summary className="chat-tools-summary">
        <span className="chat-tools-summary__icon">⚡</span>
        <span className="chat-tools-summary__count">{toolCalls.length} 个工具</span>
        <span className="chat-tools-summary__names">{summaryLabel}</span>
      </summary>
      <div className="chat-tools-collapse__body">
        {toolCalls.map((tool) => (
          <div key={tool.id} className="chat-tool-card">
            <div className="chat-tool-card__header">
              <span className="chat-tool-card__name">{tool.name}</span>
            </div>
            <div className="chat-tool-card__body">
              <pre className="chat-tool-card__input">{JSON.stringify(tool.input, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// ============================================================================
// 阅读指示器
// ============================================================================

function ReadingIndicator() {
  return (
    <div className="chat-group assistant">
      <div className="chat-avatar assistant">
        <AvatarIcon role="assistant" />
      </div>
      <div className="chat-group-messages">
        <div className="chat-bubble chat-reading-indicator">
          <span className="chat-reading-indicator__dots">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 消息组渲染
// ============================================================================

// ============================================================================// 元数据提取和显示// ============================================================================type GroupMeta = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  model: string | null;
  contextPercent: number | null;
};

function extractGroupMeta(group: MessageGroup): GroupMeta | null {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let cost = 0;
  let model: string | null = null;
  let hasUsage = false;

  for (const message of group.messages) {
    if (message.role !== "assistant") {
      continue;
    }
    if (message.usage) {
      hasUsage = true;
      input += message.usage.input || 0;
      output += message.usage.output || 0;
      cacheRead += message.usage.cacheRead || 0;
      cacheWrite += message.usage.cacheWrite || 0;
    }
    if (message.cost?.total) {
      cost += message.cost.total;
    }
    if (message.meta?.model) {
      model = message.meta.model;
    }
  }

  if (!hasUsage && !model) {
    return null;
  }

  const contextPercent = null; // 暂时不计算上下文百分比

  return { input, output, cacheRead, cacheWrite, cost, model, contextPercent };
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

function renderMessageMeta(meta: GroupMeta | null) {
  if (!meta) {
    return null;
  }

  const parts: React.ReactNode[] = [];

  // Token counts: ↑input ↓output
  if (meta.input) {
    parts.push(<span key="input" className="msg-meta__tokens">↑{fmtTokens(meta.input)}</span>);
  }
  if (meta.output) {
    parts.push(<span key="output" className="msg-meta__tokens">↓{fmtTokens(meta.output)}</span>);
  }

  // Cache: R/W
  if (meta.cacheRead) {
    parts.push(<span key="cacheRead" className="msg-meta__cache">R{fmtTokens(meta.cacheRead)}</span>);
  }
  if (meta.cacheWrite) {
    parts.push(<span key="cacheWrite" className="msg-meta__cache">W{fmtTokens(meta.cacheWrite)}</span>);
  }

  // Cost
  if (meta.cost > 0) {
    parts.push(<span key="cost" className="msg-meta__cost">${meta.cost.toFixed(4)}</span>);
  }

  // Context %
  if (meta.contextPercent !== null) {
    const pct = meta.contextPercent;
    const cls = pct >= 90 ? "msg-meta__ctx msg-meta__ctx--danger" : pct >= 75 ? "msg-meta__ctx msg-meta__ctx--warn" : "msg-meta__ctx";
    parts.push(<span key="context" className={cls}>{pct}% ctx</span>);
  }

  // Model
  if (meta.model) {
    // Shorten model name: strip provider prefix if present
    const shortModel = meta.model.includes("/") ? meta.model.split("/").pop()! : meta.model;
    parts.push(<span key="model" className="msg-meta__model">{shortModel}</span>);
  }

  if (parts.length === 0) {
    return null;
  }

  return <span className="msg-meta">{parts}</span>;
}

// ============================================================================// 消息组渲染// ============================================================================function MessageGroupComponent({
  group,
  isStreaming,
  showThinking,
  showToolCalls,
  onDelete,
  onOpenSidebar,
}: {
  group: MessageGroup;
  isStreaming: boolean;
  showThinking: boolean;
  showToolCalls: boolean;
  onDelete?: (id: string) => void;
  onOpenSidebar?: (content: string) => void;
}) {
  const roleLabel = group.role === "user" ? "You" : group.role === "assistant" ? "Assistant" : group.role === "tool" ? "Tool" : group.role;
  const roleClass = group.role === "user" ? "user" : group.role === "assistant" ? "assistant" : group.role === "tool" ? "tool" : "other";
  const timestamp = new Date(group.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Extract metadata from messages
  const meta = extractGroupMeta(group);

  return (
    <div className={`chat-group ${roleClass}`}>
      <div className={`chat-avatar ${roleClass}`}>
        <AvatarIcon role={group.role} />
      </div>

      <div className="chat-group-messages">
        {group.messages.map((message, index) => {
          const isLastMessage = index === group.messages.length - 1;
          const currentStreaming = isStreaming && isLastMessage;

          const jsonResult = !currentStreaming && message.content ? detectJson(message.content) : null;

          let contentDisplay: React.ReactNode = null;

          if (message.content) {
            if (jsonResult) {
              contentDisplay = (
                <details className="chat-json-collapse">
                  <summary className="chat-json-summary">
                    <span className="chat-json-badge">JSON</span>
                    <span className="chat-json-label">
                      {Array.isArray(jsonResult.parsed) 
                        ? `Array (${(jsonResult.parsed as any[]).length} items)` 
                        : typeof jsonResult.parsed === "object" && jsonResult.parsed !== null
                          ? `Object (${Object.keys(jsonResult.parsed).length} keys)`
                          : "JSON"
                      }
                    </span>
                  </summary>
                  <pre className="chat-json-content"><code>{jsonResult.pretty}</code></pre>
                </details>
              );
            } else {
              const parts = message.content.split(/(```[\s\S]*?```|`[^`]+`)/g);
              contentDisplay = parts.map((part, i) => {
                if (part.startsWith("```") && part.endsWith("```")) {
                  const code = part.slice(3, -3).replace(/^\w*\n/, "");
                  return (
                    <pre key={i} className="chat-code-block">
                      <code>{code}</code>
                      <button 
                        className="code-block-copy" 
                        data-code={code}
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const code = btn.getAttribute("data-code") || "";
                          navigator.clipboard.writeText(code).then(() => {
                            btn.classList.add("copied");
                            setTimeout(() => btn.classList.remove("copied"), 1500);
                          });
                        }}
                      >
                        复制
                      </button>
                    </pre>
                  );
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                  return <code key={i} className="chat-inline-code">{part.slice(1, -1)}</code>;
                }
                return <span key={i}>{part}</span>;
              });
            }
          }

          return (
            <div key={message.id} className={`chat-bubble ${currentStreaming ? "streaming" : "fade-in"}`}>
              <MessageActions
                messageId={message.id}
                content={message.content || ""}
                onDelete={onDelete}
                onOpenSidebar={onOpenSidebar}
                role={message.role}
              />

              {showThinking && message.thinking && (
                <ThinkingBlock thinking={message.thinking} />
              )}

              {showToolCalls && message.toolCalls && message.toolCalls.length > 0 && (
                <ToolCallsDisplay toolCalls={message.toolCalls} onOpenSidebar={onOpenSidebar} />
              )}

              {contentDisplay && (
                <div className="chat-text">
                  {contentDisplay}
                </div>
              )}

              {currentStreaming && (
                <div className="chat-streaming-indicator">
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>
          );
        })}

        <div className="chat-group-footer">
          <span className="chat-sender-name">{roleLabel}</span>
          <span className="chat-group-timestamp">{timestamp}</span>
          {renderMessageMeta(meta)}
          {group.role === "assistant" && isTtsSupported() && (
            <button
              className={`chat-tts-btn ${isSpeaking ? "chat-tts-btn--active" : ""}`}
              onClick={() => {
                const text = group.messages.map(m => m.content || "").join("\n\n");
                if (isSpeaking) {
                  stopTts();
                } else {
                  speakText(text);
                }
              }}
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            </button>
          )}
          {onDelete && (
            <span className="chat-delete-wrap">
              <button
                className="chat-group-delete"
                onClick={() => {
                  if (window.confirm("Delete this message?")) {
                    onDelete(group.messages[0].id);
                  }
                }}
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MessageList 主组件
// ============================================================================

export default function MessageList({
  messages,
  streamingMessageId,
  streamingDelta,
  onDeleteMessage,
  onPinMessage,
  showThinking = true,
  showToolCalls = true,
  onOpenSidebar,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [autoScrollMode, setAutoScrollMode] = useState(true);

  const handleChatScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && !autoScrollMode) {
      setAutoScrollMode(true);
      setShowNewMessages(false);
    } else if (!isNearBottom && autoScrollMode) {
      setAutoScrollMode(false);
    }
  }, [autoScrollMode]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessages(false);
    setAutoScrollMode(true);
  }, []);

  useEffect(() => {
    if (autoScrollMode) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowNewMessages(true);
    }
  }, [messages, streamingDelta, autoScrollMode]);

  const handleDelete = useCallback(
    (messageId: string) => {
      onDeleteMessage?.(messageId);
    },
    [onDeleteMessage]
  );

  const groups = groupMessages(messages);

  return (
    <div className="chat-thread" onScroll={handleChatScroll}>
      <div className="chat-thread-inner">
        {groups.map((group) => {
          const isStreaming = group.messages.some(msg => msg.id === streamingMessageId);
          
          return (
            <MessageGroupComponent
              key={group.id}
              group={group}
              isStreaming={isStreaming}
              showThinking={showThinking}
              showToolCalls={showToolCalls}
              onDelete={handleDelete}
              onOpenSidebar={onOpenSidebar}
            />
          );
        })}

        {streamingMessageId && !streamingDelta && (
          <ReadingIndicator />
        )}

        {streamingMessageId && streamingDelta !== undefined && (
          <StreamingWaveBar />
        )}

        <div ref={bottomRef} />
      </div>

      {showNewMessages && (
        <button className="chat-new-messages" onClick={scrollToBottom}>
          ↓ 新消息
        </button>
      )}
    </div>
  );
}
