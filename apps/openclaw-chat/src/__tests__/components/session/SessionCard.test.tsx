// ============================================================
// OpenClaw Chat - SessionCard 组件测试
// TDD 绿阶段：测试真实 SessionCard 组件行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import SessionCard from '@/components/session/SessionCard'
import { useIDEStore } from '@/store'
import type { SessionMetadata } from '@/types'

describe('SessionCard', () => {
  const mockSession: SessionMetadata = {
    id: 'session-1',
    agentId: 'agent-1',
    filePath: '/sessions/agent-1/session-1.json',
    startTime: Date.now() - 7200000,
    endTime: Date.now() - 3600000,
    messageCount: 10,
    size: 2048,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('should render session card with data-testid', () => {
      render(<SessionCard session={mockSession} />)
      
      expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument()
    })

    it('should display relative time for startTime', () => {
      render(<SessionCard session={mockSession} />)
      
      // 验证时间显示（2小时前左右）
      const card = screen.getByTestId('session-card-session-1')
      expect(card.textContent).toMatch(/小时前|分钟前/)
    })
  })

  describe('双行卡片渲染', () => {
    it('should show user message with prefix', () => {
      render(<SessionCard 
        session={mockSession} 
        lastUserMessage="Hello, how are you?" 
      />)
      
      expect(screen.getByText(/用户:/)).toBeInTheDocument()
      expect(screen.getByText(/Hello, how are you/)).toBeInTheDocument()
    })

    it('should show assistant reply with prefix', () => {
      render(<SessionCard 
        session={mockSession} 
        lastAssistantMessage="I'm doing well!" 
      />)
      
      expect(screen.getByText(/助手:/)).toBeInTheDocument()
      expect(screen.getByText(/I'm doing well/)).toBeInTheDocument()
    })

    it('should show placeholder when no messages provided', () => {
      render(<SessionCard session={mockSession} />)
      
      // 应该显示占位符 "--"
      expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2)
    })

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(50)
      render(<SessionCard 
        session={mockSession} 
        lastUserMessage={longMessage} 
      />)
      
      // 长消息应该被截断
      const textContent = screen.getByTestId('session-card-session-1').textContent || ''
      // 验证消息被截断（不超过 30 + "..." 字符）
      expect(textContent).toContain('...')
    })
  })

  describe('选中状态', () => {
    it('should apply selected styles when isSelected is true', () => {
      const { container } = render(<SessionCard session={mockSession} isSelected={true} />)
      
      const card = container.querySelector('[data-testid="session-card-session-1"]')
      expect(card).toHaveClass('bg-bg-active')
    })

    it('should not apply selected styles when not selected', () => {
      const { container } = render(<SessionCard session={mockSession} isSelected={false} />)
      
      const card = container.querySelector('[data-testid="session-card-session-1"]')
      expect(card).not.toHaveClass('bg-bg-active')
    })

    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn()
      render(<SessionCard session={mockSession} onSelect={onSelect} />)
      
      fireEvent.click(screen.getByTestId('session-card-session-1'))
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('工作中状态', () => {
    it('should show working indicator when isWorking is true', () => {
      const { container } = render(<SessionCard session={mockSession} isWorking={true} />)
      
      const card = container.querySelector('[data-testid="session-card-session-1"]')
      expect(card).toHaveClass('working')
    })

    it('should show pulse animation on icon when working', () => {
      render(<SessionCard session={mockSession} isWorking={true} />)
      
      const card = screen.getByTestId('session-card-session-1')
      // 工作中应该有动画元素
      expect(card.innerHTML).toContain('animate-pulse')
    })
  })

  describe('未读徽标', () => {
    it('should show unread count when > 0', () => {
      render(<SessionCard session={mockSession} unreadCount={5} />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should show 99+ for large counts', () => {
      render(<SessionCard session={mockSession} unreadCount={150} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should not show badge when count is 0', () => {
      render(<SessionCard session={mockSession} unreadCount={0} />)
      
      expect(screen.queryByText('99+')).not.toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('删除功能', () => {
    it('should show delete button when onDelete is provided', () => {
      render(<SessionCard session={mockSession} onDelete={() => {}} />)
      
      expect(screen.getByTestId('session-delete')).toBeInTheDocument()
    })

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn()
      render(<SessionCard session={mockSession} onDelete={onDelete} />)
      
      fireEvent.click(screen.getByTestId('session-delete'))
      
      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should not trigger onSelect when delete button clicked', () => {
      const onSelect = vi.fn()
      const onDelete = vi.fn()
      render(<SessionCard 
        session={mockSession} 
        onSelect={onSelect} 
        onDelete={onDelete} 
      />)
      
      fireEvent.click(screen.getByTestId('session-delete'))
      
      expect(onSelect).not.toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('i18n 国际化', () => {
    it('should use i18n for user message prefix', () => {
      render(<SessionCard session={mockSession} lastUserMessage="test" />)
      
      expect(screen.getByText(/用户:/)).toBeInTheDocument()
    })

    it('should use i18n for assistant reply prefix', () => {
      render(<SessionCard session={mockSession} lastAssistantMessage="test" />)
      
      expect(screen.getByText(/助手:/)).toBeInTheDocument()
    })

    it('should use i18n for delete button title', () => {
      render(<SessionCard session={mockSession} onDelete={() => {}} />)
      
      const deleteBtn = screen.getByTestId('session-delete')
      expect(deleteBtn).toHaveAttribute('title')
    })
  })

  describe('键盘交互', () => {
    it('should be keyboard focusable', () => {
      render(<SessionCard session={mockSession} />)
      
      const card = screen.getByTestId('session-card-session-1')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should trigger onSelect when Enter key pressed', () => {
      const onSelect = vi.fn()
      render(<SessionCard session={mockSession} onSelect={onSelect} />)
      
      const card = screen.getByTestId('session-card-session-1')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    it('should trigger onSelect when Space key pressed', () => {
      const onSelect = vi.fn()
      render(<SessionCard session={mockSession} onSelect={onSelect} />)
      
      const card = screen.getByTestId('session-card-session-1')
      fireEvent.keyDown(card, { key: ' ' })
      
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
  })
})
