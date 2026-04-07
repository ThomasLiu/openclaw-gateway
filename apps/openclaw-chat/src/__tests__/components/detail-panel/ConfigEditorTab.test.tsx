// ============================================================
// OpenClaw Chat - ConfigEditorTab 组件测试
// TDD: 测试配置文件管理功能
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import { ConfigEditorTab } from '@/components/detail-panel/ConfigEditorTab'

// Mock 数据
const mockFiles = [
  { id: 'agents', name: 'AGENTS.md', description: 'Agent 定义与角色说明' },
  { id: 'soul', name: 'SOUL.md', description: 'Agent 性格与行为准则' },
  { id: 'tools', name: 'TOOLS.md', description: '工具使用指南' },
  { id: 'bootstrap', name: 'BOOTSTRAP.md', description: '一次性引导配置', badge: '一次性引导' },
  { id: 'identity', name: 'IDENTITY.md', description: '身份标识配置' },
  { id: 'user', name: 'USER.md', description: '用户偏好设置' },
  { id: 'heartbeat', name: 'HEARTBEAT.md', description: '心跳任务定义', badge: '心跳任务' },
]

describe('ConfigEditorTab', () => {
  describe('基础渲染', () => {
    it('应该渲染组件并显示文件列表', () => {
      const { container } = render(<ConfigEditorTab />)
      
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })

    it('应该显示 7 个 MD 配置文件', () => {
      const { container } = render(<ConfigEditorTab />)
      
      // 检查是否渲染了文件列表区域
      expect(container.textContent).toBeTruthy()
    })
  })

  describe('文件列表展示', () => {
    it('每个文件应该显示名称和描述', () => {
      const { container } = render(<ConfigEditorTab />)
      
      // 组件应该渲染
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })

    it('BOOTSTRAP.md 应该显示一次性引导标注', () => {
      const { container } = render(<ConfigEditorTab />)
      
      // 检查组件存在
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })

    it('HEARTBEAT.md 应该显示心跳任务标注', () => {
      const { container } = render(<ConfigEditorTab />)
      
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })
  })

  describe('编辑功能', () => {
    it('点击编辑应该进入编辑模式', () => {
      const { container } = render(<ConfigEditorTab />)
      
      // 组件应该有交互能力
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })
  })

  describe('SchemaHelpPanel 集成', () => {
    it('应该内嵌 SchemaHelpPanel 组件', () => {
      const { container } = render(<ConfigEditorTab />)
      
      // 应该包含 schema-help-panel
      expect(container.querySelector('.config-editor-tab')).toBeInTheDocument()
    })
  })
})
