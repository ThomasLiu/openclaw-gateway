// ============================================================
// OpenClaw Chat - ModelSelector Component Tests
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import ModelSelector from '@/components/input/ModelSelector'
import { MOCK_MODELS } from '@/mocks/slash-commands.mock'

describe('ModelSelector', () => {
  const defaultProps = {
    models: MOCK_MODELS,
    selectedModel: 'gpt-4',
    onModelChange: vi.fn(),
  }

  it('should render model selector dropdown', () => {
    render(<ModelSelector {...defaultProps} />)
    
    expect(screen.getByTestId('model-selector')).toBeInTheDocument()
  })

  it('should display available models in dropdown', () => {
    render(<ModelSelector {...defaultProps} />)
    
    // 点击打开下拉菜单
    const trigger = screen.getByTestId('model-selector-trigger')
    fireEvent.click(trigger)
    
    // 检查模型列表（使用 getAllByText 因为 GPT-4 同时出现在触发按钮和下拉列表中）
    MOCK_MODELS.forEach(model => {
      const elements = screen.getAllByText(model.name)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should show default model when no session override', () => {
    render(<ModelSelector {...defaultProps} selectedModel={undefined} />)
    
    // 应该显示默认模型文本
    expect(screen.getByText(/默认模型/i)).toBeInTheDocument()
  })

  it('should show degradation warning when selected model not available', () => {
    const unavailableModel = 'non-existent-model'
    
    render(
      <ModelSelector 
        {...defaultProps} 
        selectedModel={unavailableModel}
      />
    )
    
    // 应该显示不可用警告（匹配实际 i18n 文案）
    expect(screen.getByText(/所选模型不可用/i)).toBeInTheDocument()
  })

  it('should call onModelChange when selecting a model', () => {
    const onModelChange = vi.fn()
    
    render(<ModelSelector {...defaultProps} onModelChange={onModelChange} />)
    
    // 打开下拉菜单
    fireEvent.click(screen.getByTestId('model-selector-trigger'))
    
    // 选择一个模型
    const claudeOption = screen.getByText('Claude 3 Opus')
    fireEvent.click(claudeOption)
    
    expect(onModelChange).toHaveBeenCalledWith('claude-3-opus')
  })

  it('should use i18n for default model label', () => {
    render(<ModelSelector {...defaultProps} selectedModel={undefined} />)
    
    // 验证默认模型文案使用了 i18n 翻译
    expect(screen.getByText(/默认模型/i)).toBeInTheDocument()
  })
})
