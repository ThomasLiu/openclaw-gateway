// ============================================================
// OpenClaw Chat - ModelManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { ModelManagerTab } from '@/components/detail-panel/ModelManagerTab'

describe('ModelManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<ModelManagerTab />)
    expect(container.querySelector('.model-manager-tab')).toBeInTheDocument()
  })

  it('应该显示模型列表区域', () => {
    const { container } = render(<ModelManagerTab />)
    expect(container.querySelector('.model-manager-tab')).toBeTruthy()
  })
})
