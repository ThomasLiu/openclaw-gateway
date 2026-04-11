// ============================================================
// OpenClaw Chat - GatewayVersion 组件测试
// 覆盖版本号显示和更新提示功能
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils/render-with-providers'
import { GatewayVersion } from '@/components/gateway/GatewayVersion'

describe('GatewayVersion', () => {
  const defaultProps = {
    version: '2026.4.2',
    hasUpdate: false,
    remoteVersion: '2026.4.3',
    onUpdateClick: vi.fn(),
  }

  describe('版本号显示', () => {
    it('should display version number when no update', () => {
      render(<GatewayVersion {...defaultProps} />)
      
      expect(screen.getByText('v2026.4.2')).toBeInTheDocument()
    })

    it('should not display version number when has update', () => {
      render(<GatewayVersion {...defaultProps} hasUpdate={true} />)
      
      expect(screen.queryByText('v2026.4.2')).not.toBeInTheDocument()
    })

    it('should clean version format', () => {
      render(<GatewayVersion {...defaultProps} version='OpenClaw 2026.4.2 (beta)' />)
      
      expect(screen.getByText('v2026.4.2')).toBeInTheDocument()
    })
  })

  describe('更新提示', () => {
    it('should show update button when has update', () => {
      render(<GatewayVersion {...defaultProps} hasUpdate={true} />)
      
      expect(screen.getByText('有可用更新 v2026.4.3')).toBeInTheDocument()
    })

    it('should not show update button when no update', () => {
      render(<GatewayVersion {...defaultProps} hasUpdate={false} />)
      
      expect(screen.queryByText('有可用更新')).not.toBeInTheDocument()
    })

    it('should not show update button when no onUpdateClick', () => {
      render(<GatewayVersion {...defaultProps} hasUpdate={true} onUpdateClick={undefined} />)
      
      expect(screen.queryByText('有可用更新')).not.toBeInTheDocument()
    })

    it('should call onUpdateClick when update button is clicked', () => {
      const onUpdateClick = vi.fn()
      render(<GatewayVersion {...defaultProps} hasUpdate={true} onUpdateClick={onUpdateClick} />)
      
      const updateButton = screen.getByText('有可用更新 v2026.4.3')
      updateButton.click()
      
      expect(onUpdateClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('响应式显示', () => {
    it('should have hidden class for mobile', () => {
      const { container } = render(<GatewayVersion {...defaultProps} />)
      
      expect(container.firstChild).toHaveClass('hidden')
      expect(container.firstChild).toHaveClass('md:flex')
    })
  })
})
