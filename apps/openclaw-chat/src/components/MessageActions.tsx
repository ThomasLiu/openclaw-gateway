"use client";

/**
 * MessageActions - 消息操作按钮组件
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */
import { useState, useEffect, useCallback } from "react";

type MessageActionsProps = {
  message: { id: string; role: string; content: string; isPinned?: boolean };
  onDelete?: () => void;
  onPin?: () => void;
  onSpeak?: () => void;
  canSpeak?: boolean;
  isSpeaking?: boolean;
};

const SKIP_DELETE_CONFIRM_KEY = "openclaw:skipDeleteConfirm";

function getSkipDeleteConfirm(): boolean {
  try {
    return localStorage?.getItem(SKIP_DELETE_CONFIRM_KEY) === "1";
  } catch {
    return false;
  }
}

function setSkipDeleteConfirm(value: boolean) {
  try {
    if (value) {
      localStorage?.setItem(SKIP_DELETE_CONFIRM_KEY, "1");
    } else {
      localStorage?.removeItem(SKIP_DELETE_CONFIRM_KEY);
    }
  } catch {}
}

export default function MessageActions({
  message,
  onDelete,
  onPin,
  canSpeak,
  isSpeaking,
}: MessageActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  // 初始化为 false，useEffect 中再从 localStorage 读取，避免 hydration 不匹配
  const [skipConfirm, setSkipConfirm] = useState(false);

  // 客户端挂载后从 localStorage 读取
  useEffect(() => {
    setSkipConfirm(getSkipDeleteConfirm());
  }, []);

  const handleDelete = useCallback(() => {
    if (skipConfirm || !onDelete) {
      onDelete?.();
      setShowConfirm(false);
      return;
    }
    setShowConfirm(true);
  }, [skipConfirm, onDelete]);

  const handleConfirmDelete = useCallback(() => {
    if (skipConfirm) {
      setSkipDeleteConfirm(true);
    }
    onDelete?.();
    setShowConfirm(false);
  }, [skipConfirm, onDelete]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div className="chat-bubble-actions">
      {/* Open in canvas */}
      <button
        className="chat-action-btn"
        title="Open in canvas"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>

      {/* Copy as Markdown */}
      <button
        className="chat-action-btn"
        title="Copy as Markdown"
        onClick={() => {
          navigator.clipboard.writeText(message.content);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>

      {/* TTS 朗读 */}
      {canSpeak && (
        <button
          className={`chat-action-btn ${isSpeaking ? "chat-action-btn--active" : ""}`}
          title={isSpeaking ? "Stop speaking" : "Read aloud"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        </button>
      )}

      {/* Pin/Unpin */}
      {onPin && (
        <button
          className={`chat-action-btn ${message.isPinned ? "chat-action-btn--active" : ""}`}
          title={message.isPinned ? "Unpin" : "Pin to top"}
          onClick={onPin}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v4.76z" />
          </svg>
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <div className="chat-delete-wrap">
          <button
            className="chat-action-btn chat-action-btn--danger"
            title="Delete"
            onClick={handleDelete}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>

          {showConfirm && (
            <div className="chat-delete-confirm chat-delete-confirm--right">
              <p className="chat-delete-confirm__text">Delete this message?</p>
              <label className="chat-delete-confirm__remember">
                <input
                  type="checkbox"
                  className="chat-delete-confirm__check"
                  checked={skipConfirm}
                  onChange={(e) => setSkipConfirm(e.target.checked)}
                />
                <span>Don't ask again</span>
              </label>
              <div className="chat-delete-confirm__actions">
                <button className="chat-delete-confirm__cancel" onClick={handleCancel}>Cancel</button>
                <button className="chat-delete-confirm__yes" onClick={handleConfirmDelete}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
