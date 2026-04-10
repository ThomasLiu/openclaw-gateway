// ============================================================
// OpenClaw Chat - ChatInput Component
// 多行文本输入框，支持自动高度调整、快捷键、历史输入
// ============================================================

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  /** 发送回调 */
  onSend: (message: string) => void
  /** 停止回调 */
  onStop?: () => void
  /** 是否正在运行 */
  isRunning?: boolean
  /** 输入历史 */
  inputHistory?: string[]
  /** 占位符文本 */
  placeholder?: string
}

/**
 * 聊天输入框组件
 * 
 * 特性：
 * - 多行文本输入框（自动高度调整，最大 200px）
 * - 发送/停止按钮切换（基于 isRunning prop）
 * - Command+Z / Command+Shift+Z 撤销重做
 * - 键盘上下键切换历史输入
 * - 发送时调用 onSend callback
 * - 停止时调用 onStop callback
 * - placeholder 使用 i18n
 * - 发送/停止按钮文案 i18n
 */
export default function ChatInput({
  onSend,
  onStop,
  isRunning = false,
  inputHistory = [],
  placeholder,
}: ChatInputProps) {
  const t = useTranslations('input')
  const [value, setValue] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${newHeight}px`
  }, [])

  // 当值变化时调整高度
  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // 处理发送
  const handleSend = useCallback(() => {
    if (!value.trim()) return

    onSend(value.trim())
    setValue('')
    setHistoryIndex(-1)

    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, onSend])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送（Shift+Enter 换行）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
        return
      }

      // 上箭头：浏览历史记录（上一条）
      if (e.key === 'ArrowUp') {
        const textarea = textareaRef.current
        if (!textarea || textarea.selectionStart !== textarea.value.length) return

        e.preventDefault()
        if (inputHistory.length > 0) {
          const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1)
          setHistoryIndex(newIndex)
          setValue(inputHistory[inputHistory.length - 1 - newIndex])
        }
        return
      }

      // 下箭头：浏览历史记录（下一条）
      if (e.key === 'ArrowDown') {
        const textarea = textareaRef.current
        if (!textarea || textarea.selectionStart !== textarea.value.length) return

        e.preventDefault()
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          setValue(inputHistory[inputHistory.length - 1 - newIndex])
        } else if (historyIndex === 0) {
          setHistoryIndex(-1)
          setValue('')
        }
        return
      }

      // Command+Z 撤销（浏览器默认行为）
      // Command+Shift+Z 重做（浏览器默认行为）
    },
    [handleSend, historyIndex, inputHistory]
  )

  // 处理值变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      // 重置历史索引当用户手动编辑时
      if (historyIndex >= 0) {
        setHistoryIndex(-1)
      }
    },
    [historyIndex]
  )

  return (
    <div className="relative flex items-end gap-2.5 rounded-xl border border-border-primary bg-bg-input px-3 py-2.5 shadow-sm transition-colors focus-within:border-accent-primary focus-within:shadow-[0_0_0_4px_rgba(120,166,255,0.12)]">
      {/* 文本输入区域 */}
      <textarea
        ref={textareaRef}
        data-testid="chat-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('placeholder')}
        className="min-h-[52px] max-h-[200px] flex-1 resize-none bg-transparent px-3 py-3 text-[14px] leading-6 text-text-primary outline-none placeholder:text-text-muted"
        rows={1}
        disabled={isRunning}
      />

      {/* 按钮 */}
      <div className="flex items-center gap-1.5 pr-1">
        {isRunning ? (
          /* 停止按钮 */
          <button
            data-testid="stop-button"
            onClick={onStop}
            title={t('stop')}
            className="m-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-bg-hover text-text-primary transition-colors hover:bg-bg-active"
            aria-label={t('stop')}
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          /* 发送按钮 */
          <button
            data-testid="send-button"
            onClick={handleSend}
            disabled={!value.trim()}
            title={t('send')}
            className="m-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent-primary"
            aria-label={t('send')}
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
