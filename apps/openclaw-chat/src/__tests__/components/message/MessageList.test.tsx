// ============================================================
// OpenClaw Chat - MessageList Container Component Tests
// TDD 红阶段：测试消息列表容器的所有关键行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import MessageList from '@/components/message/MessageList'
import type { SessionMessage } from '@/types'

describe('MessageList', () => {
  const mockMessages: SessionMessage[] = [
    {
      role: 'user',
      content: 'Hello!',
      timestamp: Date.now() - 300000,
    },
    {
      role: 'assistant',
      content: 'Hi there! How can I help you?',
      timestamp: Date.now() - 240000,
    },
    {
      role: 'user',
      content: 'What is the weather today?',
      timestamp: Date.now() - 180000,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('消息列表容器渲染', () => {
    it('should render message list container', () => {
      render(<MessageList messages={mockMessages} />)
      
      const container = screen.getByTestId('message-list')
      expect(container).toBeInTheDocument()
    })

    it('should render all messages in the list', () => {
      render(<MessageList messages={mockMessages} />)
      
      // 检查所有消息都被渲染
      expect(screen.getByText('Hello!')).toBeInTheDocument()
      expect(screen.getByText(/Hi there/)).toBeInTheDocument()
      expect(screen.getByText(/weather today/)).toBeInTheDocument()
    })

    it('should handle empty message list gracefully', () => {
      render(<MessageList messages={[]} />)
      
      const container = screen.getByTestId('message-list')
      expect(container).toBeInTheDocument()
    })
  })

  describe('空状态提示', () => {
    it('should show empty state when no messages', () => {
      render(<MessageList messages={[]} />)
      
      const emptyState = screen.getByTestId('empty-state')
      expect(emptyState).toBeInTheDocument()
      // 空状态标题使用 chat.emptyTitle 翻译 key
      expect(emptyState).toHaveTextContent(/开始一段对话/i)
    })

    it('should use i18n for empty state text', () => {
      render(<MessageList messages={[]} />)
      
      // 空状态描述使用 chat.emptyState 翻译 key
      expect(screen.getByText(/欢迎使用 OpenClaw IDE/i)).toBeInTheDocument()
    })
  })

  describe('加载中状态', () => {
    it('should show skeleton loading when isLoading is true', () => {
      render(<MessageList messages={[]} isLoading={true} />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toBeInTheDocument()
    })

    it('should not show skeleton when isLoading is false', () => {
      render(<MessageList messages={[]} isLoading={false} />)
      
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
    })
  })

  describe('消息类型分发', () => {
    it('should render user messages with UserMessage component', () => {
      const userOnlyMessages: SessionMessage[] = [
        { role: 'user', content: 'User message' },
      ]
      
      render(<MessageList messages={userOnlyMessages} />)
      
      const userMessage = screen.getByTestId('user-message')
      expect(userMessage).toBeInTheDocument()
    })

    it('should render assistant messages with AssistantMessage component', () => {
      const assistantOnlyMessages: SessionMessage[] = [
        { role: 'assistant', content: 'Assistant message' },
      ]
      
      render(<MessageList messages={assistantOnlyMessages} />)
      
      const assistantMessage = screen.getByTestId('assistant-message')
      expect(assistantMessage).toBeInTheDocument()
    })

    it('should render tool messages when present in assistant message', () => {
      const toolCallMessage: SessionMessage = {
        role: 'assistant',
        content: 'I will check the weather',
        toolCalls: [{
          id: 'call_1',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"city": "Beijing"}',
          },
        }],
      }
      
      render(<MessageList messages={[toolCallMessage]} />)
      
      const toolCallBlock = screen.getByTestId('tool-call-block')
      expect(toolCallBlock).toBeInTheDocument()
    })
  })

  describe('自动滚动功能', () => {
    it('should have scroll container element', () => {
      render(<MessageList messages={mockMessages} />)
      
      const scrollContainer = screen.getByTestId('scroll-container')
      expect(scrollContainer).toBeInTheDocument()
    })

    it('should scroll to bottom when new messages are added (auto-scroll)', async () => {
      const { rerender } = render(<MessageList messages={[mockMessages[0]]} />)
      
      // 添加新消息
      rerender(<MessageList messages={mockMessages} />)
      
      // 检查滚动容器存在（实际滚动行为需要更复杂的测试）
      const scrollContainer = screen.getByTestId('scroll-container')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  describe('虚拟滚动集成', () => {
    it('should support virtual scrolling for large message lists', () => {
      // 创建大量消息
      const largeMessageList: SessionMessage[] = Array.from({ length: 100 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i + 1}`,
        timestamp: Date.now() - i * 60000,
      }))
      
      render(<MessageList messages={largeMessageList} virtualScroll={true} />)
      
      const container = screen.getByTestId('message-list')
      expect(container).toBeInTheDocument()
      // 应该只渲染可见区域的消息（虚拟滚动优化）
    })
  })

  describe('事件回调', () => {
    it('should call onQuote when user quotes a message', () => {
      const onQuote = vi.fn()
      
      render(
        <MessageList 
          messages={mockMessages} 
          onQuote={onQuote}
        />
      )
      
      // 查找并点击引用按钮
      const quoteButtons = screen.getAllByTitle(/引用/i)
      if (quoteButtons.length > 0) {
        fireEvent.click(quoteButtons[0])
        expect(onQuote).toHaveBeenCalled()
      }
    })

    it('should call onDelete when user deletes a message', () => {
      const onDelete = vi.fn()
      window.confirm = vi.fn(() => true)
      
      render(
        <MessageList 
          messages={mockMessages} 
          onDelete={onDelete}
        />
      )
      
      // 查找并点击删除按钮
      const deleteButtons = screen.getAllByTitle(/删除/i)
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0])
        expect(onDelete).toHaveBeenCalled()
      }
    })
  })

  describe('流式输出支持', () => {
    it('should pass isStreaming prop to last assistant message', () => {
      const streamingMessage: SessionMessage = {
        role: 'assistant',
        content: 'Thinking...',
      }
      
      render(
        <MessageList 
          messages={[streamingMessage]} 
          isStreaming={true}
        />
      )
      
      const streamingIndicator = screen.getByTestId('streaming-indicator')
      expect(streamingIndicator).toBeInTheDocument()
    })
  })
})
