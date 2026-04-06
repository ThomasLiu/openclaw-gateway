"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageItem } from "./chat-types";
import "./message-list.css";

// ==========================================
// CONSTANTS
// ==========================================

const PREVIEW_MAX_CHARS = 160;
const PREVIEW_MAX_LINES = 3;
const TOOL_INLINE_THRESHOLD = 200;
const MAX_JSON_AUTOPARSE_CHARS = 20_000;

// ==========================================
// ICONS
// ==========================================

const icons = {
  puzzle: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.076.874.54 1.02 1.02a2.5 2.5 0 1 0 3.237-3.237c-.48-.146-.944-.505-1.02-1.02a.98.98 0 0 1 .303-.917l1.526-1.526A2.402 2.402 0 0 1 11.998 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.236 3.236c-.464.18-.894.527-.967 1.02Z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

// ==========================================
// TYPES
// ==========================================

type ToolCard = {
  kind: "call" | "result";
  name: string;
  args?: unknown;
  text?: string;
};

type GroupMeta = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  model: string | null;
  contextPercent: number | null;
};

type MessageGroup = {
  role: string;
  timestamp: number;
  messages: Array<{ message: unknown }>;
  isStreaming: boolean;
  senderLabel?: string;
};

// ==========================================
// HELPERS
// ==========================================

function normalizeToolContentType(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isToolCallContentType(value: unknown): boolean {
  const type = normalizeToolContentType(value);
  return type === "toolcall" || type === "tool_call" || type === "tooluse" || type === "tool_use";
}

function isToolResultContentType(value: unknown): boolean {
  const type = normalizeToolContentType(value);
  return type === "toolresult" || type === "tool_result";
}

function resolveToolBlockArgs(block: Record<string, unknown>): unknown {
  return block.args ?? block.arguments ?? block.input;
}

function normalizeContent(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) {
    return [];
  }
  return content.filter(Boolean) as Array<Record<string, unknown>>;
}

function coerceArgs(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractToolText(item: Record<string, unknown>): string | undefined {
  if (typeof item.text === "string") {
    return item.text;
  }
  if (typeof item.content === "string") {
    return item.content;
  }
  return undefined;
}

function normalizeRoleForGrouping(role: string): string {
  const r = role.toLowerCase();
  if (r === "user") return "user";
  if (r === "assistant" || r === "ai") return "assistant";
  if (r === "tool" || r === "toolresult" || r === "tool_result") return "tool";
  return "other";
}

function isToolResultMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "";
  return (
    role.toLowerCase() === "tool" ||
    role.toLowerCase() === "toolresult" ||
    role.toLowerCase() === "tool_result" ||
    typeof m.toolCallId === "string" ||
    typeof m.tool_call_id === "string"
  );
}

function extractTextCached(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  // Use rawContent if available, otherwise fall back to content
  const contentSource = m.rawContent !== undefined ? m.rawContent : m.content;
  const content = contentSource;
  
  if (typeof content === "string") {
    return content;
  }
  
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (typeof block === "object" && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          parts.push(b.text);
        }
      }
    }
    return parts.join("\n");
  }
  
  return null;
}

function extractThinkingCached(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  // Use rawContent if available, otherwise fall back to content
  const contentSource = m.rawContent !== undefined ? m.rawContent : m.content;
  const content = contentSource;
  
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (typeof block === "object" && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === "thinking" && typeof b.thinking === "string") {
          parts.push(b.thinking);
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n");
    }
  }
  
  return null;
}

function extractToolCards(message: unknown): ToolCard[] {
  const m = message as Record<string, unknown>;
  // Use rawContent if available, otherwise fall back to content
  const contentSource = m.rawContent !== undefined ? m.rawContent : m.content;
  const content = normalizeContent(contentSource);
  const cards: ToolCard[] = [];

  // Extract tool calls
  for (const item of content) {
    const isToolCall =
      isToolCallContentType(item.type) ||
      (typeof item.name === "string" && resolveToolBlockArgs(item) != null);
    if (isToolCall) {
      cards.push({
        kind: "call",
        name: (item.name as string) ?? "tool",
        args: coerceArgs(resolveToolBlockArgs(item)),
      });
    }
  }

  // Extract tool results
  for (const item of content) {
    if (!isToolResultContentType(item.type)) {
      continue;
    }
    const text = extractToolText(item);
    const name = typeof item.name === "string" ? item.name : "tool";
    cards.push({ kind: "result", name, text });
  }

  if (isToolResultMessage(message) && !cards.some((card) => card.kind === "result")) {
    const name =
      (typeof m.toolName === "string" && m.toolName) ||
      (typeof m.tool_name === "string" && m.tool_name) ||
      "tool";
    const text = extractTextCached(message) ?? undefined;
    cards.push({ kind: "result", name, text });
  }

  return cards;
}

