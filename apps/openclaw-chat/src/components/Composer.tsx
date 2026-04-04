"use client";

import React from "react";

/**
 * Composer - 输入框组件
 * 多行 textarea，支持 Enter 发送、Shift+Enter 换行
 * 流式状态时显示中止按钮
 */
import { useCallback, useRef, useState } from "react";
import type { ComposerProps } from "./chat-types";

export default function Composer({ disabled, streaming, onSend, onAbort }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Enter 发送，Shift+Enter 换行
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (draft.trim() && !disabled && !streaming) {
          onSend(draft.trim());
          setDraft("");
          // 重置高度
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        }
      }
    },
    [draft, disabled, streaming, onSend]
  );

  // 自动调整高度（input event）
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setDraft(textarea.value);
    // field-sizing: content 时自动调整，但仍强制同步以兼容
    textarea.style.height = "auto";
    const maxH = 200;
    const computed = Math.min(textarea.scrollHeight, maxH);
    textarea.style.height = `${computed}px`;
  }, []);

  return (
    <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950 flex-shrink-0">
      <div className="flex gap-2 items-end">
        {/* 文本输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              disabled
                ? "请先选择一个会话"
                : streaming
                ? "AI 正在生成中..."
                : "输入消息，Enter 发送，Shift+Enter 换行..."
            }
            rows={1}
            className="composer-textarea w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5
              text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none
              focus:border-zinc-500 transition-colors leading-relaxed
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "44px", maxHeight: "200px" }}
          />
        </div>

        {/* 发送 / 中止按钮 */}
        {streaming ? (
          <button
            onClick={onAbort}
            className="flex-shrink-0 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700
              text-white text-sm font-medium transition-colors
              flex items-center gap-1.5"
            title="中止生成"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="10" height="10" rx="1" />
            </svg>
            <span>停止</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (draft.trim() && !disabled) {
                onSend(draft.trim());
                setDraft("");
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                }
              }
            }}
            disabled={!draft.trim() || disabled}
            className="flex-shrink-0 px-4 py-2.5 rounded-lg
              bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600
              text-white text-sm font-medium transition-colors
              disabled:cursor-not-allowed"
            title="发送消息 (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 8l14-7-3 7 3 7L1 8z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
