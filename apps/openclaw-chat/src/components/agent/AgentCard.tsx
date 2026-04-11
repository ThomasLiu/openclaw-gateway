// ============================================================
// OpenClaw Chat - AgentCard 组件
// Agent 卡片组件，显示单个 Agent 的信息
// ============================================================

"use client";

import React from "react";
import { useTranslations } from 'next-intl'
import { Bot, Trash2, Download, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { AgentMetadata } from "@/types";

/** AgentCard 组件属性 */
interface AgentCardProps {
  /** Agent 元数据 */
  agent: AgentMetadata;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否工作中 */
  isWorking?: boolean;
  /** 未读消息数 */
  unreadCount?: number;
  /** 最后一条消息内容 */
  lastMessage?: string;
  /** 选择回调 */
  onSelect?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
  /** 导出回调 */
  onExport?: () => void;
}

/**
 * AgentCard 组件
 * 显示单个 Agent 的卡片信息，包括名称、状态、最后消息等
 */
export default function AgentCard({
  agent,
  isSelected = false,
  isWorking = false,
  unreadCount = 0,
  lastMessage,
  onSelect,
  onDelete,
  onExport,
}: AgentCardProps) {
  const t = useTranslations('agent')
  
  const agentName = agent.config?.name || agent.id
  const displayTime = agent.lastSessionTime 
    ? formatRelativeTime(agent.lastSessionTime)
    : null

  /**
   * 处理卡片点击事件
   */
  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮区域，不触发选择
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

  /**
   * 处理导出按钮点击
   */
  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onExport?.()
  }

  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      className={`
        group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
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
      <div className="flex-shrink-0 ml-[-2px]">
        <Bot 
          size={16} 
          className={`text-text-accent transition-colors ${
            isWorking ? 'animate-pulse text-status-warning' : ''
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name Row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-primary truncate font-medium">
            {agentName}
          </span>
          
          {/* Working Indicator or Time */}
          <span className="text-xs text-text-muted flex-shrink-0">
            {isWorking ? (
              <span className="inline-flex items-center gap-1 text-status-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {t('working')}
              </span>
            ) : displayTime ? (
              displayTime
            ) : null}
          </span>
        </div>

        {/* Last Message Preview */}
        {(lastMessage || unreadCount > 0) && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs text-text-muted truncate">
              {lastMessage || t('lastMessage')}
            </span>
            
            {/* Unread Badge */}
            {unreadCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-accent-primary text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons - Visible on Hover */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
        {/* Export Button */}
        <button
          data-testid="agent-export"
          className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-text-secondary"
          title={t('export')}
          onClick={handleExportClick}
          aria-label={t('export')}
        >
          <Download size={12} />
        </button>

        {/* Delete Button */}
        <button
          data-testid="agent-delete"
          className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-error"
          title={t('deleteConfirm', { name: agentName })}
          onClick={handleDeleteClick}
          aria-label={t('deleteConfirm', { name: agentName })}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
