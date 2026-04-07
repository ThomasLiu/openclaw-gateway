// ============================================================
// OpenClaw Chat - 测试工具函数
// 封装 RTL 的 render，自动包裹必要的 Providers
// ============================================================

import React, { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'

/**
 * 测试渲染选项
 */
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** 预填充的 store 初始状态（可选） */
  initialState?: Partial<import('@/store').IDEState>
}

/**
 * 创建测试用的 Provider 包装器
 * @param options 渲染选项
 * @returns Provider 组件
 */
function createTestProviders(_options?: RenderWithProvidersOptions) {
  // 注意：由于 Zustand store 不需要 Provider，这里可以简化
  // i18n 已在 vitest.setup.ts 中通过 vi.mock('next-intl') 全局配置
  
  return function TestProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
  }
}

/**
 * 增强版的 render 函数
 * 自动包裹测试所需的 Providers
 * 
 * @param ui 要渲染的 React 元素
 * @param options 渲染选项
 * @returns 渲染结果
 * 
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   initialState: {
 *     selection: { agentId: 'test-agent', sessionId: null },
 *   },
 * })
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderWithProvidersOptions
) {
  return render(ui, {
    ...options,
    wrapper: createTestProviders(options),
  })
}

// ==================== 重新导出常用方法 ====================

export { renderWithProviders as render }

// 从 @testing-library/react 导出所有内容
export * from '@testing-library/react'

// 从 @testing-library/user-event 导出用户事件模拟
export { userEvent } from '@testing-library/user-event'
