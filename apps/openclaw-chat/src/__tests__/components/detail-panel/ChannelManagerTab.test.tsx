// ============================================================
// OpenClaw Chat - ChannelManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { ChannelManagerTab } from '@/components/detail-panel/ChannelManagerTab'

describe('ChannelManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<ChannelManagerTab />)
    expect(container.querySelector('.channel-manager-tab')).toBeInTheDocument()
  })

  it('应该显示渠道列表区域', () => {
    const { container } = render(<ChannelManagerTab />)
    expect(container.querySelector('.channel-manager-tab')).toBeTruthy()
  })
})
