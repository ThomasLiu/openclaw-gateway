// ============================================================
// OpenClaw Chat - MainContent Layout Component Tests
// TDD 红阶段：测试主区域组合布局
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils/render-with-providers'
import MainContent from '@/components/layout/MainContent'

describe('MainContent', () => {
  const defaultProps = {
    messages: [],
    isRunning: false,
    onSend: vi.fn(),
    onStop: vi.fn(),
    onQuote: vi.fn(),
    onDelete: vi.fn(),
  }

  it('should render main content layout correctly', () => {
    const { container } = render(<MainContent {...defaultProps} />)
    
    // 验证 main 元素正确渲染
    const main = container.querySelector('main')
    expect(main).toBeTruthy()
    expect(main).toHaveAttribute('data-testid', 'main-content')
  })

  it('should contain MessageList component', () => {
    const { container } = render(<MainContent {...defaultProps} />)
    
    // MessageList 通过 data-testid="message-list" 渲染
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
  })

  it('should contain ChatInput component', () => {
    render(<MainContent {...defaultProps} />)
    
    // ChatInput 包含 textarea 或输入区域
    expect(screen.getByTestId('chat-textarea')).toBeInTheDocument()
  })

  it('should contain ModelSelector component', () => {
    render(<MainContent {...defaultProps} models={[]} selectedModel={undefined} onModelChange={vi.fn()} />)
    
    // ModelSelector 应该被渲染
    expect(screen.getByTestId('model-selector')).toBeInTheDocument()
  })

  it('should contain LanguageSelector component', () => {
    render(<MainContent {...defaultProps} currentLanguage="auto" onLanguageChange={vi.fn()} />)
    
    // LanguageSelector 应该被渲染
    expect(screen.getByTestId('language-selector')).toBeInTheDocument()
  })

  it('should pass correct props to child components', () => {
    const mockMessages = [
      { role: 'user' as const, content: 'Test message' },
    ]
    
    render(
      <MainContent 
        {...defaultProps} 
        messages={mockMessages}
        isRunning={true}
        currentLanguage="zh-CN"
        models={[{ id: 'gpt-4', name: 'GPT-4' }]}
        selectedModel="gpt-4"
      />
    )
    
    // 组件应该正常渲染而不抛出错误
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
  })

  it('should have correct layout structure (flex column)', () => {
    const { container } = render(<MainContent {...defaultProps} />)
    
    const main = container.querySelector('main')
    expect(main).toBeTruthy()
    expect(main).toHaveClass('flex')
    expect(main).toHaveClass('flex-col')
  })
})
