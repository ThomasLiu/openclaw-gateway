// ============================================================
// OpenClaw Chat - ToolMessage Component
// 展示工具调用信息，包括名称、输入参数、输出结果
// ============================================================

'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

interface ToolMessageProps {
  /** 工具名称 */
  toolName: string
  /** 输入参数 */
  inputParams: Record<string, unknown> | string
  /** 输出结果 */
  outputResult: unknown | string
  /** 是否为错误 */
  isError?: boolean
  /** 默认是否展开 */
  defaultExpanded?: boolean
}

/**
 * 工具消息组件
 * 
 * 特性：
 * - 展示工具名、输入参数 JSON、输出结果
 * - 可折叠展开
 * - 输出为错误时红色高亮
 * - 复制功能
 * - 所有文案使用 i18n
 */
export default function ToolMessage({
  toolName,
  inputParams,
  outputResult,
  isError = false,
  defaultExpanded = false,
}: ToolMessageProps) {
  const t = useTranslations('message')
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  // 格式化 JSON 数据
  const formatJson = (data: unknown): string => {
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatJson(outputResult))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [outputResult])

  // 切换展开/折叠
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <div className="relative my-3 overflow-hidden rounded-lg bg-bg-secondary">
      {/* 标题栏 */}
      <button
        data-testid="tool-message-toggle"
        onClick={toggleExpand}
        className="flex w-full items-center gap-2 bg-bg-secondary px-4 py-3 text-left transition-colors hover:bg-bg-hover"
      >
        {/* 展开/折叠图标 */}
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
        )}

        {/* 工具名称 */}
        <span className="text-sm font-medium text-accent-primary">{toolName}</span>

        {/* 错误标识 */}
        {isError && (
          <AlertCircle size={14} className="text-error flex-shrink-0" />
        )}
      </button>

      {/* 内容区域 */}
      {isExpanded && (
        <div data-testid="tool-content" className="space-y-3 p-4">
          {/* 输入参数 */}
          <div>
            <div className="text-xs font-medium text-text-secondary mb-1.5">
              {t('inputParams')}
            </div>
            <pre
              data-testid="tool-input-params"
              className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg bg-[#0d1117] p-3 font-mono text-xs text-text-primary"
            >
              {formatJson(inputParams)}
            </pre>
          </div>

          {/* 输出结果 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-xs font-medium ${isError ? 'text-error' : 'text-text-secondary'}`}>
                {t('outputResult')}
              </div>
              
              {/* 复制按钮 */}
              <button
                data-testid="tool-copy-button"
                onClick={handleCopy}
                className="rounded-md p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                title={t('copy')}
              >
                <Copy size={12} />
              </button>
            </div>

            {isError ? (
              <div
                data-testid="tool-error"
                className="max-h-48 overflow-y-auto rounded-lg bg-status-error/10 p-3 font-mono text-xs text-status-error"
              >
                {typeof outputResult === 'string' ? outputResult : formatJson(outputResult)}
              </div>
            ) : (
              <pre
                data-testid="tool-output-result"
                className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg bg-[#0d1117] p-3 font-mono text-xs text-text-primary"
              >
                {formatJson(outputResult)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 已复制提示 */}
      {copied && (
        <div className="absolute right-8 top-2 z-10 rounded-md bg-accent-primary px-2.5 py-1 text-xs text-white shadow-md">
          {t('copied')}
        </div>
      )}
    </div>
  )
}
