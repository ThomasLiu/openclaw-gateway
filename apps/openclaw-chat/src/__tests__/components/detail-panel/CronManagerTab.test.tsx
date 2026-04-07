// ============================================================
// OpenClaw Chat - CronManagerTab 组件测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils/render-with-providers'
import { CronManagerTab } from '@/components/detail-panel/CronManagerTab'

describe('CronManagerTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<CronManagerTab />)
    expect(container.querySelector('.cron-manager-tab')).toBeInTheDocument()
  })

  it('应该显示定时任务列表区域', () => {
    const { container } = render(<CronManagerTab />)
    expect(container.querySelector('.cron-manager-tab')).toBeTruthy()
  })
})
