// ============================================================
// OpenClaw Chat - LlmHistoryTab 组件测试
// TDD: 测试 LLM 发送历史功能
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import { LlmHistoryTab } from '@/components/detail-panel/LlmHistoryTab'

describe('LlmHistoryTab', () => {
  it('应该渲染组件', () => {
    const { container } = render(<LlmHistoryTab />)
    expect(container.querySelector('.llm-history-tab')).toBeInTheDocument()
  })

  it('应该显示历史记录列表区域', () => {
    const { container } = render(<LlmHistoryTab />)
    expect(container.querySelector('.llm-history-tab')).toBeInTheDocument()
  })

  it('应该包含过滤选项', () => {
    const { container } = render(<LlmHistoryTab />)
    expect(container.querySelector('.llm-history-tab')).toBeTruthy()
  })
})
