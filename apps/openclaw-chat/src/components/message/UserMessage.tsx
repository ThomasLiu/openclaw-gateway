// ============================================================
// OpenClaw Chat - UserMessage Component
// 显示用户发送的消息气泡，支持 Markdown 渲染、操作工具栏
// ============================================================

'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Quote, Trash2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { SessionMessage } from '@/types'

interface UserMessageProps {
  /** 消息数据 */
  message: SessionMessage
  /** 引用回调 */
  onQuote?: (message: SessionMessage) => void
  /** 删除回调 */
  onDelete?: (message: SessionMessage) => void
}

/**
 * 用户消息组件
 * 
 * 特性：
 * - 深色背景区分用户消息
 * - 支持 Markdown 渲染
 * - Hover 时显示操作工具栏（复制/引用/删除）
 * - 所有文案使用 i18n
 */
export default function UserMessage({ message, onQuote, onDelete }: UserMessageProps) {
  const t = useTranslations('message')
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  // 获取纯文本内容
  const contentText = typeof message.content === 'string' 
    ? message.content 
    : message.content?.find(c => c.type === 'text')?.text || ''

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contentText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [contentText])

  // 引用消息
  const handleQuote = useCallback(() => {
    onQuote?.(message)
  }, [onQuote, message])

  // 删除消息
  const handleDelete = useCallback(() => {
    if (window.confirm(t('deleteConfirm'))) {
      onDelete?.(message)
    }
  }, [onDelete, message, t])

  return (
    <article
      data-testid="user-message"
      className="flex justify-end group/message mb-4"
      role="article"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-[80%] relative">
        {/* 消息气泡 */}
        <div
          data-testid="user-message-bubble"
          className="bg-bg-tertiary text-text-primary rounded-2xl px-4 py-3 shadow-sm"
        >
          {/* Markdown 内容渲染 */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {contentText}
            </ReactMarkdown>
          </div>

          {/* 时间戳 */}
          {message.timestamp && (
            <div
              data-testid="message-timestamp"
              className="text-xs text-text-muted mt-2 text-right"
            >
              {formatRelativeTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* 操作工具栏 - Hover 时显示 */}
        {isHovered && (
          <div
            className="absolute -top-10 right-0 flex items-center gap-1 bg-bg-secondary border border-border-primary rounded-lg px-2 py-1 shadow-md opacity-0 group-hover/message:opacity-100 transition-opacity"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              title={t('copy')}
              className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
              aria-label={t('copy')}
            >
              <Copy size={14} />
            </button>

            {/* 引用按钮 */}
            {onQuote && (
              <button
                onClick={handleQuote}
                title={t('quote')}
                className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
                aria-label={t('quote')}
              >
                <Quote size={14} />
              </button>
            )}

            {/* 删除按钮 */}
            {onDelete && (
              <button
                onClick={handleDelete}
                title={t('delete')}
                className="p-1.5 hover:bg-bg-hover rounded transition-colors text-error hover:text-error-dark"
                aria-label={t('delete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* 已复制提示 */}
        {copied && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-accent-primary text-white text-xs px-2 py-1 rounded shadow-md">
            {t('copied')}
          </div>
        )}
      </div>
    </article>
  )
}
