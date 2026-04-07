// ============================================================
// OpenClaw Chat - AgentCard 组件测试
// TDD 绿阶段：测试真实组件行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import AgentCard from '@/components/agent/AgentCard'
import { useIDEStore } from '@/store'
import type { AgentMetadata } from '@/types'

describe('AgentCard', () => {
  const mockAgent: AgentMetadata = {
    id: 'agent-1',
    config: {
      id: 'agent-1',
      name: 'Test Agent',
      model: 'gpt-4',
    },
    hasAgentsMd: true,
    hasSoulMd: false,
    hasToolsMd: true,
    sessionCount: 5,
    lastSessionTime: Date.now() - 3600000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('should render agent name', () => {
      render(<AgentCard agent={mockAgent} />)
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
    })

    it('should render agent ID when name is not available', () => {
      const agentWithoutName: AgentMetadata = {
        id: 'agent-2',
        config: { id: 'agent-2' },
        hasAgentsMd: false,
        hasSoulMd: false,
        hasToolsMd: false,
        sessionCount: 0,
      }
      render(<AgentCard agent={agentWithoutName} />)
      
      expect(screen.getByText('agent-2')).toBeInTheDocument()
    })

    it('should render relative time for lastSessionTime', () => {
      render(<AgentCard agent={mockAgent} />)
      
      // 验证时间显示（1小时前左右）
      const timeElement = screen.getByText(/小时前|分钟前/)
      expect(timeElement).toBeInTheDocument()
    })
  })

  describe('选中状态', () => {
    it('should apply selected styles when isSelected is true', () => {
      const { container } = render(<AgentCard agent={mockAgent} isSelected={true} />)
      
      const card = container.querySelector('[data-testid="agent-card-agent-1"]')
      expect(card).toHaveClass('bg-bg-active')
    })

    it('should not apply selected styles when not selected', () => {
      const { container } = render(<AgentCard agent={mockAgent} isSelected={false} />)
      
      const card = container.querySelector('[data-testid="agent-card-agent-1"]')
      expect(card).not.toHaveClass('bg-bg-active')
    })

    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn()
      render(<AgentCard agent={mockAgent} onSelect={onSelect} />)
      
      fireEvent.click(screen.getByTestId(`agent-card-${mockAgent.id}`))
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('工作中状态', () => {
    it('should show working indicator when isWorking is true', () => {
      render(<AgentCard agent={mockAgent} isWorking={true} />)
      
      // 工作中状态应该显示动画和文字
      const card = screen.getByTestId(`agent-card-${mockAgent.id}`)
      expect(card).toHaveClass('working')
    })

    it('should not show working indicator when isWorking is false', () => {
      render(<AgentCard agent={mockAgent} isWorking={false} />)
      
      const card = screen.getByTestId(`agent-card-${mockAgent.id}`)
      expect(card).not.toHaveClass('working')
    })
  })

  describe('未读徽标', () => {
    it('should show unread count when > 0', () => {
      render(<AgentCard agent={mockAgent} unreadCount={5} />)
      
      // 未读徽标应该显示数字
      const badge = screen.getByText('5')
      expect(badge).toBeInTheDocument()
    })

    it('should not show unread badge when 0', () => {
      render(<AgentCard agent={mockAgent} unreadCount={0} />)
      
      // 不应该显示未读数字（但可能显示其他内容）
      expect(screen.queryByText('5')).not.toBeInTheDocument()
    })

    it('should show 99+ for large unread counts', () => {
      render(<AgentCard agent={mockAgent} unreadCount={150} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('最后消息', () => {
    it('should display last message when provided', () => {
      render(<AgentCard agent={mockAgent} lastMessage="Hello, this is a test" />)
      
      expect(screen.getByText('Hello, this is a test')).toBeInTheDocument()
    })

    it('should not show last message row when no last message and no unread', () => {
      render(<AgentCard agent={mockAgent} />)
      
      // 当没有最后消息和未读时，不显示第二行内容
      // 组件只在有 lastMessage 或 unreadCount > 0 时显示第二行
      expect(screen.queryByText(/最后消息/)).not.toBeInTheDocument()
    })
  })

  describe('删除功能', () => {
    it('should show delete button on hover (via data-testid)', () => {
      render(<AgentCard agent={mockAgent} onDelete={() => {}} />)
      
      // 删除按钮应该在 DOM 中
      expect(screen.getByTestId('agent-delete')).toBeInTheDocument()
    })

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn()
      render(<AgentCard agent={mockAgent} onDelete={onDelete} />)
      
      fireEvent.click(screen.getByTestId('agent-delete'))
      
      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should not trigger onSelect when delete button clicked', () => {
      const onSelect = vi.fn()
      const onDelete = vi.fn()
      render(<AgentCard agent={mockAgent} onSelect={onSelect} onDelete={onDelete} />)
      
      fireEvent.click(screen.getByTestId('agent-delete'))
      
      expect(onSelect).not.toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('导出功能', () => {
    it('should show export button', () => {
      render(<AgentCard agent={mockAgent} onExport={() => {}} />)
      
      expect(screen.getByTestId('agent-export')).toBeInTheDocument()
    })

    it('should call onExport when export button clicked', () => {
      const onExport = vi.fn()
      render(<AgentCard agent={mockAgent} onExport={onExport} />)
      
      fireEvent.click(screen.getByTestId('agent-export'))
      
      expect(onExport).toHaveBeenCalledTimes(1)
    })
  })

  describe('i18n 国际化', () => {
    it('should use i18n for working status text', () => {
      render(<AgentCard agent={mockAgent} isWorking={true} />)
      
      // 工作中文字应该存在
      expect(screen.getByText('工作中...')).toBeInTheDocument()
    })

    it('should use i18n for export button title', () => {
      render(<AgentCard agent={mockAgent} />)
      
      const exportBtn = screen.getByTestId('agent-export')
      expect(exportBtn).toHaveAttribute('title', '导出配置')
    })

    it('should have accessible labels on buttons', () => {
      render(<AgentCard agent={mockAgent} onDelete={() => {}} onExport={() => {}} />)
      
      // 验证无障碍标签
      expect(screen.getByTestId('agent-delete')).toHaveAttribute('aria-label')
      expect(screen.getByTestId('agent-export')).toHaveAttribute('aria-label')
    })
  })

  describe('键盘交互', () => {
    it('should be keyboard focusable', () => {
      render(<AgentCard agent={mockAgent} />)
      
      const card = screen.getByTestId(`agent-card-${mockAgent.id}`)
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should trigger onSelect when Enter key pressed', () => {
      const onSelect = vi.fn()
      render(<AgentCard agent={mockAgent} onSelect={onSelect} />)
      
      const card = screen.getByTestId(`agent-card-${mockAgent.id}`)
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    it('should trigger onSelect when Space key pressed', () => {
      const onSelect = vi.fn()
      render(<AgentCard agent={mockAgent} onSelect={onSelect} />)
      
      const card = screen.getByTestId(`agent-card-${mockAgent.id}`)
      fireEvent.keyDown(card, { key: ' ' })
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
  })
})
