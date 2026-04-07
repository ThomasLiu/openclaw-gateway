// ============================================================
// OpenClaw Chat - AssistantMessage Component Tests
// TDD 红阶段：测试助手消息组件的所有关键行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import AssistantMessage from '@/components/message/AssistantMessage'
import type { SessionMessage } from '@/types'

describe('AssistantMessage', () => {
  const baseMessage: SessionMessage = {
    role: 'assistant',
    content: 'This is an assistant response with **markdown** support.',
    timestamp: Date.now() - 120000, // 2 minutes ago
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染助手消息气泡', () => {
    it('should render assistant message with correct styling', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      const messageContainer = screen.getByTestId('assistant-message')
      expect(messageContainer).toBeInTheDocument()
      expect(messageContainer).toHaveClass('justify-start') // 助手消息靠左对齐
    })

    it('should display message content', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      expect(screen.getByText(/This is an assistant response/)).toBeInTheDocument()
    })
  })

  describe('Markdown 渲染', () => {
    it('should render code blocks correctly', () => {
      const codeMessage: SessionMessage = {
        ...baseMessage,
        // 使用带语言标识的代码块，确保 react-markdown 传递 language-* className
        content: '```javascript\nconsole.log("Hello");\n```',
      }

      render(<AssistantMessage message={codeMessage} />)
      
      // 检查代码块是否存在（带 language- className 的才会渲染为代码块）
      const codeBlock = screen.getByTestId('code-block')
      expect(codeBlock).toBeInTheDocument()
    })

    it('should render tables correctly', () => {
      const tableMessage: SessionMessage = {
        ...baseMessage,
        content: '| Header | Value |\n| ------ | ----- |\n| Cell   | Data  |',
      }

      render(<AssistantMessage message={tableMessage} />)
      
      // 检查表格是否存在
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('should render lists correctly', () => {
      const listMessage: SessionMessage = {
        ...baseMessage,
        content: '- Item 1\n- Item 2\n- Item 3',
      }

      render(<AssistantMessage message={listMessage} />)
      
      // 检查列表项
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('should render inline code correctly', () => {
      const inlineCodeMessage: SessionMessage = {
        ...baseMessage,
        content: 'Use `const` for constants',
      }

      render(<AssistantMessage message={inlineCodeMessage} />)
      
      // 检查行内代码元素
      const codeElement = screen.getByText('const')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement.tagName.toLowerCase()).toBe('code')
    })
  })

  describe('代码块复制按钮', () => {
    it('should show copy button on code blocks', () => {
      // 使用带语言标识的代码块，确保触发 code-block 渲染路径（含 language- className）
      const codeMessage: SessionMessage = {
        ...baseMessage,
        content: '```javascript\nconst x = 1;\n```',
      }

      render(<AssistantMessage message={codeMessage} />)
      
      const copyButton = screen.getByTestId('code-copy-button')
      expect(copyButton).toBeInTheDocument()
    })

    it('should copy code to clipboard when clicked', async () => {
      const codeMessage: SessionMessage = {
        ...baseMessage,
        content: '```typescript\nconst x = 1;\n```',
      }

      render(<AssistantMessage message={codeMessage} />)
      
      const copyButton = screen.getByTestId('code-copy-button')
      fireEvent.click(copyButton)
      
      // clipboard.writeText 应该被调用（在 vitest.setup.ts 中已全局 mock）
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  describe('Tool Call 展示', () => {
    it('should render tool call blocks when present', () => {
      const toolCallMessage: SessionMessage = {
        ...baseMessage,
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"city": "Beijing"}',
            },
          },
        ],
      }

      render(<AssistantMessage message={toolCallMessage} />)
      
      const toolCallBlock = screen.getByTestId('tool-call-block')
      expect(toolCallBlock).toBeInTheDocument()
      expect(screen.getByText('get_weather')).toBeInTheDocument()
    })

    it('should be collapsible', () => {
      const toolCallMessage: SessionMessage = {
        ...baseMessage,
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{}',
            },
          },
        ],
      }

      render(<AssistantMessage message={toolCallMessage} />)
      
      const toggleButton = screen.getByTestId('tool-call-toggle')
      fireEvent.click(toggleButton)
      
      // 检查折叠/展开状态变化（不应抛出错误）
      expect(toggleButton).toBeInTheDocument()
    })
  })

  describe('Reasoning/Thinking 块', () => {
    it('should render thinking block when content contains thinking type', () => {
      const thinkingMessage: SessionMessage = {
        ...baseMessage,
        content: [
          { type: 'thinking', thinking: 'Let me think about this...' },
          { type: 'text', text: 'Here is my answer' },
        ],
      }

      render(<AssistantMessage message={thinkingMessage} />)
      
      const thinkingBlock = screen.getByTestId('thinking-block')
      expect(thinkingBlock).toBeInTheDocument()
    })

    it('should be collapsible', () => {
      const thinkingMessage: SessionMessage = {
        ...baseMessage,
        content: [
          { type: 'thinking', thinking: 'Thinking process...' },
          { type: 'text', text: 'Answer' },
        ],
      }

      render(<AssistantMessage message={thinkingMessage} />)
      
      const toggleButton = screen.getByTestId('thinking-toggle')
      expect(toggleButton).toBeInTheDocument()
      fireEvent.click(toggleButton) // 应该不抛出错误
    })
  })

  describe('流式输出动画', () => {
    it('should show typing indicator when isStreaming is true', () => {
      render(<AssistantMessage message={baseMessage} isStreaming={true} />)
      
      const streamingIndicator = screen.getByTestId('streaming-indicator')
      expect(streamingIndicator).toBeInTheDocument()
    })

    it('should not show typing indicator when isStreaming is false', () => {
      render(<AssistantMessage message={baseMessage} isStreaming={false} />)
      
      expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument()
    })
  })

  describe('操作工具栏', () => {
    it('should display action buttons (copy, delete, quote, speak)', () => {
      render(
        <AssistantMessage 
          message={baseMessage} 
          onQuote={() => {}}
          onDelete={() => {}}
        />
      )
      
      // 检查工具栏存在
      const toolbar = screen.getByTestId('message-toolbar')
      expect(toolbar).toBeInTheDocument()
    })
  })

  describe('朗读功能', () => {
    it('should call SpeechSynthesis.speak when speak button clicked', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      const speakButton = screen.getByTestId('speak-button')
      fireEvent.click(speakButton)
      
      expect(window.speechSynthesis.speak).toHaveBeenCalled()
    })

    it('should call SpeechSynthesis.cancel when stop speaking button clicked', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      // 先点击朗读按钮使 isSpeaking 状态变为 true（组件使用内部 state 管理）
      const speakButton = screen.getByTestId('speak-button')
      fireEvent.click(speakButton)
      
      // isSpeaking 变 true 后，停止朗读按钮应该出现
      const stopSpeakButton = screen.getByTestId('stop-speak-button')
      expect(stopSpeakButton).toBeInTheDocument()
      
      fireEvent.click(stopSpeakButton)
      
      expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    })
  })

  describe('时间戳显示', () => {
    it('should display formatted timestamp', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      const timestamp = screen.getByTestId('message-timestamp')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp.textContent).toBeTruthy()
    })
  })

  describe('i18n 支持', () => {
    it('should use i18n for all text labels', () => {
      render(<AssistantMessage message={baseMessage} />)
      
      // 检查各种 i18n 文案是否正确显示（通过 title 属性）
      expect(screen.getByTitle(/复制/i)).toBeInTheDocument()
      expect(screen.getByTitle(/朗读/i)).toBeInTheDocument()
    })
  })
})
