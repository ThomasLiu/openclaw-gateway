// ============================================================
// OpenClaw Chat - AssistantMessage Component
// 显示助手消息气泡，支持 Markdown、代码块、Tool Call、朗读等
// ============================================================

'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Quote, Trash2, Volume2, VolumeX } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { SessionMessage } from '@/types'

interface AssistantMessageProps {
  /** 消息数据 */
  message: SessionMessage
  /** 是否正在流式输出 */
  isStreaming?: boolean
  /** 引用回调 */
  onQuote?: (message: SessionMessage) => void
  /** 删除回调 */
  onDelete?: (message: SessionMessage) => void
}

/**
 * 助手消息组件
 * 
 * 特性：
 * - 支持 Markdown 渲染（代码块、表格、列表、行内代码）
 * - 代码块右上角有独立复制按钮
 * - Tool Call blocks 可折叠展示
 * - Reasoning/Thinking 块可折叠
 * - 流式输出时显示打字动画
 * - 操作工具栏（复制/删除/引用/朗读）
 * - 朗读功能（Web Speech API）
 * - 所有文案使用 i18n
 */
export default function AssistantMessage({ 
  message, 
  isStreaming = false,
  onQuote, 
  onDelete 
}: AssistantMessageProps) {
  const t = useTranslations('message')
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [toolCallExpanded, setToolCallExpanded] = useState<Record<string, boolean>>({})
  const [thinkingExpanded, setThinkingExpanded] = useState(false)

  // 获取文本内容
  const getTextContent = useCallback((): string => {
    if (typeof message.content === 'string') {
      return message.content
    }
    
    // 处理 MessageContent 数组
    const textParts = (message.content as Array<{ type: string; text?: string }>)
      ?.filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('\n')
    
    return textParts
  }, [message.content])

  // 获取 thinking 内容
  const getThinkingContent = (): string | null => {
    if (typeof message.content === 'string') {
      return null
    }
    
    const thinkingPart = (message.content as Array<{ type: string; thinking?: string }>)
      ?.find(c => c.type === 'thinking')
    
    return thinkingPart?.thinking || null
  }

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getTextContent())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [getTextContent])

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

  // 开始朗读
  const handleSpeak = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(getTextContent())
      utterance.lang = 'zh-CN'
      utterance.rate = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }, [getTextContent])

  // 停止朗读
  const handleStopSpeak = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // 切换 Tool Call 展开状态
  const toggleToolCall = (id: string) => {
    setToolCallExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // 自定义代码块渲染器（带复制按钮）
  const CodeBlock = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const codeString = String(children).replace(/\n$/, '')
    const isCodeBlock = className?.includes('language-')

    if (!isCodeBlock) {
      return <code className={className}>{children}</code>
    }

    return (
      <div data-testid="code-block" className="relative group/code">
        {/* 复制按钮 */}
        <button
          data-testid="code-copy-button"
          onClick={() => navigator.clipboard.writeText(codeString)}
          className="absolute right-3 top-3 rounded-md bg-bg-secondary p-2 opacity-0 transition-opacity group-hover/code:opacity-100 hover:bg-bg-hover"
          title={t('copy')}
        >
          <Copy size={14} />
        </button>
        <pre className="overflow-x-auto rounded-lg bg-[#0d1117] p-4">
          <code className={className}>{children}</code>
        </pre>
      </div>
    )
  }

  // 获取 thinking 内容
  const thinkingContent = getThinkingContent()

  return (
    <article
      data-testid="assistant-message"
      className="flex justify-start group/message mb-4"
      role="article"
    >
      <div className="relative w-full max-w-[760px]">
        {/* 消息气泡 */}
        <div className="px-1 py-1 text-text-primary">
          {/* Thinking 块 */}
          {thinkingContent && (
            <div data-testid="thinking-block" className="mb-4 overflow-hidden rounded-lg bg-bg-secondary">
              <button
                data-testid="thinking-toggle"
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="flex w-full items-center gap-2 bg-bg-secondary px-4 py-3 text-left text-sm transition-colors hover:bg-bg-hover"
              >
                <span className="text-text-muted">{t('thinking')}</span>
                <span className="text-xs text-text-muted">
                  {thinkingExpanded ? t('collapse') : t('expand')}
                </span>
              </button>
              {thinkingExpanded && (
                <div className="bg-bg-secondary px-4 pb-3 text-sm italic text-text-muted">
                  {thinkingContent}
                </div>
              )}
            </div>
          )}

          {/* Markdown 内容渲染 */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock as any,
              }}
            >
              {getTextContent()}
            </ReactMarkdown>
          </div>

          {/* Tool Call 块 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.toolCalls.map((toolCall) => (
                <div key={toolCall.id} data-testid="tool-call-block" className="overflow-hidden rounded-lg bg-bg-secondary">
                  <button
                    data-testid="tool-call-toggle"
                    onClick={() => toggleToolCall(toolCall.id)}
                    className="flex w-full items-center gap-2 bg-bg-secondary px-4 py-3 text-left text-sm transition-colors hover:bg-bg-hover"
                  >
                    <span className="font-medium">{t('toolCall')}:</span>
                    <span className="text-accent-primary">{toolCall.function.name}</span>
                    <span className="text-xs text-text-muted ml-auto">
                      {toolCallExpanded[toolCall.id] ? t('collapse') : t('expand')}
                    </span>
                  </button>
                  
                  {toolCallExpanded[toolCall.id] && (
                    <div className="space-y-2 bg-bg-secondary p-4 text-xs">
                      <div>
                        <div className="font-medium text-text-secondary mb-1">{t('inputParams')}:</div>
                        <pre className="overflow-x-auto rounded-lg bg-[#0d1117] p-3">
                          {toolCall.function.arguments}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 流式输出指示器 */}
          {isStreaming && (
            <div data-testid="streaming-indicator" className="mt-2 flex items-center gap-1 text-accent-primary">
              <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-sm">{t('streaming')}</span>
            </div>
          )}

          {/* 时间戳 */}
          {message.timestamp && (
            <div
              data-testid="message-timestamp"
              className="mt-3 text-[11px] text-text-muted"
            >
              {formatRelativeTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* 操作工具栏 */}
        <div
          data-testid="message-toolbar"
          className="absolute -top-10 left-0 flex items-center gap-1 rounded-lg bg-bg-secondary px-1.5 py-1 opacity-0 transition-opacity group-hover/message:opacity-100"
        >
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            title={t('copy')}
            className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label={t('copy')}
          >
            <Copy size={14} />
          </button>

          {/* 引用按钮 */}
          {onQuote && (
            <button
              onClick={handleQuote}
              title={t('quote')}
              className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label={t('quote')}
            >
              <Quote size={14} />
            </button>
          )}

          {/* 朗读/停止按钮 */}
          {!isSpeaking ? (
            <button
              data-testid="speak-button"
              onClick={handleSpeak}
              title={t('speak')}
              className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label={t('speak')}
            >
              <Volume2 size={14} />
            </button>
          ) : (
            <button
              data-testid="stop-speak-button"
              onClick={handleStopSpeak}
              title={t('stopSpeaking')}
              className="rounded-md p-2 text-accent-primary transition-colors hover:bg-bg-hover"
              aria-label={t('stopSpeaking')}
            >
              <VolumeX size={14} />
            </button>
          )}

          {/* 删除按钮 */}
          {onDelete && (
            <button
              onClick={handleDelete}
              title={t('delete')}
              className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-error"
              aria-label={t('delete')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* 已复制提示 */}
        {copied && (
          <div className="absolute left-1/2 top-[-2.5rem] -translate-x-1/2 rounded-md bg-accent-primary px-2.5 py-1 text-xs text-white shadow-md">
            {t('copied')}
          </div>
        )}
      </div>
    </article>
  )
}
