// ============================================================
// OpenClaw Chat - AgentList 组件
// Agent 列表组件，管理所有 Agent 的显示和交互
// ============================================================

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from 'next-intl'
import { Plus, Search, Loader2 } from "lucide-react";
import AgentCard from "./AgentCard";
import { useIDEStore } from "@/store";
import type { AgentMetadata } from "@/types";

/** AgentList 组件属性 */
interface AgentListProps {
  /** Agent 列表数据 */
  agents?: AgentMetadata[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 自定义选择回调（可选，默认使用 store） */
  onAgentSelect?: (agentId: string) => void;
  /** 添加 Agent 回调 */
  onAddAgent?: () => void;
  /** 删除 Agent 回调 */
  onDeleteAgent?: (agentId: string) => void;
  /** 导出 Agent 配置回调 */
  onExportAgent?: (agentId: string) => void;
}

/**
 * AgentList 组件
 * 显示和管理 Agent 列表，支持搜索、选中、删除等操作
 */
export default function AgentList({
  agents = [],
  isLoading = false,
  onAgentSelect,
  onAddAgent,
  onDeleteAgent,
  onExportAgent,
}: AgentListProps) {
  const t = useTranslations('agent')
  const tCommon = useTranslations('common')
  
  // 从 store 获取状态
  const selectedAgentId = useIDEStore((state) => state.selection.agentId)
  const selectAgent = useIDEStore((state) => state.selectAgent)

  // 本地状态：搜索关键词
  const [searchQuery, setSearchQuery] = useState('')
  
  // 本地状态：工作中的 agent ID 集合
  const [workingAgents, setWorkingAgents] = useState<Set<string>>(new Set())

  /**
   * 处理 Agent 选择
   */
  const handleSelectAgent = useCallback((agentId: string) => {
    if (onAgentSelect) {
      onAgentSelect(agentId)
    } else {
      selectAgent(agentId)
    }
  }, [onAgentSelect, selectAgent])

  /**
   * 处理添加 Agent
   */
  const handleAddAgent = useCallback(() => {
    onAddAgent?.()
  }, [onAddAgent])

  /**
   * 处理删除 Agent
   * @param agentId 要删除的 Agent ID
   */
  const handleDeleteAgent = useCallback((agentId: string) => {
    // 可以在这里添加确认对话框逻辑
    onDeleteAgent?.(agentId)
  }, [onDeleteAgent])

  /**
   * 处理导出 Agent 配置
   * @param agentId 要导出的 Agent ID
   */
  const handleExportAgent = useCallback((agentId: string) => {
    onExportAgent?.(agentId)
  }, [onExportAgent])

  // 过滤 Agent 列表
  const filteredAgents = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return agents
    }
    
    const query = searchQuery.toLowerCase()
    return agents.filter(agent => {
      const name = agent.config?.name?.toLowerCase() || ''
      const id = agent.id.toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }, [agents, searchQuery])

  return (
    <div className="flex flex-col h-full" data-testid="agent-list">
      {/* Header */}
      <div 
        className="flex-shrink-0 border-b border-border-primary p-3"
        data-testid="agent-list-header"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 
            className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            data-testid="agent-list-title"
          >
            {t('title')}
          </h3>
          <button
            data-testid="agent-add-btn"
            className="p-1 hover:bg-bg-hover rounded transition-colors"
            title={t('addAgent')}
            onClick={handleAddAgent}
            aria-label={t('addAgent')}
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

      {/* Agent List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1" data-testid="agent-items">
        {/* Loading State */}
        {isLoading && (
          <div 
            className="flex items-center justify-center py-8 text-text-muted"
            data-testid="agent-loading"
          >
            <Loader2 size={16} className="animate-spin mr-2" />
            <span className="text-xs">{tCommon('loading')}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAgents.length === 0 && (
          <div 
            className="flex flex-col items-center justify-center py-8 text-text-muted"
            data-testid="agent-empty"
          >
            <Bot size={24} className="mb-2 opacity-50" />
            <span className="text-xs">{t('noAgent')}</span>
          </div>
        )}

        {/* Agent Cards */}
        {!isLoading && filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            isWorking={workingAgents.has(agent.id)}
            onSelect={() => handleSelectAgent(agent.id)}
            onDelete={() => handleDeleteAgent(agent.id)}
            onExport={() => handleExportAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Import Bot icon for empty state
import { Bot } from "lucide-react";
