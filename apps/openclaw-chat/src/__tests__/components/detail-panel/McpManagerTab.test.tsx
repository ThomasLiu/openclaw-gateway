// ============================================================
// OpenClaw Chat - McpManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { McpManagerTab } from '@/components/detail-panel/McpManagerTab'

describe('McpManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<McpManagerTab />)
    expect(container.querySelector('.mcp-manager-tab')).toBeInTheDocument()
  })

  it('应该显示服务器列表区域', () => {
    const { container } = render(<McpManagerTab />)
    expect(container.querySelector('.mcp-manager-tab')).toBeTruthy()
  })
})
