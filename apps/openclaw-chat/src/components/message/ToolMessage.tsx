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
    <div className="border border-border-primary rounded-lg overflow-hidden bg-bg-secondary my-2">
      {/* 标题栏 */}
      <button
        data-testid="tool-message-toggle"
        onClick={toggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-hover transition-colors text-left"
      >
        {/* 展开/折叠图标 */}
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
        )}

        {/* 工具名称 */}
        <span className="font-medium text-sm text-accent-primary">{toolName}</span>

        {/* 错误标识 */}
        {isError && (
          <AlertCircle size={14} className="text-error flex-shrink-0" />
        )}
      </button>

      {/* 内容区域 */}
      {isExpanded && (
        <div data-testid="tool-content" className="p-3 space-y-3">
          {/* 输入参数 */}
          <div>
            <div className="text-xs font-medium text-text-secondary mb-1.5">
              {t('inputParams')}
            </div>
            <pre
              data-testid="tool-input-params"
              className="bg-bg-tertiary p-2.5 rounded text-xs overflow-x-auto font-mono text-text-primary max-h-48 overflow-y-auto"
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
                className="p-1 hover:bg-bg-hover rounded transition-colors text-text-muted hover:text-text-primary"
                title={t('copy')}
              >
                <Copy size={12} />
              </button>
            </div>

            {isError ? (
              <div
                data-testid="tool-error"
                className="bg-error/10 border border-error/20 p-2.5 rounded text-xs text-error font-mono max-h-48 overflow-y-auto"
              >
                {typeof outputResult === 'string' ? outputResult : formatJson(outputResult)}
              </div>
            ) : (
              <pre
                data-testid="tool-output-result"
                className="bg-bg-tertiary p-2.5 rounded text-xs overflow-x-auto font-mono text-text-primary max-h-48 overflow-y-auto"
              >
                {formatJson(outputResult)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 已复制提示 */}
      {copied && (
        <div className="absolute top-2 right-8 bg-accent-primary text-white text-xs px-2 py-1 rounded shadow-md z-10">
          {t('copied')}
        </div>
      )}
    </div>
  )
}
