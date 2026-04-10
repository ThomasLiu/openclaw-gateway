// ============================================================
// OpenClaw Chat - next-intl Mock for Testing
// 提供测试环境下的 useTranslations 和其他 i18n 函数的 mock
// ============================================================

import { vi } from 'vitest'
import zhCN from '../../messages/zh-CN.json'

/**
 * Mock useTranslations hook
 * 返回一个函数，根据 key 获取翻译文本
 */
export const mockUseTranslations = vi.fn((namespace: string) => {
  const translations = ((zhCN as Record<string, Record<string, unknown>>)[namespace] || {}) as Record<string, unknown>
  
  return (key: string): string => {
    const keys = key.split('.')
    let value: unknown = translations
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key // 返回 key 作为 fallback
      }
    }
    
    return typeof value === 'string' ? value : key
  }
})

/**
 * Mock NextIntlClientProvider component
 */
export const MockNextIntlClientProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}
