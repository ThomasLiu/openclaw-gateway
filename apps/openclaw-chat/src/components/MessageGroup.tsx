"use client";

/**
 * MessageGroup - Slack 风格消息分组组件
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageGroup as MessageGroupType, ToolCard } from "./chat-types";
import ToolCardComponent from "./ToolCard";
import JsonCollapsible from "./JsonCollapsible";
import ThinkingBlock from "./ThinkingBlock";
import MessageActions from "./MessageActions";
import { useState, useCallback } from "react";

// ============================================================================
// 常量
// ============================================================================

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

type MessageGroupProps = {
  group: MessageGroupType;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  showThinking?: boolean;
  showToolCalls?: boolean;
  assistantName?: string;
  assistantAvatar?: string | null;
};

// ============================================================================
// 工具函数
// ============================================================================

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

function jsonSummaryLabel(parsed: unknown): string {
  if (Array.isArray(parsed)) return `Array (${parsed.length} item${parsed.length === 1 ? "" : "s"})`;
  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length <= 4) return `{ ${keys.join(", ")} }`;
    return `Object (${keys.length} keys)`;
  }
  return "JSON";
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

  if (usage?.input) {
    parts.push(<span key="input" className="msg-meta__tokens">↑{fmtTokens(usage.input)}</span>);
  }
  if (usage?.output) {
    parts.push(<span key="output" className="msg-meta__tokens">↓{fmtTokens(usage.output)}</span>);
  }
  if (usage?.cacheRead) {
    parts.push(<span key="cacheR" className="msg-meta__cache">R{fmtTokens(usage.cacheRead)}</span>);
  }
  if (usage?.cacheWrite) {
    parts.push(<span key="cacheW" className="msg-meta__cache">W{fmtTokens(usage.cacheWrite)}</span>);
  }
  if (cost?.total && cost.total > 0) {
    parts.push(<span key="cost" className="msg-meta__cost">${cost.total.toFixed(4)}</span>);
  }
  if (contextPercent !== undefined && contextPercent > 0) {
    const cls = contextPercent >= 90
      ? "msg-meta__ctx msg-meta__ctx--danger"
      : contextPercent >= 75
        ? "msg-meta__ctx msg-meta__ctx--warn"
        : "msg-meta__ctx";
    parts.push(<span key="ctx" className={cls}>{contextPercent}% ctx</span>);
  }
  if (model) {
    const shortModel = model.includes("/") ? model.split("/").pop()! : model;
    parts.push(<span key="model" className="msg-meta__model">{shortModel}</span>);
  }

  if (parts.length === 0) return null;
  return <span className="msg-meta">{parts}</span>;
}

// ============================================================================
// Avatar 组件
// ============================================================================

function Avatar({
  role,
  assistantName,
  assistantAvatar,
}: {
  role: string;
  assistantName?: string;
  assistantAvatar?: string | null;
}) {
  if (role === "user") {
    return (
      <div className="chat-avatar user">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      </div>
    );
  }

  if (role === "assistant") {
    if (assistantAvatar) {
      return <img className="chat-avatar assistant" src={assistantAvatar} alt={assistantName || "Assistant"} />;
    }
    return (
      <div className="chat-avatar assistant">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2L8 14 2 9.2h7.6z" />
        </svg>
      </div>
    );
  }

  if (role === "tool") {
    return (
      <div className="chat-avatar tool">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="chat-avatar other">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>
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

function isTtsSpeaking(): boolean {
  return isSpeaking;
}

// ============================================================================
// 提取工具卡片
// ============================================================================

function extractToolCards(message: { content?: string; toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }> }): ToolCard[] {
  const cards: ToolCard[] = [];

  if (message.toolCalls) {
    for (const tc of message.toolCalls) {
      cards.push({ kind: "call", name: tc.name, args: tc.input });
    }
  }

  return cards;
}

// ============================================================================
// 单条消息渲染
// ============================================================================

function renderGroupedMessage(
  message: { message: { id: string; role: string; content: string; thinking?: string; toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>; images?: Array<{ url: string; alt?: string }> } },
  opts: { isStreaming: boolean; showReasoning: boolean; showToolCalls?: boolean },
  onDelete?: (id: string) => void,
  onPin?: (id: string) => void,
) {
  const m = message.message;
  const toolCards = opts.showToolCalls ? extractToolCards(m) : [];
  const hasToolCards = toolCards.length > 0;
  const images = m.images || [];
  const hasImages = images.length > 0;
  const content = m.content || "";
  const thinking = opts.showReasoning && m.thinking ? m.thinking : null;
  const jsonResult = !opts.isStreaming && content ? detectJson(content) : null;
  const hasActions = m.role === "assistant" || m.role === "user";

  const bubbleClasses = ["chat-bubble", opts.isStreaming ? "streaming" : "", "fade-in"]
    .filter(Boolean)
    .join(" ");

  // 如果只是工具调用结果且没有其他内容
  if (!content && hasToolCards && m.role === "tool") {
    return (
      <details className="chat-tool-msg-collapse">
        <summary className="chat-tool-msg-summary">
          <span className="chat-tool-msg-summary__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span className="chat-tool-msg-summary__label">Tool output</span>
          {toolCards.length > 0 && (
            <span className="chat-tool-msg-summary__names">
              {[...new Set(toolCards.map(c => c.name))].join(", ")}
            </span>
          )}
        </summary>
        <div className="chat-tool-msg-body">
          {images.length > 0 && (
            <div className="chat-message-images">
              {images.map((img, idx) => (
                <img key={idx} src={img.url} alt={img.alt || "Image"} className="chat-message-image" />
              ))}
            </div>
          )}
          {toolCards.map((card, idx) => (
            <ToolCardComponent key={idx} card={card} />
          ))}
        </div>
      </details>
    );
  }

  // 抑制空消息气泡
  if (!content && !hasToolCards && !hasImages) {
    return null;
  }

  return (
    <div className={bubbleClasses}>
      {hasActions && (
        <MessageActions
          message={m as { id: string; role: string; content: string; isPinned?: boolean }}
          onDelete={onDelete ? () => onDelete(m.id) : undefined}
          onPin={onPin ? () => onPin(m.id) : undefined}
          onSpeak={() => speakText(content)}
          canSpeak={isTtsSupported()}
          isSpeaking={isTtsSpeaking()}
        />
      )}

      {images.length > 0 && (
        <div className="chat-message-images">
          {images.map((img, idx) => (
            <img key={idx} src={img.url} alt={img.alt || "Image"} className="chat-message-image" />
          ))}
        </div>
      )}

      {thinking && <ThinkingBlock thinking={thinking} />}

      {hasToolCards && (
        <details className="chat-tools-collapse">
          <summary className="chat-tools-summary">
            <span className="chat-tools-summary__icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <span className="chat-tools-summary__count">{toolCards.length} tool{toolCards.length === 1 ? "" : "s"}</span>
            <span className="chat-tools-summary__names">
              {[...new Set(toolCards.map(c => c.name))].join(", ")}
            </span>
          </summary>
          <div className="chat-tools-collapse__body">
            {toolCards.map((card, idx) => (
              <ToolCardComponent key={idx} card={card} />
            ))}
          </div>
        </details>
      )}

      {jsonResult ? (
        <JsonCollapsible json={jsonResult} />
      ) : content ? (
        <div className="chat-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// MessageGroup 主组件
// ============================================================================

export default function MessageGroup({
  group,
  onDelete,
  onPin,
  showThinking = true,
  showToolCalls = true,
  assistantName = "Assistant",
  assistantAvatar,
}: MessageGroupProps) {
  const normalizedRole = group.role;
  const userLabel = group.senderLabel?.trim();
  const who = normalizedRole === "user"
    ? (userLabel || "You")
    : normalizedRole === "assistant"
      ? assistantName
      : normalizedRole === "tool"
        ? "Tool"
        : normalizedRole;

  const timestamp = new Date(group.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // 聚合元数据
  let inputTotal = 0;
  let outputTotal = 0;
  let cacheReadTotal = 0;
  let cacheWriteTotal = 0;
  let costTotal = 0;
  let modelName: string | null = null;
  let hasUsage = false;

  for (const { message } of group.messages) {
    const m = message as { usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number }; cost?: { total?: number }; model?: string };
    if (m.usage) {
      hasUsage = true;
      inputTotal += m.usage.input || 0;
      outputTotal += m.usage.output || 0;
      cacheReadTotal += m.usage.cacheRead || 0;
      cacheWriteTotal += m.usage.cacheWrite || 0;
    }
    if (m.cost?.total) {
      costTotal += m.cost.total;
    }
    if (typeof m.model === "string" && m.model !== "gateway-injected") {
      modelName = m.model;
    }
  }

  const usage = hasUsage ? { input: inputTotal, output: outputTotal, cacheRead: cacheReadTotal, cacheWrite: cacheWriteTotal } : undefined;
  const cost = costTotal > 0 ? { total: costTotal } : undefined;

  const roleClass = normalizedRole === "user" ? "user" : normalizedRole === "assistant" ? "assistant" : normalizedRole === "tool" ? "tool" : "other";

  return (
    <div className={`chat-group ${roleClass}`}>
      <Avatar role={normalizedRole} assistantName={assistantName} assistantAvatar={assistantAvatar} />
      <div className="chat-group-messages">
        {group.messages.map((item, index) => (
          <div key={item.message.id}>
            {renderGroupedMessage(
              item,
              {
                isStreaming: (group.isStreaming ?? false) && index === group.messages.length - 1,
                showReasoning: showThinking,
                showToolCalls,
              },
              onDelete,
              onPin,
            )}
          </div>
        ))}
        <div className="chat-group-footer">
          <span className="chat-sender-name">{who}</span>
          <span className="chat-group-timestamp">{timestamp}</span>
          <MessageMeta
            usage={usage}
            cost={cost}
            contextPercent={undefined}
            model={modelName || undefined}
          />
          {normalizedRole === "assistant" && isTtsSupported() && (
            <button
              className={`btn btn--xs chat-tts-btn ${isTtsSpeaking() ? "chat-tts-btn--active" : ""}`}
              onClick={() => {
                if (isTtsSpeaking()) {
                  stopTts();
                } else {
                  const text = group.messages.map(m => m.message.content).join("\n\n");
                  speakText(text);
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