function detectJson(text: string): { parsed: unknown; pretty: string } | null {
  const t = text.trim();
  
  if (t.length > MAX_JSON_AUTOPARSE_CHARS) {
    return null;
  }
  
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
  if (Array.isArray(parsed)) {
    return `Array (${parsed.length} item${parsed.length === 1 ? "" : "s"})`;
  }
  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length <= 4) {
      return `{ ${keys.join(", ")} }`;
    }
    return `Object (${keys.length} keys)`;
  }
  return "JSON";
}

function formatToolOutputForSidebar(text: string): string {
  const trimmed = text.trim();
  // Try to detect and format JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return text;
}

function getTruncatedPreview(text: string): string {
  const allLines = text.split("\n");
  const lines = allLines.slice(0, PREVIEW_MAX_LINES);
  const preview = lines.join("\n");
  if (preview.length > PREVIEW_MAX_CHARS) {
    return preview.slice(0, PREVIEW_MAX_CHARS) + "…";
  }
  return lines.length < allLines.length ? preview + "…" : preview;
}

function normalizeToolName(name?: string): string {
  return (name ?? "tool").trim();
}

function defaultTitle(name: string): string {
  const cleaned = name.replace(/_/g, " ").trim();
  if (!cleaned) {
    return "Tool";
  }
  return cleaned
    .split(/\s+/)
    .map((part) =>
      part.length <= 2 && part.toUpperCase() === part
        ? part
        : `${part.at(0)?.toUpperCase() ?? ""}${part.slice(1)}`,
    )
    .join(" ");
}

function resolveToolDisplay(params: { name?: string; args?: unknown; meta?: string }) {
  const name = normalizeToolName(params.name);
  const title = defaultTitle(name);
  const label = title;
  
  let detail: string | undefined;
  if (params.args && typeof params.args === "object") {
    const args = params.args as Record<string, unknown>;
    const firstKey = Object.keys(args)[0];
    if (firstKey) {
      const value = args[firstKey];
      if (typeof value === "string" && value.length > 0) {
        detail = value.length > 40 ? `${value.slice(0, 37)}…` : value;
      } else if (typeof value === "number") {
        detail = String(value);
      }
    }
  }

  return {
    name,
    icon: "puzzle" as const,
    title,
    label,
    detail,
  };
}

function formatToolDetail(display: ReturnType<typeof resolveToolDisplay>): string | undefined {
  if (!display.detail) {
    return undefined;
  }
  return `with ${display.detail}`;
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

function extractGroupMeta(messages: MessageItem[], contextWindow: number | null): GroupMeta | null {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let cost = 0;
  let model: string | null = null;
  let hasUsage = false;

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    if (message.usage) {
      hasUsage = true;
      input += message.usage.input ?? 0;
      output += message.usage.output ?? 0;
      cacheRead += message.usage.cacheRead ?? 0;
      cacheWrite += message.usage.cacheWrite ?? 0;
    }
    if (message.cost?.total) {
      cost += message.cost.total;
    }
    if (message.meta?.model && message.meta.model !== "gateway-injected") {
      model = message.meta.model;
    }
  }

  if (!hasUsage && !model) {
    return null;
  }

  const contextPercent =
    contextWindow && input > 0 ? Math.min(Math.round((input / contextWindow) * 100), 100) : null;

  return { input, output, cacheRead, cacheWrite, cost, model, contextPercent };
}

