"use client";

/**
 * MessageList - 渲染消息历史
 * 支持流式 delta 更新、Markdown 渲染、Token 计数、成本、JSON 折叠、Tool Cards 等功能
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageItem, ToolCall } from "./chat-types";
import StreamingWaveBar from "./StreamingWaveBar";

// ============================================================================
// 常量
// ============================================================================

/** JSON 自动解析的最大字符数（防止 DoS） */
const MAX_JSON_AUTOPARSE_CHARS = 20_000;

/** Token 计数格式化 */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

// ============================================================================
// 类型
// ============================================================================

type MessageListProps = {
  messages: MessageItem[];
  streamingMessageId?: string;
  streamingDelta?: string;
  onDeleteMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检测字符串是否为 JSON 对象或数组
 */
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

/**
 * 获取 JSON 摘要标签
 */
function jsonSummaryLabel(parsed: unknown): string {
  if (Array.isArray(parsed)) return `Array (${parsed.length} item${parsed.length === 1 ? "" : "s"})`;
  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length <= 4) return `{ ${keys.join(", ")} }`;
    return `Object (${keys.length} keys)`;
  }
  return "JSON";
}

/**
 * 提取消息文本（用于 TTS、复制等操作）
 */
function extractMessageText(message: MessageItem): string {
  return message.content || "";
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

function isTtsSpeaking(): boolean {
  return isSpeaking;
}

// ============================================================================
// 消息元数据组件
// ============================================================================

function MessageMeta({
  usage,
  cost,
  contextPercent,
  model,
}: {
  usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  cost?: { total?: number };
  contextPercent?: number;
  model?: string;
}) {
  const parts: React.ReactNode[] = [];

  // Token counts: ↑input ↓output
  if (usage?.input) {
    parts.push(<span key="input" className="msg-meta__tokens">↑{fmtTokens(usage.input)}</span>);
  }
  if (usage?.output) {
    parts.push(<span key="output" className="msg-meta__tokens">↓{fmtTokens(usage.output)}</span>);
  }

  // Cache: R/W
  if (usage?.cacheRead) {
    parts.push(<span key="cacheR" className="msg-meta__cache">R{fmtTokens(usage.cacheRead)}</span>);
  }
  if (usage?.cacheWrite) {
    parts.push(<span key="cacheW" className="msg-meta__cache">W{fmtTokens(usage.cacheWrite)}</span>);
  }

  // Cost
  if (cost?.total && cost.total > 0) {
    parts.push(<span key="cost" className="msg-meta__cost">${cost.total.toFixed(4)}</span>);
  }

  // Context %
  if (contextPercent !== undefined && contextPercent > 0) {
    const cls = contextPercent >= 90
      ? "msg-meta__ctx msg-meta__ctx--danger"
      : contextPercent >= 75
        ? "msg-meta__ctx msg-meta__ctx--warn"
        : "msg-meta__ctx";
    parts.push(<span key="ctx" className={cls}>{contextPercent}% ctx</span>);
  }

  // Model (short name - strip provider prefix)
  if (model) {
    const shortModel = model.includes("/") ? model.split("/").pop()! : model;
    parts.push(<span key="model" className="msg-meta__model">{shortModel}</span>);
  }

  if (parts.length === 0) return null;

  return <span className="msg-meta">{parts}</span>;
}

// ============================================================================
// JSON 折叠组件
// ============================================================================

function JsonCollapsible({ json }: { json: { parsed: unknown; pretty: string } }) {
  const label = jsonSummaryLabel(json.parsed);

  return (
    <details className="chat-json-collapse">
      <summary className="chat-json-summary">
        <span className="chat-json-badge">JSON</span>
        <span className="chat-json-label">{label}</span>
      </summary>
      <pre className="chat-json-content"><code>{json.pretty}</code></pre>
    </details>
  );
}

// ============================================================================
// Tool Cards 折叠组件
// ============================================================================

function ToolCardsCollapsible({ toolCalls }: { toolCalls: ToolCall[] }) {
  const calls = toolCalls;
  const totalTools = calls.length;
  const toolNames = [...new Set(calls.map((c) => c.name))];
  const summaryLabel = toolNames.length <= 3
    ? toolNames.join(", ")
    : `${toolNames.slice(0, 2).join(", ")} +${toolNames.length - 2} more`;

  return (
    <details className="chat-tools-collapse">
      <summary className="chat-tools-summary">
        <span className="chat-tools-summary__icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        <span className="chat-tools-summary__count">{totalTools} tool{totalTools === 1 ? "" : "s"}</span>
        <span className="chat-tools-summary__names">{summaryLabel}</span>
      </summary>
      <div className="chat-tools-collapse__body">
        {calls.map((call) => (
          <div key={call.id} className="tool-card">
            <div className="tool-card__header">
              <span className="tool-card__name">{call.name}</span>
            </div>
            <div className="tool-card__content">
              <pre><code>{JSON.stringify(call.input, null, 2)}</code></pre>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// ============================================================================
// 图片消息组件
// ============================================================================

function MessageImages({ images }: { images: { url: string; alt?: string }[] }) {
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);

  return (
    <>
      <div className="chat-message-images">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img.url}
            alt={img.alt ?? "Attached image"}
            className="chat-message-image"
            onClick={() => setPreviewImage(img)}
          />
        ))}
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage.url}
            alt={previewImage.alt ?? ""}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            onClick={() => setPreviewImage(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// 思考内容组件
// ============================================================================

function ThinkingBlock({ thinking }: { thinking: string }) {
  return (
    <details className="chat-thinking">
      <summary className="chat-thinking__summary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500/70">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
          <path d="M12 8v4l3 3"/>
        </svg>
        <span>思考过程</span>
      </summary>
      <div className="chat-thinking__content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinking}</ReactMarkdown>
      </div>
    </details>
  );
}

// ============================================================================
// 消息操作栏组件
// ============================================================================

function MessageActions({
  message,
  onDelete,
  onPin,
  onCopyAsMarkdown,
  onSpeak,
  onOpenSidebar,
  canSpeak,
}: {
  message: MessageItem;
  onDelete?: () => void;
  onPin?: () => void;
  onCopyAsMarkdown?: () => void;
  onSpeak?: () => void;
  onOpenSidebar?: () => void;
  canSpeak?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="chat-bubble-actions">
      {/* 在侧边栏打开 */}
      {onOpenSidebar && (
        <button
          className="chat-action-btn"
          title="Open in canvas"
          onClick={onOpenSidebar}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      )}

      {/* 复制为 Markdown */}
      {onCopyAsMarkdown && (
        <button
          className="chat-action-btn"
          title="Copy as Markdown"
          onClick={onCopyAsMarkdown}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
      )}

      {/* TTS 朗读 */}
      {canSpeak && onSpeak && (
        <button
          className={`chat-action-btn ${isTtsSpeaking() ? "chat-action-btn--active" : ""}`}
          title={isTtsSpeaking() ? "Stop speaking" : "Read aloud"}
          onClick={() => {
            if (isTtsSpeaking()) {
              stopTts();
            } else {
              onSpeak();
            }
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        </button>
      )}

      {/* 固定消息 */}
      {onPin && (
        <button
          className={`chat-action-btn ${message.isPinned ? "chat-action-btn--active" : ""}`}
          title={message.isPinned ? "Unpin" : "Pin to top"}
          onClick={onPin}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v4.76z" />
          </svg>
        </button>
      )}

      {/* 删除按钮 */}
      {onDelete && (
        <div className="chat-delete-wrap">
          <button
            className="chat-action-btn chat-action-btn--danger"
            title="Delete"
            onClick={() => setShowConfirm(true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>

          {showConfirm && (
            <div className="chat-delete-confirm">
              <p className="chat-delete-confirm__text">Delete this message?</p>
              <div className="chat-delete-confirm__actions">
                <button onClick={() => setShowConfirm(false)}>Cancel</button>
                <button onClick={() => { onDelete(); setShowConfirm(false); }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 消息气泡组件
// ============================================================================

function MessageBubble({
  message,
  isStreaming,
  displayContent,
  onDelete,
  onPin,
  onCopyAsMarkdown,
  onOpenSidebar,
}: {
  message: MessageItem;
  isStreaming: boolean;
  displayContent: string;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onCopyAsMarkdown?: (messageId: string) => void;
  onOpenSidebar?: (messageId: string, content: string) => void;
}) {
  const timeStr = message.timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 检测 JSON
  const jsonResult = !isStreaming && displayContent ? detectJson(displayContent) : null;

  // 是否有操作按钮
  const hasActions = message.role === "assistant" || message.role === "user";

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
          <div className="text-[10px] text-zinc-600 mt-0.5 text-right flex items-center justify-end gap-2">
            {timeStr}
            {hasActions && (
              <MessageActions
                message={message}
                onDelete={onDelete ? () => onDelete(message.id) : undefined}
                onPin={onPin ? () => onPin(message.id) : undefined}
                onCopyAsMarkdown={onCopyAsMarkdown ? () => onCopyAsMarkdown(message.id) : undefined}
                onSpeak={onOpenSidebar ? () => speakText(displayContent) : undefined}
                canSpeak={isTtsSupported()}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex flex-col gap-1">
      {/* 助手消息头：模型信息 + 元数据 */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        {message.meta?.model && (
          <span className="text-[11px] text-zinc-500">{message.meta.model}</span>
        )}
        {isStreaming && (
          <span className="text-[11px] text-zinc-600 animate-pulse">生成中...</span>
        )}
        {message.meta?.durationMs !== undefined && !isStreaming && (
          <span className="text-[11px] text-zinc-600">
            {(message.meta.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {/* 消息使用量元数据 */}
        <MessageMeta
          usage={message.usage}
          cost={message.cost}
          contextPercent={message.contextPercent}
          model={message.meta?.model}
        />
      </div>

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
            {/* 操作按钮 */}
            {hasActions && (
              <MessageActions
                message={message}
                onDelete={onDelete ? () => onDelete(message.id) : undefined}
                onPin={onPin ? () => onPin(message.id) : undefined}
                onCopyAsMarkdown={onCopyAsMarkdown ? () => onCopyAsMarkdown(message.id) : undefined}
                onSpeak={onOpenSidebar ? () => speakText(displayContent) : undefined}
                onOpenSidebar={onOpenSidebar ? () => onOpenSidebar(message.id, displayContent) : undefined}
                canSpeak={isTtsSupported()}
              />
            )}

            {/* 图片消息 */}
            {message.images && message.images.length > 0 && (
              <MessageImages images={message.images} />
            )}

            {/* 思考内容 */}
            {message.thinking && <ThinkingBlock thinking={message.thinking} />}

            {/* 工具调用卡片 */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCardsCollapsible toolCalls={message.toolCalls} />
            )}

            {/* 消息内容 */}
            <div className="prose prose-invert max-w-none">
              {jsonResult ? (
                <JsonCollapsible json={jsonResult} />
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
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
              )}
            </div>
          </div>
          <div className="text-[10px] text-zinc-600 mt-0.5 pl-1">{timeStr}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 搜索高亮组件
// ============================================================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
}: MessageListProps & {
  onDeleteMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 搜索状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ messageId: string; index: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // 自动滚动到底部（最新消息）
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingDelta]);

  // Cmd+F 快捷键打开搜索
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // 搜索输入聚焦
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // 搜索逻辑
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: { messageId: string; index: number }[] = [];
    messages.forEach((msg) => {
      if (msg.isDeleted) return;
      const content = msg.content.toLowerCase();
      const query = searchQuery.toLowerCase();
      let index = 0;
      while ((index = content.indexOf(query, index)) !== -1) {
        results.push({ messageId: msg.id, index });
        index += query.length;
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // 滚动到第一个结果
    if (results.length > 0) {
      const firstResult = results[0];
      const element = messageRefs.current.get(firstResult.messageId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchQuery, messages]);

  // 导航到上一个/下一个搜索结果
  const goToPrevSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(newIndex);
    const result = searchResults[newIndex];
    const element = messageRefs.current.get(result.messageId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchResults, currentSearchIndex]);

  const goToNextSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const newIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(newIndex);
    const result = searchResults[newIndex];
    const element = messageRefs.current.get(result.messageId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchResults, currentSearchIndex]);

  // 复制为 Markdown 回调
  const handleCopyAsMarkdown = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      const markdown = `**${msg.role === "user" ? "User" : "Assistant"}** (${msg.timestamp.toLocaleString()}):\n\n${msg.content}`;
      navigator.clipboard.writeText(markdown).then(() => {
        // 可选：显示 toast 提示
      });
    }
  }, [messages]);

  // 在侧边栏打开回调
  const handleOpenSidebar = useCallback((messageId: string, content: string) => {
    // TODO: 实现侧边栏打开功能
    console.log("Open in sidebar:", messageId, content);
  }, []);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 pb-0">
      {/* 搜索栏 */}
      {searchOpen && (
        <div className="search-bar">
          <div className="search-bar__input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-bar__icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) {
                    goToPrevSearch();
                  } else {
                    goToNextSearch();
                  }
                }
              }}
              placeholder="搜索消息内容..."
              className="search-bar__input"
            />
            {searchResults.length > 0 && (
              <span className="search-bar__count">
                {currentSearchIndex + 1}/{searchResults.length}
              </span>
            )}
          </div>
          <div className="search-bar__nav">
            <button onClick={goToPrevSearch} title="上一个 (Shift+Enter)" className="search-bar__nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button onClick={goToNextSearch} title="下一个 (Enter)" className="search-bar__nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }} className="search-bar__close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {messages.map((message) => {
        const isStreaming = message.id === streamingMessageId;
        const displayContent = isStreaming && streamingDelta !== undefined
          ? streamingDelta
          : message.content;

        // 跳过已删除的消息
        if (message.isDeleted) return null;

        // 检查是否是搜索结果
        const isSearchResult = searchResults.some((r) => r.messageId === message.id);
        const isCurrentSearchResult = searchResults[currentSearchIndex]?.messageId === message.id;

        return (
          <div
            key={message.id}
            ref={(el) => {
              if (el) messageRefs.current.set(message.id, el);
            }}
            className={isSearchResult && !isCurrentSearchResult ? "search-result" : isCurrentSearchResult ? "search-result search-result--active" : ""}
          >
            <MessageBubble
              message={message}
              isStreaming={isStreaming}
              displayContent={searchQuery && displayContent ? displayContent : displayContent}
              onDelete={onDeleteMessage}
              onPin={onPinMessage}
              onCopyAsMarkdown={handleCopyAsMarkdown}
              onOpenSidebar={handleOpenSidebar}
            />
          </div>
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
