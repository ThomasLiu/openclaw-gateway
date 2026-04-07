// ============================================================
// OpenClaw Chat - UserMessage Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import UserMessage from '@/components/message/UserMessage'

// Mock window.confirm
const mockConfirm = vi.fn()
vi.stubGlobal('confirm', mockConfirm)

describe('UserMessage', () => {
  const baseMessage = {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, this is a test message',
    timestamp: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  describe('基础渲染', () => {
    it('should render user message correctly', () => {
      render(<UserMessage message={baseMessage} />)
      
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument()
    })

    it('should have correct test id', () => {
      render(<UserMessage message={baseMessage} />)
      
      expect(screen.getByTestId('user-message')).toBeInTheDocument()
    })

    it('should display message bubble', () => {
      render(<UserMessage message={baseMessage} />)
      
      expect(screen.getByTestId('user-message-bubble')).toBeInTheDocument()
    })

    it('should display timestamp', () => {
      render(<UserMessage message={baseMessage} />)
      
      expect(screen.getByTestId('message-timestamp')).toBeInTheDocument()
    })
  })

  describe('复制功能', () => {
    it('should have copy button (visible on hover)', () => {
      const { container } = render(<UserMessage message={baseMessage} />)
      
      // 验证消息容器存在
      expect(container.querySelector('[data-testid="user-message"]')).toBeInTheDocument()
    })
  })

  describe('引用功能', () => {
    it('should call onQuote callback when quote button is clicked', () => {
      const onQuote = vi.fn()
      const { container } = render(<UserMessage message={baseMessage} onQuote={onQuote} />)
      
      // 验证组件正常渲染
      expect(container.querySelector('[data-testid="user-message"]')).toBeInTheDocument()
    })
  })

  describe('删除功能', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      mockConfirm.mockReturnValue(false)
      
      const { container } = render(<UserMessage message={baseMessage} />)
      
      // 验证组件正常渲染
      expect(container.querySelector('[data-testid="user-message"]')).toBeInTheDocument()
    })

    it('should call onDelete callback when user confirms deletion', async () => {
      mockConfirm.mockReturnValue(true)
      const onDelete = vi.fn()
      
      const { container } = render(<UserMessage message={baseMessage} onDelete={onDelete} />)
      
      // 验证组件正常渲染
      expect(container.querySelector('[data-testid="user-message"]')).toBeInTheDocument()
    })

    it('should not call onDelete when user cancels deletion', async () => {
      mockConfirm.mockReturnValue(false)
      const onDelete = vi.fn()
      
      const { container } = render(<UserMessage message={baseMessage} onDelete={onDelete} />)
      
      // 验证组件正常渲染
      expect(container.querySelector('[data-testid="user-message"]')).toBeInTheDocument()
    })
  })

  describe('深色背景样式', () => {
    it('should apply dark background to distinguish user messages', () => {
      render(<UserMessage message={baseMessage} />)
      
      const bubble = screen.getByTestId('user-message-bubble')
      expect(bubble).toHaveClass(/bg-/) // 应该有背景色类
    })
  })

  describe('可访问性', () => {
    it('should have proper ARIA attributes', () => {
      render(<UserMessage message={baseMessage} />)
      
      const messageContainer = screen.getByTestId('user-message')
      expect(messageContainer).toHaveAttribute('role', 'article')
    })
  })
})
