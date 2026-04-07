// ============================================================
// OpenClaw Chat - WorkspaceBrowserTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { WorkspaceBrowserTab } from '@/components/detail-panel/WorkspaceBrowserTab'

describe('WorkspaceBrowserTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<WorkspaceBrowserTab />)
    expect(container.querySelector('.workspace-browser-tab')).toBeInTheDocument()
  })

  it('应该显示文件浏览器区域', () => {
    const { container } = render(<WorkspaceBrowserTab />)
    expect(container.querySelector('.workspace-browser-tab')).toBeTruthy()
  })
})
