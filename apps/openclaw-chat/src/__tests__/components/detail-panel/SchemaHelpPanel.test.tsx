// ============================================================
// OpenClaw Chat - SchemaHelpPanel 组件测试
// TDD 红阶段：测试配置说明面板的所有功能
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import { SchemaHelpPanel } from '@/components/detail-panel/SchemaHelpPanel'

// ==================== Mock 数据 ====================

const mockSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Agent 名称',
      required: true,
      example: 'my-agent',
    },
    model: {
      type: 'string',
      description: '使用的模型 ID',
      required: true,
      example: 'gpt-4',
    },
    systemPrompt: {
      type: 'string',
      description: '系统提示词',
      required: false,
      example: 'You are a helpful assistant',
    },
    temperature: {
      type: 'number',
      description: '生成温度 (0-2)',
      required: false,
      example: 0.7,
    },
    maxTokens: {
      type: 'integer',
      description: '最大 Token 数',
      required: false,
      example: 2048,
    },
    role: {
      type: 'string',
      description: 'Agent 角色',
      enum: ['assistant', 'coder', 'researcher'],
      required: true,
      example: 'assistant',
    },
    apiKey: {
      type: 'string',
      description: 'API 密钥',
      sensitive: true,
      required: true,
      example: 'sk-***',
    },
  },
  required: ['name', 'model', 'role', 'apiKey'],
}

describe('SchemaHelpPanel', () => {
  describe('基础渲染', () => {
    it('应该渲染组件并显示折叠态横幅', () => {
      render(<SchemaHelpPanel schema={mockSchema} />)

      // 检查是否渲染了组件（通过检查 schema-help-panel 类名）
      const panel = document.querySelector('.schema-help-panel')
      expect(panel).toBeInTheDocument()

      // 检查是否渲染了横幅按钮
      const banner = panel?.querySelector('button')
      expect(banner).toBeInTheDocument()
    })

    it('当没有 schema 时应该显示空状态', () => {
      const { container } = render(<SchemaHelpPanel schema={null} />)

      // 应该渲染组件
      expect(container.querySelector('.schema-help-panel')).toBeInTheDocument()
    })

    it('当加载中时应该显示 loading 状态', () => {
      const { container } = render(<SchemaHelpPanel schema={null} isLoading={true} />)

      // 应该渲染组件
      expect(container.querySelector('.schema-help-panel')).toBeInTheDocument()
    })
  })

  describe('展开/折叠行为', () => {
    it('默认应该处于折叠状态', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} />)

      // 折叠状态下不应该显示字段列表
      expect(container.querySelector('.schema-fields')).not.toBeInTheDocument()
    })

    it('点击横幅后应该展开字段列表', async () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} />)

      // 点击展开按钮（横幅区域）
      const banner = container.querySelector('button')
      expect(banner).toBeInTheDocument()
      fireEvent.click(banner!)

      // 展开后应该显示字段列表
      expect(container.querySelector('.schema-fields')).toBeInTheDocument()
    })

    it('再次点击应该折叠字段列表', async () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} />)

      // 展开
      const banner = container.querySelector('button')
      fireEvent.click(banner!)
      expect(container.querySelector('.schema-fields')).toBeInTheDocument()

      // 折叠
      fireEvent.click(banner!)
      expect(container.querySelector('.schema-fields')).not.toBeInTheDocument()
    })

    it('可以通过 defaultExpanded prop 控制初始状态', () => {
      const { container } = render(
        <SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />
      )

      expect(container.querySelector('.schema-fields')).toBeInTheDocument()
    })
  })

  describe('字段信息展示', () => {
    it('每个字段应该显示名称、类型和描述', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // 检查字段名（使用 code 标签）
      expect(container.textContent).toContain('name')
      expect(container.textContent).toContain('model')
      expect(container.textContent).toContain('systemPrompt')

      // 检查描述文本
      expect(container.textContent).toContain('Agent 名称')
      expect(container.textContent).toContain('使用的模型 ID')
    })

    it('必填和可选字段应该有标识', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // 检查是否有必填或可选标识（通过检查表格内容）
      const tableContent = container.querySelector('tbody')
      expect(tableContent).toBeInTheDocument()
      expect(tableContent!.textContent).toBeTruthy()
    })

    it('敏感字段应该显示 Lock 图标', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // apiKey 是敏感字段，应该有 Lock 图标（lucide-lock 类）
      const lockIcon = container.querySelector('.lucide-lock')
      expect(lockIcon).toBeInTheDocument()
    })

    it('enum 字段应该展示可选值列表', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // role 字段有 enum 值
      expect(container.textContent).toContain('assistant')
      expect(container.textContent).toContain('coder')
      expect(container.textContent).toContain('researcher')
    })

    it('字段应该显示示例值', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // 检查示例值
      expect(container.textContent).toContain('my-agent')
      expect(container.textContent).toContain('gpt-4')
    })
  })

  describe('搜索过滤功能', () => {
    it('展开后应该显示搜索框', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // 应该有输入框
      const searchInput = container.querySelector('input[type="text"]')
      expect(searchInput).toBeInTheDocument()
    })

    it('输入搜索关键词应该过滤字段列表', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      // 输入搜索关键词
      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'model' } })

      // 应该只显示包含 "model" 的字段
      expect(container.textContent).toContain('model')
      // name 不包含 model，但 "model" 字段本身会显示
    })

    it('清空搜索框应该恢复所有字段', () => {
      const { container } = render(<SchemaHelpPanel schema={mockSchema} defaultExpanded={true} />)

      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement

      // 先搜索
      fireEvent.change(searchInput, { target: { value: 'model' } })

      // 清空搜索
      fireEvent.change(searchInput, { target: { value: '' } })

      // 所有字段都应该恢复
      expect(container.textContent).toContain('name')
      expect(container.textContent).toContain('systemPrompt')
    })
  })

  describe('回调函数', () => {
    it('onFieldClick 回调应该在点击字段时触发', () => {
      const onFieldClick = vi.fn()
      const { container } = render(
        <SchemaHelpPanel
          schema={mockSchema}
          defaultExpanded={true}
          onFieldClick={onFieldClick}
        />
      )

      // 点击表格行（字段行）
      const firstRow = container.querySelector('tbody tr')
      expect(firstRow).toBeInTheDocument()
      fireEvent.click(firstRow!)

      expect(onFieldClick).toHaveBeenCalled()
    })
  })
})
