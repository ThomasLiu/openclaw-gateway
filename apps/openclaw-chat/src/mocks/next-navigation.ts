// ============================================================
// OpenClaw Chat - Next.js Navigation Mock
// 用于测试环境的 next/navigation 模块 mock
// ============================================================

import { vi } from 'vitest'

/**
 * 创建自定义的 useRouter mock
 * @param options 自定义路由选项
 * @returns 路由对象
 */
export function createMockRouter(options?: {
  pathname?: string
  query?: Record<string, string>
  asPath?: string
}) {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: options?.pathname ?? '/',
    query: options?.query ?? {},
    asPath: options?.asPath ?? '/',
    route: '/',
  }
}

/**
 * 创建自定义的 usePathname mock
 * @param pathname 路径名
 * @returns 返回路径名的 hook 函数
 */
export function createMockUsePathname(pathname = '/') {
  return () => pathname
}

/**
 * 创建自定义的 useSearchParams mock
 * @param params 搜索参数
 * @returns 返回 URLSearchParams 的 hook 函数
 */
export function createMockUseSearchParams(params?: Record<string, string>) {
  return () => new URLSearchParams(params)
}