function groupMessages(messages: MessageItem[], streamingMessageId?: string): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const msg of messages) {
    const normalizedRole = normalizeRoleForGrouping(msg.role);
    const isStreaming = streamingMessageId === msg.id;
    const timestamp = msg.timestamp instanceof Date ? msg.timestamp.getTime() : Date.now();

    if (currentGroup && normalizeRoleForGrouping(currentGroup.role) === normalizedRole) {
      currentGroup.messages.push({ message: msg });
      if (isStreaming) {
        currentGroup.isStreaming = true;
      }
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        role: msg.role,
        timestamp,
        messages: [{ message: msg }],
        isStreaming,
      };
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

// ==========================================
// COMPONENTS
// ==========================================

function Avatar({ role }: { role: string }) {
  const normalized = normalizeRoleForGrouping(role);
  
  return (
    <div className={`chat-avatar ${normalized}`}>
      {normalized === "user" ? (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      ) : normalized === "assistant" ? (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2L8 14 2 9.2h7.6z" />
        </svg>
      ) : normalized === "tool" ? (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path
            d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53a7.76 7.76 0 0 0 .07-1 7.76 7.76 0 0 0-.07-.97l2.11-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.15 7.15 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65a7.15 7.15 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64L4.57 11a7.9 7.9 0 0 0 0 1.94l-2.11 1.69a.49.49 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61-.22l2.49-1c.52.4 1.08.72 1.69.98l.38 2.65c.05.24.26.42.49.42h4c.23 0 .44-.18.49-.42l.38-2.65a7.15 7.15 0 0 0 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.49.49 0 0 0-.12-.64z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )}
    </div>
  );
}

function MessageMeta({ meta }: { meta: GroupMeta | null }) {
  if (!meta) return null;

  const parts: React.ReactNode[] = [];

  if (meta.input) {
    parts.push(
      <span key="input" className="msg-meta__tokens">
        ↑{fmtTokens(meta.input)}
      </span>
    );
  }
  if (meta.output) {
    parts.push(
      <span key="output" className="msg-meta__tokens">
        ↓{fmtTokens(meta.output)}
      </span>
    );
  }

  if (meta.cacheRead) {
    parts.push(
      <span key="cacheRead" className="msg-meta__cache">
        R{fmtTokens(meta.cacheRead)}
      </span>
    );
  }
  if (meta.cacheWrite) {
    parts.push(
      <span key="cacheWrite" className="msg-meta__cache">
        W{fmtTokens(meta.cacheWrite)}
      </span>
    );
  }

  if (meta.cost > 0) {
    parts.push(
      <span key="cost" className="msg-meta__cost">
        ${meta.cost.toFixed(4)}
      </span>
    );
  }

  if (meta.contextPercent !== null) {
    const pct = meta.contextPercent;
    const cls =
      pct >= 90
        ? "msg-meta__ctx msg-meta__ctx--danger"
        : pct >= 75
          ? "msg-meta__ctx msg-meta__ctx--warn"
          : "msg-meta__ctx";
    parts.push(
      <span key="ctx" className={cls}>
        {pct}% ctx
      </span>
    );
  }

  if (meta.model) {
    const shortModel = meta.model.includes("/")
      ? meta.model.split("/").pop()!
      : meta.model;
    parts.push(
      <span key="model" className="msg-meta__model">
        {shortModel}
      </span>
    );
  }

  if (parts.length === 0) return null;

  return <span className="msg-meta">{parts}</span>;
}

function ToolCardSidebar({
  card,
  onOpenSidebar,
}: {
  card: ToolCard;
  onOpenSidebar?: (content: string) => void;
}) {
  const display = resolveToolDisplay({ name: card.name, args: card.args });
  const detail = formatToolDetail(display);
  const hasText = Boolean(card.text?.trim());

  const canClick = Boolean(onOpenSidebar);
  const handleClick = canClick
    ? () => {
        if (hasText) {
          onOpenSidebar!(formatToolOutputForSidebar(card.text!));
          return;
        }
        const info = `## ${display.label}\n\n${
          detail ? `**Command:** \`${detail}\`\n\n` : ""
        }*No output — tool completed successfully.*`;
        onOpenSidebar!(info);
      }
    : undefined;

  const isShort = hasText && (card.text?.length ?? 0) <= TOOL_INLINE_THRESHOLD;
  const showCollapsed = hasText && !isShort;
  const showInline = hasText && isShort;
  const isEmpty = !hasText;

  return (
    <div
      className={`chat-tool-card ${canClick ? "chat-tool-card--clickable" : ""}`}
      onClick={handleClick}
    >
      <div className="chat-tool-card__header">
        <div className="chat-tool-card__title">
          <span className="chat-tool-card__icon">{icons.puzzle}</span>
          <span>{display.label}</span>
        </div>
        {canClick ? (
          <span className="chat-tool-card__action">
            {hasText ? "View" : ""} {icons.check}
          </span>
        ) : null}
        {isEmpty && !canClick ? (
          <span className="chat-tool-card__status">{icons.check}</span>
        ) : null}
      </div>
      {detail ? <div className="chat-tool-card__detail">{detail}</div> : null}
      {isEmpty ? <div className="chat-tool-card__status-text muted">Completed</div> : null}
      {showCollapsed ? (
        <div className="chat-tool-card__preview mono">{getTruncatedPreview(card.text!)}</div>
      ) : null}
      {showInline ? <div className="chat-tool-card__inline mono">{card.text}</div> : null}
    </div>
  );
}

function CollapsedToolCards({
  toolCards,
  onOpenSidebar,
}: {
  toolCards: ToolCard[];
  onOpenSidebar?: (content: string) => void;
}) {
  const calls = toolCards.filter((c) => c.kind === "call");
  const results = toolCards.filter((c) => c.kind === "result");
  const totalTools = Math.max(calls.length, results.length) || toolCards.length;
  const toolNames = [...new Set(toolCards.map((c) => c.name))];
  const summaryLabel =
    toolNames.length <= 3
      ? toolNames.join(", ")
      : `${toolNames.slice(0, 2).join(", ")} +${toolNames.length - 2} more`;

  return (
    <details className="chat-tools-collapse">
      <summary className="chat-tools-summary">
        <span className="chat-tools-summary__icon">{icons.zap}</span>
        <span className="chat-tools-summary__count">
          {totalTools} tool{totalTools === 1 ? "" : "s"}
        </span>
        <span className="chat-tools-summary__names">{summaryLabel}</span>
      </summary>
      <div className="chat-tools-collapse__body">
        {toolCards.map((card, i) => (
          <ToolCardSidebar key={i} card={card} onOpenSidebar={onOpenSidebar} />
        ))}
      </div>
    </details>
  );
}

function GroupedMessage({
  message,
  isStreaming,
  showReasoning,
  showToolCalls,
  onOpenSidebar,
}: {
  message: unknown;
  isStreaming: boolean;
  showReasoning: boolean;
  showToolCalls?: boolean;
  onOpenSidebar?: (content: string) => void;
}) {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "unknown";
  const normalizedRole = normalizeRoleForGrouping(role);
  const isToolResult = isToolResultMessage(message);

  const toolCards = (showToolCalls ?? true) ? extractToolCards(message) : [];
  const hasToolCards = toolCards.length > 0;

  const extractedText = extractTextCached(message);
  const extractedThinking =
    showReasoning && role === "assistant" ? extractThinkingCached(message) : null;
  const markdownBase = extractedText?.trim() ? extractedText : null;
  const reasoningMarkdown = extractedThinking ? extractedThinking : null;
  const markdown = markdownBase;

  const jsonResult = markdown && !isStreaming ? detectJson(markdown) : null;

  const bubbleClasses = ["chat-bubble", isStreaming ? "streaming" : "", "fade-in"]
    .filter(Boolean)
    .join(" ");

  if (!markdown && hasToolCards && isToolResult) {
    return <CollapsedToolCards toolCards={toolCards} onOpenSidebar={onOpenSidebar} />;
  }

  const visibleToolCards = hasToolCards && (showToolCalls ?? true);
  if (!markdown && !visibleToolCards) {
    return null;
  }

  const isToolMessage = normalizedRole === "tool" || isToolResult;
  const toolNames = [...new Set(toolCards.map((c) => c.name))];
  const toolSummaryLabel =
    toolNames.length <= 3
      ? toolNames.join(", ")
      : `${toolNames.slice(0, 2).join(", ")} +${toolNames.length - 2} more`;
  const toolPreview =
    markdown && !toolSummaryLabel ? markdown.trim().replace(/\s+/g, " ").slice(0, 120) : "";

  const content = (
    <>
      {reasoningMarkdown && (
        <div className="chat-thinking">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reasoningMarkdown}</ReactMarkdown>
        </div>
      )}
      {jsonResult ? (
        <details className="chat-json-collapse">
          <summary className="chat-json-summary">
            <span className="chat-json-badge">JSON</span>
            <span className="chat-json-label">{jsonSummaryLabel(jsonResult.parsed)}</span>
          </summary>
          <pre className="chat-json-content">
            <code>{jsonResult.pretty}</code>
          </pre>
        </details>
      ) : markdown ? (
        <div className="chat-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      ) : null}
      {hasToolCards && <CollapsedToolCards toolCards={toolCards} onOpenSidebar={onOpenSidebar} />}
    </>
  );

  if (isToolMessage) {
    return (
      <div className={bubbleClasses}>
        <details className="chat-tool-msg-collapse">
          <summary className="chat-tool-msg-summary">
            <span className="chat-tool-msg-summary__icon">{icons.zap}</span>
            <span className="chat-tool-msg-summary__label">Tool output</span>
            {toolSummaryLabel ? (
              <span className="chat-tool-msg-summary__names">{toolSummaryLabel}</span>
            ) : toolPreview ? (
              <span className="chat-tool-msg-summary__preview">{toolPreview}</span>
            ) : null}
          </summary>
          <div className="chat-tool-msg-body">{content}</div>
        </details>
      </div>
    );
  }

  return <div className={bubbleClasses}>{content}</div>;
}

function MessageGroup({
  group,
  messages,
  onOpenSidebar,
  showReasoning,
  showToolCalls,
}: {
  group: MessageGroup;
  messages: MessageItem[];
  onOpenSidebar?: (content: string) => void;
  showReasoning: boolean;
  showToolCalls?: boolean;
}) {
  const normalizedRole = normalizeRoleForGrouping(group.role);
  const who =
    normalizedRole === "user"
      ? "You"
      : normalizedRole === "assistant"
        ? "Assistant"
        : normalizedRole === "tool"
          ? "Tool"
          : normalizedRole;
  const roleClass =
    normalizedRole === "user"
      ? "user"
      : normalizedRole === "assistant"
        ? "assistant"
        : normalizedRole === "tool"
          ? "tool"
          : "other";
  const timestamp = new Date(group.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const meta = extractGroupMeta(messages, null);

  return (
    <div className={`chat-group ${roleClass}`}>
      <Avatar role={group.role} />
      <div className="chat-group-messages">
        {group.messages.map((item, index) => {
          const msg = item.message as MessageItem;
          return (
            <GroupedMessage
              key={msg.id || index}
              message={msg}
              isStreaming={group.isStreaming && index === group.messages.length - 1}
              showReasoning={showReasoning}
              showToolCalls={showToolCalls}
              onOpenSidebar={onOpenSidebar}
            />
          );
        })}
        <div className="chat-group-footer">
          <span className="chat-sender-name">{who}</span>
          <span className="chat-group-timestamp">{timestamp}</span>
          <MessageMeta meta={meta} />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

interface MessageListProps {
  messages: MessageItem[];
  streamingMessageId?: string;
  streamingDelta?: string | number;
  onDeleteMessage?: (id: string) => void;
  onPinMessage?: (id: string) => void;
  showThinking?: boolean;
  showToolCalls?: boolean;
  onOpenSidebar?: (content: string) => void;
}

export default function MessageList({
  messages,
  streamingMessageId,
  showThinking = true,
  showToolCalls = true,
  onOpenSidebar,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const groups = useMemo(
    () => groupMessages(messages, streamingMessageId),
    [messages, streamingMessageId]
  );

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessageId, autoScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div className="py-4">
        {groups.map((group, index) => (
          <MessageGroup
            key={index}
            group={group}
            messages={messages}
            onOpenSidebar={onOpenSidebar}
            showReasoning={showThinking}
            showToolCalls={showToolCalls}
          />
        ))}
      </div>
    </div>
  );
}
