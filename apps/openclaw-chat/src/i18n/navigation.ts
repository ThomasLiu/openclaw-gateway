// ============================================================
// OpenClaw Chat - i18n 客户端配置
// 提供客户端使用的 useTranslations hook
// ============================================================

import { createSharedPathnamesNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation(routing.locales)
