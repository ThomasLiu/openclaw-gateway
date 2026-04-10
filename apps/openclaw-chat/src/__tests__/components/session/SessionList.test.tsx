// ============================================================
// OpenClaw Chat - SessionList 组件测试
// TDD 绿阶段：测试真实 SessionList 组件行为
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import SessionList from '@/components/session/SessionList'
import { useIDEStore } from '@/store'
import type { SessionMetadata } from '@/types'

describe('SessionList', () => {
  const mockSessions: SessionMetadata[] = [
    {
      id: 'session-1',
      agentId: 'agent-1',
      filePath: '/sessions/agent-1/session-1.json',
      startTime: Date.now() - 7200000,
      endTime: Date.now() - 3600000,
      messageCount: 10,
      size: 2048,
    },
    {
      id: 'session-2',
      agentId: 'agent-1',
      filePath: '/sessions/agent-1/session-2.json',
      startTime: Date.now() - 86400000,
      endTime: Date.now() - 43200000,
      messageCount: 25,
      size: 4096,
    },
    {
      id: 'session-3',
      agentId: 'agent-2',
      filePath: '/sessions/agent-2/session-3.json',
      startTime: Date.now() - 172800000,
      endTime: Date.now() - 86400000,
      messageCount: 5,
      size: 1024,
    },
  ]

  beforeEach(() => {
    useIDEStore.getState().resetAllToDefaults()
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('should render the list container', () => {
      render(<SessionList sessions={mockSessions} />)
      
      expect(screen.getByTestId('session-list')).toBeInTheDocument()
    })

    it('should render list title with i18n', () => {
      render(<SessionList sessions={mockSessions} />)
      
      expect(screen.getByTestId('session-list-title')).toHaveTextContent('会话')
    })
  })

  describe('Session 列表渲染', () => {
    it('should render all sessions in the list', () => {
      render(<SessionList sessions={mockSessions} />)
      
      expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument()
      expect(screen.getByTestId('session-card-session-2')).toBeInTheDocument()
      expect(screen.getByTestId('session-card-session-3')).toBeInTheDocument()
    })

    it('should show correct count of session cards', () => {
      render(<SessionList sessions={mockSessions} />)
      
      const cards = screen.getAllByTestId(/^session-card-/)
      expect(cards).toHaveLength(3)
    })
  })

  describe('空状态', () => {
    it('should show empty state when no sessions', () => {
      render(<SessionList sessions={[]} />)
      
      expect(screen.getByTestId('session-empty')).toBeInTheDocument()
      expect(screen.getByTestId('session-empty')).toHaveTextContent('暂无会话')
    })

    it('should not show empty state when sessions exist', () => {
      render(<SessionList sessions={mockSessions} />)
      
      expect(screen.queryByTestId('session-empty')).not.toBeInTheDocument()
    })

    it('should not show items container when no sessions', () => {
      render(<SessionList sessions={[]} />)
      
      // 空状态下不显示 session items（只有 empty 元素）
      const cards = screen.queryAllByTestId(/^session-card-/)
      expect(cards).toHaveLength(0)
    })
  })

  describe('选中状态', () => {
    it('should pass selected prop to correct SessionCard', () => {
      // 先在 store 中选择会话
      useIDEStore.getState().selectSession('session-2')
      
      const { container } = render(
        <SessionList sessions={mockSessions} />
      )
      
      // 验证选中的 card 有 selected styles
      const selectedCard = screen.getByTestId('session-card-session-2')
      expect(selectedCard).toBeInTheDocument()
    })

    it('should call onSessionSelect when a session is clicked', () => {
      const onSessionSelect = vi.fn()
      render(<SessionList sessions={mockSessions} onSessionSelect={onSessionSelect} />)
      
      fireEvent.click(screen.getByTestId('session-card-session-1'))
      
      expect(onSessionSelect).toHaveBeenCalledWith('session-1')
    })

    it('should update store when session selected (default behavior)', () => {
      render(<SessionList sessions={mockSessions} />)
      
      // 点击一个 session
      fireEvent.click(screen.getByTestId('session-card-session-1'))
      
      // 验证 store 被更新
      expect(useIDEStore.getState().selection.sessionId).toBe('session-1')
    })
  })

  describe('新建会话', () => {
    it('should call onNewSession when add button clicked', () => {
      const onNewSession = vi.fn()
      render(<SessionList sessions={mockSessions} onNewSession={onNewSession} />)
      
      fireEvent.click(screen.getByTestId('session-add-btn'))
      
      expect(onNewSession).toHaveBeenCalledTimes(1)
    })
  })

  describe('删除会话', () => {
    it('should have delete buttons in all session cards', () => {
      render(
        <SessionList 
          sessions={mockSessions} 
          onDeleteSession={() => {}} 
        />)
      
      // 每个会话卡片都应该有删除按钮
      const deleteBtns = screen.getAllByTestId('session-delete')
      expect(deleteBtns).toHaveLength(mockSessions.length)
    })

    it('should call onDeleteSession when first session delete button clicked', () => {
      const onDeleteSession = vi.fn()
      render(
        <SessionList 
          sessions={mockSessions} 
          onDeleteSession={onDeleteSession} 
        />
      )
      
      // 获取第一个会话的删除按钮并点击
      const deleteBtns = screen.getAllByTestId('session-delete')
      fireEvent.click(deleteBtns[0])
      
      expect(onDeleteSession).toHaveBeenCalled()
    })
  })

  describe('加载状态', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<SessionList sessions={[]} isLoading={true} />)
      
      expect(screen.getByTestId('session-loading')).toBeInTheDocument()
      expect(screen.getByTestId('session-loading')).toHaveTextContent('加载中...')
    })

    it('should not show loading indicator when isLoading is false', () => {
      render(<SessionList sessions={mockSessions} isLoading={false} />)
      
      expect(screen.queryByTestId('session-loading')).not.toBeInTheDocument()
    })

    it('should not show empty state during loading', () => {
      render(<SessionList sessions={[]} isLoading={true} />)
      
      expect(screen.queryByTestId('session-empty')).not.toBeInTheDocument()
    })
  })

  describe('搜索功能', () => {
    it('should filter sessions based on search query', () => {
      render(<SessionList sessions={mockSessions} />)
      
      // 输入搜索关键词（使用 role 查找输入框）
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'session-1' } })
      
      // 应该只显示匹配的 session
      expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument()
      expect(screen.queryByTestId('session-card-session-2')).not.toBeInTheDocument()
    })

    it('should show all sessions when search is cleared', () => {
      render(<SessionList sessions={mockSessions} />)
      
      const searchInput = screen.getByRole('textbox')
      
      // 搜索
      fireEvent.change(searchInput, { target: { value: 'session-1' } })
      expect(screen.getAllByTestId(/^session-card-/)).toHaveLength(1)
      
      // 清空搜索
      fireEvent.change(searchInput, { target: { value: '' } })
      expect(screen.getAllByTestId(/^session-card-/)).toHaveLength(3)
    })
  })

  describe('与 Zustand Store 联动', () => {
    it('should use store selection state by default', () => {
      useIDEStore.getState().selectSession('session-3')
      
      render(<SessionList sessions={mockSessions} />)
      
      // 验证组件能正确获取 store 状态
      const state = useIDEStore.getState()
      expect(state.selection.sessionId).toBe('session-3')
    })
  })

  describe('i18n 国际化', () => {
    it('should use translated text for title', () => {
      render(<SessionList sessions={mockSessions} />)
      
      expect(screen.getByTestId('session-list-title')).toHaveTextContent('会话')
    })

    it('should use translated text for empty state', () => {
      render(<SessionList sessions={[]} />)
      
      expect(screen.getByTestId('session-empty')).toHaveTextContent('暂无会话')
    })

    it('should use translated text for loading state', () => {
      render(<SessionList sessions={[]} isLoading={true} />)
      
      expect(screen.getByTestId('session-loading')).toHaveTextContent('加载中...')
    })
  })
})
