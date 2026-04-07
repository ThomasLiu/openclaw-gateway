// ============================================================
// OpenClaw Chat - SessionCard 组件
// Session 卡片组件，显示单个会话的信息（双行卡片）
// ============================================================

"use client";

import React from "react";
import { useTranslations } from 'next-intl'
import { MessageSquare, Trash2, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { SessionMetadata } from "@/types";

/** SessionCard 组件属性 */
interface SessionCardProps {
  /** Session 元数据 */
  session: SessionMetadata;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否工作中 */
  isWorking?: boolean;
  /** 未读消息数 */
  unreadCount?: number;
  /** 用户最后消息 */
  lastUserMessage?: string;
  /** 助手最后回复 */
  lastAssistantMessage?: string;
  /** 选择回调 */
  onSelect?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
}

/**
 * SessionCard 组件
 * 显示双行卡片：第一行用户消息，第二行助手回复
 */
export default function SessionCard({
  session,
  isSelected = false,
  isWorking = false,
  unreadCount = 0,
  lastUserMessage,
  lastAssistantMessage,
  onSelect,
  onDelete,
}: SessionCardProps) {
  const tSession = useTranslations('session')
  
  const displayTime = session.startTime 
    ? formatRelativeTime(session.startTime)
    : null

  /**
   * 处理卡片点击事件
   */
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onSelect?.()
  }

  /**
   * 处理删除按钮点击
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      data-testid={`session-card-${session.id}`}
      className={`
        group flex items-start gap-2 p-2 rounded cursor-pointer transition-colors
        hover:bg-bg-hover
        ${isSelected ? 'bg-bg-active border-l-2 border-accent-primary' : ''}
        ${isWorking ? 'working' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <MessageSquare 
          size={14} 
          className={`text-text-secondary transition-colors ${
            isWorking ? 'animate-pulse text-status-warning' : ''
          }`}
        />
      </div>

      {/* Content - Double Line */}
      <div className="flex-1 min-w-0">
        {/* First Line: User Message */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-text-primary truncate" title={lastUserMessage}>
            {lastUserMessage ? (
              <span>
                <span className="text-text-muted">{tSession('userMessage')}</span>
                {lastUserMessage.length > 30 ? `${lastUserMessage.slice(0, 30)}...` : lastUserMessage}
              </span>
            ) : (
              <span className="text-text-muted italic">--</span>
            )}
          </span>
          
          {/* Time or Working Indicator */}
          <span className="text-xs text-text-muted flex-shrink-0">
            {isWorking ? (
              <span className="inline-flex items-center gap-1 text-status-warning">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              </span>
            ) : displayTime || ''}
          </span>
        </div>

        {/* Second Line: Assistant Reply */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary truncate" title={lastAssistantMessage}>
            {lastAssistantMessage ? (
              <span>
                <span className="text-text-muted">{tSession('agentReply')}</span>
                {lastAssistantMessage.length > 25 ? `${lastAssistantMessage.slice(0, 25)}...` : lastAssistantMessage}
              </span>
            ) : (
              <span className="text-text-muted/50 italic">--</span>
            )}
          </span>
          
          {/* Unread Badge & Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-medium rounded-full bg-accent-primary text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            
            {/* Delete Button - Visible on Hover */}
            {onDelete && (
              <button
                data-testid="session-delete"
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary rounded transition-all text-text-muted hover:text-error"
                title={tSession('deleteConfirm')}
                onClick={handleDeleteClick}
                aria-label={tSession('deleteConfirm')}
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
