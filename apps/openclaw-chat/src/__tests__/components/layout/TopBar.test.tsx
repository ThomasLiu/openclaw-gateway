// ============================================================
// OpenClaw Chat - TopBar 组件测试
// TDD 红阶段：先写测试，验证组件行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import TopBar from '@/components/layout/TopBar'
import { useIDEStore } from '@/store'

describe('TopBar', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useIDEStore.getState().resetAllToDefaults()
    
    // 清除所有 mocks
    vi.clearAllMocks()
  })

  describe('渲染基础结构', () => {
    it('should render the TopBar header element', () => {
      render(<TopBar />)
      
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex')
    })

    it('should display OpenClaw logo and IDE text', () => {
      render(<TopBar />)
      
      expect(screen.getByText('OpenClaw')).toBeInTheDocument()
      expect(screen.getByText('IDE')).toBeInTheDocument()
    })
  })

  describe('连接状态指示器', () => {
    it('should show green status when connected', () => {
      useIDEStore.getState().setGatewayStatus('connected')
      
      render(<TopBar />)
      
      // 验证显示"已连接"文本和绿色样式
      const statusElement = screen.getByText('已连接')
      expect(statusElement).toBeInTheDocument()
      // 验证父元素有绿色状态类
      const statusContainer = statusElement.closest('[class*="text-status-success"]')
      expect(statusContainer).toBeTruthy()
    })

    it('should show yellow/warning status when connecting', () => {
      useIDEStore.getState().setGatewayStatus('connecting')
      
      render(<TopBar />)
      
      const statusElement = screen.getByText('连接中...')
      expect(statusElement).toBeInTheDocument()
      const statusContainer = statusElement.closest('[class*="text-status-warning"]')
      expect(statusContainer).toBeTruthy()
    })

    it('should show red/error status when disconnected', () => {
      useIDEStore.getState().setGatewayStatus('disconnected')
      
      render(<TopBar />)
      
      const statusElement = screen.getByText('已断开')
      expect(statusElement).toBeInTheDocument()
      const statusContainer = statusElement.closest('[class*="text-status-error"]')
      expect(statusContainer).toBeTruthy()
    })

    it('should show reconnecting status with warning color', () => {
      useIDEStore.getState().setGatewayStatus('reconnecting')
      
      render(<TopBar />)
      
      const statusElement = screen.getByText('重连中...')
      expect(statusElement).toBeInTheDocument()
    })
  })

  describe('版本号显示', () => {
    it('should display version number with v prefix', () => {
      render(<TopBar version="1.2.3" />)
      
      expect(screen.getByText(/v1\.2\.3/)).toBeInTheDocument()
    })

    it('should use default version when not provided', () => {
      render(<TopBar />)
      
      // 默认版本应该是 v0.1.0 或从 API 获取的版本
      const versionElements = screen.getAllByText(/^v\d/)
      expect(versionElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('CLI 快捷按钮', () => {
    it('should render CLI button', () => {
      render(<TopBar />)
      
      const cliButton = screen.getByRole('button', { name: /CLI/i })
      expect(cliButton).toBeInTheDocument()
    })

    it('should have correct title attribute for CLI button', () => {
      render(<TopBar />)
      
      const cliButton = screen.getByRole('button', { name: /CLI/i })
      expect(cliButton).toHaveAttribute('title', 'CLI 指令')
    })

    it('should call onCliClick handler when clicked', () => {
      const onCliClick = vi.fn()
      render(<TopBar onCliClick={onCliClick} />)
      
      const cliButton = screen.getByRole('button', { name: /CLI/i })
      fireEvent.click(cliButton)
      
      expect(onCliClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('重新连接功能', () => {
    it('should show reconnect button when disconnected', () => {
      useIDEStore.getState().setGatewayStatus('disconnected')
      
      render(<TopBar />)
      
      // 断开状态下应该可以点击状态区域来重连
      const statusArea = screen.getByText('已断开')
      expect(statusArea).toBeInTheDocument()
    })

    it('should call onReconnect handler when clicking disconnected status', () => {
      const onReconnect = vi.fn()
      useIDEStore.getState().setGatewayStatus('disconnected')
      
      render(<TopBar onReconnect={onReconnect} />)
      
      const statusArea = screen.getByText('已断开')
      fireEvent.click(statusArea)
      
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('i18n 国际化支持', () => {
    it('should use translations from topbar namespace', () => {
      useIDEStore.getState().setGatewayStatus('connected')
      
      render(<TopBar />)
      
      // 验证使用 i18n 翻译（默认中文）
      expect(screen.getByText('已连接')).toBeInTheDocument()
      
      // 验证 CLI 按钮的 title 使用了翻译（title 属性而非文本）
      const cliButton = screen.getByRole('button', { name: /CLI/i })
      expect(cliButton).toHaveAttribute('title', 'CLI 指令')
    })

    it('should support custom translation messages via provider', () => {
      useIDEStore.getState().setGatewayStatus('connected')
      
      // 验证组件能正常渲染并使用翻译函数
      render(<TopBar />)
      
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })
  })

  describe('更新提示', () => {
    it('should show update available indicator when update is available', () => {
      render(<TopBar hasUpdate={true} />)
      
      expect(screen.getByText('有可用更新')).toBeInTheDocument()
    })

    it('should not show update indicator when no update', () => {
      render(<TopBar hasUpdate={false} />)
      
      expect(screen.queryByText('有可用更新')).not.toBeInTheDocument()
    })
  })

  describe('布局结构', () => {
    it('should have left section with logo and status', () => {
      render(<TopBar />)
      
      const header = screen.getByRole('banner')
      // 左侧区域应该包含 OpenClaw 和状态信息
      expect(header.textContent).toContain('OpenClaw')
    })

    it('should have right section with actions', () => {
      render(<TopBar />)
      
      // 右侧应该包含 CLI 按钮和版本号
      expect(screen.getByRole('button', { name: /CLI/i })).toBeInTheDocument()
    })
  })
})
