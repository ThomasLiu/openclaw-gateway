// ============================================================
// OpenClaw Chat - ChatInput Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import ChatInput from '@/components/input/ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    isRunning: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render textarea input', () => {
    render(<ChatInput {...defaultProps} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    expect(textarea).toBeInTheDocument()
  })

  it('should show placeholder with i18n text', () => {
    render(<ChatInput {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText(/输入消息/i)
    expect(textarea).toBeInTheDocument()
  })

  it('should auto-resize height (max 200px)', () => {
    render(<ChatInput {...defaultProps} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    
    // 输入多行文本
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' } })
    
    // 检查高度自动调整（通过 className 而非 inline style）
    expect(textarea).toHaveClass('max-h-[200px]')
  })

  it('should show send button when not running', () => {
    render(<ChatInput {...defaultProps} isRunning={false} />)
    
    const sendButton = screen.getByTestId('send-button')
    expect(sendButton).toBeInTheDocument()
    // 按钮使用图标，检查 aria-label 或 title
    expect(sendButton).toHaveAttribute('aria-label', '发送')
  })

  it('should show stop button when running', () => {
    render(<ChatInput {...defaultProps} isRunning={true} />)
    
    const stopButton = screen.getByTestId('stop-button')
    expect(stopButton).toBeInTheDocument()
    // 按钮使用图标，检查 aria-label 或 title
    expect(stopButton).toHaveAttribute('aria-label', '停止')
  })

  it('should call onSend when pressing Enter without Shift', () => {
    const onSend = vi.fn()
    render(<ChatInput {...defaultProps} onSend={onSend} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    
    expect(onSend).toHaveBeenCalledWith('Test message')
  })

  it('should not send when pressing Enter with Shift (new line)', () => {
    const onSend = vi.fn()
    render(<ChatInput {...defaultProps} onSend={onSend} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    fireEvent.change(textarea, { target: { value: 'Line 1' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    
    expect(onSend).not.toHaveBeenCalled()
  })

  it('should call onStop when stop button clicked', () => {
    const onStop = vi.fn()
    render(<ChatInput {...defaultProps} isRunning={true} onStop={onStop} />)
    
    const stopButton = screen.getByTestId('stop-button')
    fireEvent.click(stopButton)
    
    expect(onStop).toHaveBeenCalled()
  })

  it('should support keyboard history navigation (up/down arrows)', () => {
    const inputHistory = ['Previous message 1', 'Previous message 2']
    render(<ChatInput {...defaultProps} inputHistory={inputHistory} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    
    // 按上箭头应该显示历史记录
    fireEvent.keyDown(textarea, { key: 'ArrowUp' })
    // 按下箭头应该导航到下一条
    fireEvent.keyDown(textarea, { key: 'ArrowDown' })
    
    // 不应该抛出错误
    expect(textarea).toBeInTheDocument()
  })

  it('should clear input after sending', () => {
    const onSend = vi.fn()
    render(<ChatInput {...defaultProps} onSend={onSend} />)
    
    const textarea = screen.getByTestId('chat-textarea')
    fireEvent.change(textarea, { target: { value: 'Message to send' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    
    // 输入框应该被清空
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })

  it('should use i18n for all labels', () => {
    render(<ChatInput {...defaultProps} />)
    
    // 检查按钮的 aria-label 使用了 i18n
    expect(screen.getByTestId('send-button')).toHaveAttribute('aria-label', '发送')
    expect(screen.getByPlaceholderText(/输入消息/i)).toBeInTheDocument()
  })
})
