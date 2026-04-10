// ============================================================
// OpenClaw Chat - ModelSelector Component
// 模型选择器，支持下拉选择、降级提示
// ============================================================

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, AlertTriangle } from 'lucide-react'

interface ModelInfo {
  id: string
  name: string
  provider?: string
}

interface ModelSelectorProps {
  /** 可用模型列表 */
  models: ModelInfo[]
  /** 当前选中的模型 */
  selectedModel?: string
  /** 默认模型 ID */
  defaultModelId?: string
  /** 模型变更回调 */
  onModelChange: (modelId: string) => void
}

/**
 * 模型选择器组件
 * 
 * 特性：
 * - 下拉展示可用模型列表
 * - 默认选中规则：session 最后使用 > agent 配置 > 全局默认
 * - 选中的模型不在可用清单时显示降级提示
 * - i18n 文案支持
 */
export default function ModelSelector({
  models,
  selectedModel,
  defaultModelId,
  onModelChange,
}: ModelSelectorProps) {
  const t = useTranslations('input')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 查找选中的模型信息
  const selectedModelInfo = models.find(m => m.id === selectedModel)
  
  // 检查选中模型是否在可用列表中
  const isModelAvailable = !selectedModel || models.some(m => m.id === selectedModel)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 处理模型选择
  const handleSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <div data-testid="model-selector" ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <button
        data-testid="model-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[152px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* 显示当前选中的模型或默认 */}
        <span className="truncate flex-1 text-left">
          {selectedModelInfo 
            ? selectedModelInfo.name 
            : t('defaultModel')}
        </span>
        
        <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 降级提示 */}
      {!isModelAvailable && (
        <div className="absolute left-0 right-0 top-full mt-2.5 flex items-center gap-1.5 rounded-lg border border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.1)] p-2.5 text-xs text-text-warning">
          <AlertTriangle size={12} />
          {t('modelNotAvailable')}
        </div>
      )}

      {/* 下拉菜单 */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2.5 max-h-64 w-full overflow-y-auto rounded-lg border border-border-primary bg-bg-secondary p-1.5 shadow-lg"
        >
          {/* 默认选项 */}
          <li role="option" aria-selected={!selectedModel}>
            <button
              onClick={() => handleSelect(defaultModelId || '')}
              className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover ${
                !selectedModel ? 'bg-[var(--accent-soft)] font-medium text-accent-primary' : 'text-text-secondary'
              }`}
            >
              {t('defaultModel')}
            </button>
          </li>

          {/* 分隔线 */}
          <li className="my-1 border-t border-border-primary" />

          {/* 模型列表 */}
          {models.map((model) => (
            <li key={model.id} role="option" aria-selected={selectedModel === model.id}>
              <button
                onClick={() => handleSelect(model.id)}
                className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover ${
                  selectedModel === model.id ? 'bg-[var(--accent-soft)] font-medium text-accent-primary' : 'text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{model.name}</span>
                  {model.provider && (
                    <span className="text-xs text-text-muted">{model.provider}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
