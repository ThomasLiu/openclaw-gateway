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
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border-primary rounded-lg hover:border-accent-primary transition-colors text-sm min-w-[140px]"
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
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning flex items-center gap-1">
          <AlertTriangle size={12} />
          {t('modelNotAvailable')}
        </div>
      )}

      {/* 下拉菜单 */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full bg-bg-secondary border border-border-primary rounded-lg shadow-lg max-h-64 overflow-y-auto z-50"
        >
          {/* 默认选项 */}
          <li role="option" aria-selected={!selectedModel}>
            <button
              onClick={() => handleSelect(defaultModelId || '')}
              className={`w-full px-3 py-2 text-left hover:bg-bg-hover transition-colors text-sm ${
                !selectedModel ? 'bg-bg-hover text-accent-primary' : ''
              }`}
            >
              {t('defaultModel')}
            </button>
          </li>

          {/* 分隔线 */}
          <li className="border-t border-border-primary my-1" />

          {/* 模型列表 */}
          {models.map((model) => (
            <li key={model.id} role="option" aria-selected={selectedModel === model.id}>
              <button
                onClick={() => handleSelect(model.id)}
                className={`w-full px-3 py-2 text-left hover:bg-bg-hover transition-colors text-sm ${
                  selectedModel === model.id ? 'bg-bg-hover text-accent-primary font-medium' : ''
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
