// ============================================================
// OpenClaw Chat - i18n Locale Hook
// 提供语言切换功能，与 Zustand store 联动
// ============================================================

'use client'

import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl'
import { useIDEStore } from '@/store'
import type { PreferredLanguage } from '@/store'

/**
 * 语言切换 Hook
 * 
 * 提供当前 locale 信息和切换语言的函数，
 * 与 Zustand store 中的 preferredLanguage 保持同步
 * 
 * @example
 * const { locale, setLocale, t } = useLocale()
 * // locale: 当前 NextIntl locale ('zh-CN' | 'en')
 * // setLocale: 切换语言函数（更新 store 并触发页面导航）
 * // t: 翻译函数
 */
export function useLocale() {
  const locale = useNextIntlLocale()
  const preferredLanguage = useIDEStore((state) => state.input.preferredLanguage)
  const setPreferredLanguage = useIDEStore((state) => state.setPreferredLanguage)

  /**
   * 切换语言
   * @param language 目标语言
   */
  const switchLanguage = (language: PreferredLanguage) => {
    setPreferredLanguage(language)
    
    // 如果不是 auto 模式，需要通过路由切换实际 locale
    if (language !== 'auto' && language !== locale) {
      // 使用 next-intl 的路由切换
      // 注意：这里需要在客户端处理，可能需要使用 router 或 window.location
      const currentPath = window.location.pathname
      const newPath = currentPath.replace(`/${locale}`, `/${language}`)
      window.location.href = newPath
    }
  }

  return {
    /** 当前 NextIntl locale */
    locale,
    /** Zustand store 中的偏好语言设置 */
    preferredLanguage,
    /** 切换语言 */
    switchLanguage,
    /** 设置偏好语言（不立即切换） */
    setPreferredLanguage,
  }
}

/**
 * 带命名空间的翻译 Hook
 * 
 * @param namespace 翻译命名空间
 * @returns 翻译函数
 * 
 * @example
 * const t = useNamespace('topbar')
 * t('connected') // => '已连接' (zh-CN) or 'Connected' (en)
 */
export function useNamespace(namespace: string) {
  return useTranslations(namespace)
}

// 重新导出原始 hooks 以便直接使用
export { useLocale as useNextIntlLocale, useTranslations } from 'next-intl'
