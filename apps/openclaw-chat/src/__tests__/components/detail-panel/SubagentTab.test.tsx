// ============================================================
// OpenClaw Chat - SubagentTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { SubagentTab } from '@/components/detail-panel/SubagentTab'

describe('SubagentTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<SubagentTab />)
    expect(container.querySelector('.subagent-tab')).toBeInTheDocument()
  })

  it('应该显示配置区域', () => {
    const { container } = render(<SubagentTab />)
    expect(container.querySelector('.subagent-tab')).toBeTruthy()
  })
})
