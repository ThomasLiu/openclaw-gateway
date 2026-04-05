"use client";

/**
 * ToolCard - 工具卡片组件
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/tool-cards.ts
 */
import type { ToolCard as ToolCardType } from "./chat-types";

type ToolCardProps = {
  card: ToolCardType;
  onOpenSidebar?: (content: string) => void;
};

const TOOL_INLINE_THRESHOLD = 200;

function getTruncatedPreview(text: string): string {
  if (text.length <= TOOL_INLINE_THRESHOLD) {
    return text;
  }
  return text.slice(0, TOOL_INLINE_THRESHOLD) + "...";
}

export default function ToolCard({ card, onOpenSidebar }: ToolCardProps) {
  const hasText = Boolean(card.text?.trim());
  const canClick = Boolean(onOpenSidebar);
  const isShort = hasText && (card.text?.length ?? 0) <= TOOL_INLINE_THRESHOLD;
  const showCollapsed = hasText && !isShort;
  const showInline = hasText && isShort;
  const isEmpty = !hasText;

  const handleClick = () => {
    if (!canClick || !onOpenSidebar) return;
    if (hasText) {
      onOpenSidebar(card.text!);
      return;
    }
    const info = `## ${card.name}\n\n*No output — tool completed successfully.*`;
    onOpenSidebar(info);
  };

  return (
    <div
      className={`chat-tool-card ${canClick ? "chat-tool-card--clickable" : ""}`}
      onClick={handleClick}
      role={canClick ? "button" : undefined}
      tabIndex={canClick ? 0 : undefined}
    >
      <div className="chat-tool-card__header">
        <div className="chat-tool-card__title">
          <span className="chat-tool-card__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span>{card.name}</span>
        </div>
        {canClick && (
          <span className="chat-tool-card__action">
            {hasText ? "View" : ""}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        )}
        {isEmpty && !canClick && (
          <span className="chat-tool-card__status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>

      {isEmpty && !canClick && (
        <div className="chat-tool-card__status-text muted">Completed</div>
      )}

      {showCollapsed && (
        <div className="chat-tool-card__preview">{getTruncatedPreview(card.text!)}</div>
      )}

      {showInline && (
        <div className="chat-tool-card__inline">{card.text}</div>
      )}
    </div>
  );
}
