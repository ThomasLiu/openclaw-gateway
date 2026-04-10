// ============================================================
// OpenClaw Chat - LanguageSelector Component
// 语言选择器，支持下拉选择、i18n 支持
// ============================================================

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Globe } from 'lucide-react'
import type { PreferredLanguage } from '@/store'

interface LanguageOption {
  code: PreferredLanguage
  labelKey: string
}

/** 支持的语言列表 */
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'auto', labelKey: 'auto' },
  { code: 'zh-CN', labelKey: 'zh-CN' },
  { code: 'zh-TW', labelKey: 'zh-TW' },
  { code: 'en', labelKey: 'en' },
  { code: 'ja', labelKey: 'ja' },
  { code: 'ko', labelKey: 'ko' },
]

interface LanguageSelectorProps {
  /** 当前选中的语言 */
  currentLanguage: PreferredLanguage
  /** 语言变更回调 */
  onLanguageChange: (language: PreferredLanguage) => void
}

/**
 * 语言选择器组件
 * 
 * 特性：
 * - 下拉展示语言选项（auto/zh-CN/zh-TW/en/ja/ko）
 * - 选择后更新 store preferredLanguage
 * - 当前选项高亮
 * - 文案 i18n ('language.*')
 */
export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const t = useTranslations('language')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // 处理语言选择
  const handleSelect = (code: PreferredLanguage) => {
    onLanguageChange(code)
    setIsOpen(false)
  }

  // 获取当前语言的显示文本
  const getCurrentLabel = (): string => {
    const option = LANGUAGE_OPTIONS.find(opt => opt.code === currentLanguage)
    return option ? t(option.labelKey) : currentLanguage
  }

  return (
    <div data-testid="language-selector" ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <button
        data-testid="language-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[136px] items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe size={14} className="text-text-muted flex-shrink-0" />
        
        <span className="truncate flex-1 text-left">
          {getCurrentLabel()}
        </span>
        
        <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-2.5 max-h-64 w-full overflow-y-auto rounded-lg border border-border-primary bg-bg-secondary p-1.5 shadow-lg"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <li key={option.code} role="option" aria-selected={currentLanguage === option.code}>
              <button
                onClick={() => handleSelect(option.code)}
                className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover ${
                  currentLanguage === option.code ? 'bg-[var(--accent-soft)] font-medium text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {t(option.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
