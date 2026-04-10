// ============================================================
// OpenClaw Chat - MessageList Container Component
// 消息列表容器，负责自动滚动、消息类型分发、虚拟滚动
// ============================================================

'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useVirtualizer } from '@tanstack/react-virtual'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'
import ToolMessage from './ToolMessage'
import type { SessionMessage } from '@/types'

interface MessageListProps {
  /** 消息列表 */
  messages: SessionMessage[]
  /** 是否正在加载 */
  isLoading?: boolean
  /** 是否正在流式输出 */
  isStreaming?: boolean
  /** 是否启用虚拟滚动 */
  virtualScroll?: boolean
  /** 引用回调 */
  onQuote?: (message: SessionMessage) => void
  /** 删除回调 */
  onDelete?: (message: SessionMessage) => void
}

/**
 * 消息列表容器组件
 * 
 * 特性：
 * - 自动滚动到最新消息
 * - 用户向上翻阅时暂停自动滚动
 * - 空状态提示
 * - 加载中 skeleton
 * - 消息按类型分发到对应子组件
 * - 虚拟滚动集成（@tanstack/react-virtual）
 */
export default function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  virtualScroll = false,
  onQuote,
  onDelete,
}: MessageListProps) {
  const t = useTranslations('chat')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current && shouldAutoScrollRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [])

  // 监听用户滚动行为
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const threshold = 100 // 距离底部 100px 内视为在底部
    
    // 如果用户向上滚动了，暂停自动滚动
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < threshold
  }, [])

  // 当新消息到达或流式输出状态变化时自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [messages.length, isStreaming, scrollToBottom])

  // 当消息内容变化时（例如从流式输出变为完整内容），也需要滚动
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已经更新
    const timer = setTimeout(() => {
      scrollToBottom()
    }, 100)

    return () => clearTimeout(timer)
  }, [messages, isStreaming, scrollToBottom])

  // 渲染单个消息
  const renderMessage = (message: SessionMessage, index: number) => {
    switch (message.role) {
      case 'user':
        return (
          <UserMessage
            key={`user-${index}`}
            message={message}
            onQuote={onQuote}
            onDelete={onDelete}
          />
        )
      
      case 'assistant':
        return (
          <AssistantMessage
            key={`assistant-${index}`}
            message={message}
            isStreaming={isStreaming && index === messages.length - 1}
            onQuote={onQuote}
            onDelete={onDelete}
          />
        )
      
      default:
        return null
    }
  }

  // 空状态渲染
  const renderEmptyState = () => (
    <div data-testid="empty-state" className="flex-1 flex items-center justify-center">
      <div className="mx-auto max-w-[760px] px-6 py-12 text-center">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight text-text-primary">
          {t('emptyTitle')}
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-text-secondary">
          {t('emptyState')}
        </p>

        {/* 快捷操作卡片 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { title: t('newChat'), desc: t('startNewChatDesc') },
            { title: t('recentSession'), desc: t('openRecentSessionDesc') },
            { title: t('browseExamples'), desc: t('browseExamplesDesc') },
            { title: t('viewDocs'), desc: t('viewDocsDesc') },
          ].map((action, idx) => (
            <button
              key={idx}
              className="group rounded-lg bg-bg-secondary p-4 text-left transition-all hover:bg-bg-hover"
            >
              <div className="mb-1 text-sm font-medium text-text-primary group-hover:text-accent-primary">
                {action.title}
              </div>
              <div className="text-xs leading-6 text-text-secondary">
                {action.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // 加载中骨架屏
  const renderLoadingSkeleton = () => (
    <div data-testid="loading-skeleton" className="flex-1 flex items-center justify-center p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse space-y-3 w-full max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-bg-tertiary rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-bg-tertiary rounded w-3/4" />
              <div className="h-4 bg-bg-tertiary rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // 主内容渲染
  const renderContent = () => {
    // 加载中状态
    if (isLoading && messages.length === 0) {
      return renderLoadingSkeleton()
    }

    // 空状态
    if (messages.length === 0) {
      return renderEmptyState()
    }

    // 使用虚拟滚动或普通列表
    if (virtualScroll && messages.length > 50) {
      return <VirtualizedMessageList messages={messages} renderMessage={renderMessage} />
    }

    // 普通列表渲染
    return (
      <div className="mx-auto max-w-[760px] space-y-7 px-6 py-7">
        {messages.map((message, index) => renderMessage(message, index))}
      </div>
    )
  }

  return (
    <div
      data-testid="scroll-container"
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div data-testid="message-list" className="h-full">
        {renderContent()}
      </div>
    </div>
  )
}

/**
 * 虚拟化消息列表组件
 * 用于大量消息的性能优化
 */
function VirtualizedMessageList({
  messages,
  renderMessage,
}: {
  messages: SessionMessage[]
  renderMessage: (message: SessionMessage, index: number) => React.ReactNode
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // 预估每条消息高度
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // 当新消息到达时自动滚动到底部
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight
    }
  }, [messages.length])

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderMessage(messages[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
