// ============================================================
// OpenClaw Chat - MemoryManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { MemoryManagerTab } from '@/components/detail-panel/MemoryManagerTab'

describe('MemoryManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<MemoryManagerTab />)
    expect(container.querySelector('.memory-manager-tab')).toBeInTheDocument()
  })

  it('应该显示记忆文件列表区域', () => {
    const { container } = render(<MemoryManagerTab />)
    expect(container.querySelector('.memory-manager-tab')).toBeTruthy()
  })
})
