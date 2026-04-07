// ============================================================
// OpenClaw Chat - SessionList 组件
// Session 列表组件，管理所有会话的显示和交互
// ============================================================

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useTranslations } from 'next-intl'
import { Plus, Search, Loader2 } from "lucide-react";
import SessionCard from "./SessionCard";
import { useIDEStore } from "@/store";
import type { SessionMetadata } from "@/types";

/** SessionList 组件属性 */
interface SessionListProps {
  /** Session 列表数据 */
  sessions?: SessionMetadata[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 自定义选择回调（可选，默认使用 store） */
  onSessionSelect?: (sessionId: string) => void;
  /** 新建会话回调 */
  onNewSession?: () => void;
  /** 删除会话回调 */
  onDeleteSession?: (sessionId: string) => void;
}

/**
 * SessionList 组件
 * 显示和管理会话列表，支持搜索、选中、删除等操作
 */
export default function SessionList({
  sessions = [],
  isLoading = false,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}: SessionListProps) {
  const t = useTranslations('session')
  const tCommon = useTranslations('common')
  
  // 从 store 获取状态
  const selectedSessionId = useIDEStore((state) => state.selection.sessionId)
  const selectSession = useIDEStore((state) => state.selectSession)

  // 本地状态：搜索关键词
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * 处理 Session 选择
   */
  const handleSelectSession = useCallback((sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId)
    } else {
      selectSession(sessionId)
    }
  }, [onSessionSelect, selectSession])

  /**
   * 处理新建会话
   */
  const handleNewSession = useCallback(() => {
    onNewSession?.()
  }, [onNewSession])

  /**
   * 处理删除会话
   */
  const handleDeleteSession = useCallback((sessionId: string) => {
    onDeleteSession?.(sessionId)
  }, [onDeleteSession])

  // 过滤 Session 列表
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sessions
    }
    
    const query = searchQuery.toLowerCase()
    return sessions.filter(session => {
      const id = session.id.toLowerCase()
      return id.includes(query)
    })
  }, [sessions, searchQuery])

  return (
    <div className="flex flex-col h-full" data-testid="session-list">
      {/* Header */}
      <div 
        className="flex-shrink-0 border-b border-border-primary p-3"
        data-testid="session-list-header"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 
            className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            data-testid="session-list-title"
          >
            {t('title')}
          </h3>
          <button
            data-testid="session-add-btn"
            className="p-1 hover:bg-bg-hover rounded transition-colors"
            title={tCommon('add') || '新建会话'}
            onClick={handleNewSession}
            aria-label={tCommon('add') || '新建会话'}
          >
            <Plus size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={tCommon('search') || '搜索...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-input border border-border-primary rounded focus:border-accent-primary outline-none transition-colors"
          />
        </div>
      </div>

      {/* Session List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1" data-testid="session-items">
        {/* Loading State */}
        {isLoading && (
          <div 
            className="flex items-center justify-center py-8 text-text-muted"
            data-testid="session-loading"
          >
            <Loader2 size={16} className="animate-spin mr-2" />
            <span className="text-xs">{tCommon('loading')}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSessions.length === 0 && (
          <div 
            className="flex flex-col items-center justify-center py-8 text-text-muted"
            data-testid="session-empty"
          >
            <MessageSquare size={24} className="mb-2 opacity-50" />
            <span className="text-xs">{t('noSession')}</span>
          </div>
        )}

        {/* Session Cards */}
        {!isLoading && filteredSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isSelected={session.id === selectedSessionId}
            onSelect={() => handleSelectSession(session.id)}
            onDelete={() => handleDeleteSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Import MessageSquare icon for empty state
import { MessageSquare } from "lucide-react";
