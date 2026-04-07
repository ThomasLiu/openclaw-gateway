import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import zhCNMessages from './messages/zh-CN.json'
import enMessages from './messages/en.json'

const messages: Record<string, any> = {
  'zh-CN': zhCNMessages,
  'en': enMessages,
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: messages[locale],
  }
})
