// ============================================================
// OpenClaw Chat - i18n 路由配置
// 定义支持的语言和默认语言
// ============================================================

export const routing = {
  locales: ['zh-CN', 'en'] as const,
  defaultLocale: 'zh-CN' as const,
}

export type Locale = (typeof routing.locales)[number]
