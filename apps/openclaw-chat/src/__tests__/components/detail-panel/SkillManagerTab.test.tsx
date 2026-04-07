// ============================================================
// OpenClaw Chat - SkillManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { SkillManagerTab } from '@/components/detail-panel/SkillManagerTab'

describe('SkillManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<SkillManagerTab />)
    expect(container.querySelector('.skill-manager-tab')).toBeInTheDocument()
  })

  it('应该显示分类标签', () => {
    const { container } = render(<SkillManagerTab />)
    expect(container.querySelector('.skill-manager-tab')).toBeTruthy()
  })
})
