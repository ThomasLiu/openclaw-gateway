// ============================================================
// OpenClaw Chat - IDE Store 单元测试
// TDD 红阶段：测试 Zustand store 的核心功能
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useIDEStore } from '@/store'

describe('useIDEStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useIDEStore.getState().resetAllToDefaults()
    
    // 清除 localStorage
    localStorage.clear()
  })

  describe('初始状态', () => {
    it('should have correct initial gateway state', () => {
      const state = useIDEStore.getState()
      
      expect(state.gateway.status).toBe('disconnected')
      expect(state.gateway.url).toBe('')
      expect(state.gateway.reconnectCount).toBe(0)
      expect(state.gateway.lastError).toBeUndefined()
    })

    it('should have correct initial selection state', () => {
      const state = useIDEStore.getState()
      
      expect(state.selection.agentId).toBeNull()
      expect(state.selection.sessionId).toBeNull()
    })

    it('should have correct initial layout state', () => {
      const state = useIDEStore.getState()
      
      expect(state.layout.leftSidebarVisible).toBe(true)
      expect(state.layout.leftSidebarWidth).toBe(280)
      expect(state.layout.rightSidebarVisible).toBe(true)
      expect(state.layout.rightSidebarWidth).toBe(360)
      expect(state.layout.rightSidebarActiveTab).toBe('config')
      expect(state.layout.logPanelExpanded).toBe(false)
    })

    it('should have correct initial log filter state', () => {
      const state = useIDEStore.getState()
      
      expect(state.logFilters.levels).toEqual(['error', 'warn', 'info'])
      expect(state.logFilters.sources).toEqual([])
      expect(state.logFilters.searchQuery).toBe('')
    })

    it('should have correct initial input state', () => {
      const state = useIDEStore.getState()
      
      expect(state.input.modelOverride).toEqual({})
      expect(state.input.preferredLanguage).toBe('auto')
      expect(state.input.history).toEqual({})
    })
  })

  describe('Gateway Actions', () => {
    describe('setGatewayStatus', () => {
      it('should update gateway status and url', () => {
        useIDEStore.getState().setGatewayStatus('connected', 'ws://localhost:8080')
        
        const state = useIDEStore.getState()
        
        expect(state.gateway.status).toBe('connected')
        expect(state.gateway.url).toBe('ws://localhost:8080')
      })

      it('should set error message when status is not connected', () => {
        useIDEStore.getState().setGatewayStatus('disconnected', '', 'Connection failed')
        
        const state = useIDEStore.getState()
        
        expect(state.gateway.status).toBe('disconnected')
        expect(state.gateway.lastError).toBe('Connection failed')
      })

      it('should clear error when status is connected', () => {
        // 先设置错误状态
        useIDEStore.setState({
          gateway: { ...useIDEStore.getState().gateway, lastError: 'Previous error' }
        })
        
        // 连接成功时应该清除错误
        useIDEStore.getState().setGatewayStatus('connected', 'ws://localhost:8080')
        
        const state = useIDEStore.getState()
        
        expect(state.gateway.lastError).toBeUndefined()
      })
    })

    describe('incrementReconnectCount', () => {
      it('should increment reconnect count by 1', () => {
        useIDEStore.getState().incrementReconnectCount()
        
        expect(useIDEStore.getState().gateway.reconnectCount).toBe(1)
        
        useIDEStore.getState().incrementReconnectCount()
        
        expect(useIDEStore.getState().gateway.reconnectCount).toBe(2)
      })
    })

    describe('resetReconnectCount', () => {
      it('should reset reconnect count to 0', () => {
        useIDEStore.setState({
          gateway: { ...useIDEStore.getState().gateway, reconnectCount: 5 }
        })
        
        useIDEStore.getState().resetReconnectCount()
        
        expect(useIDEStore.getState().gateway.reconnectCount).toBe(0)
      })
    })
  })

  describe('Selection Actions', () => {
    describe('selectAgent', () => {
      it('should set agentId when selecting an agent', () => {
        useIDEStore.getState().selectAgent('agent-123')
        
        expect(useIDEStore.getState().selection.agentId).toBe('agent-123')
      })

      it('should clear sessionId when selecting a different agent', () => {
        // 先选择 agent 和 session
        useIDEStore.setState({
          selection: { agentId: 'agent-1', sessionId: 'session-1' }
        })
        
        // 选择不同的 agent
        useIDEStore.getState().selectAgent('agent-2')
        
        const state = useIDEStore.getState()
        
        expect(state.selection.agentId).toBe('agent-2')
        expect(state.selection.sessionId).toBeNull() // 应该被清除
      })

      it('should keep sessionId when re-selecting the same agent', () => {
        useIDEStore.setState({
          selection: { agentId: 'agent-1', sessionId: 'session-1' }
        })
        
        // 重新选择相同的 agent
        useIDEStore.getState().selectAgent('agent-1')
        
        expect(useIDEStore.getState().selection.sessionId).toBe('session-1')
      })

      it('should allow deselecting agent by passing null', () => {
        useIDEStore.setState({
          selection: { agentId: 'agent-1', sessionId: 'session-1' }
        })
        
        useIDEStore.getState().selectAgent(null)
        
        expect(useIDEStore.getState().selection.agentId).toBeNull()
      })
    })

    describe('selectSession', () => {
      it('should set sessionId when selecting a session', () => {
        useIDEStore.getState().selectSession('session-456')
        
        expect(useIDEStore.getState().selection.sessionId).toBe('session-456')
      })

      it('should allow deselecting session by passing null', () => {
        useIDEStore.setState({
          selection: { agentId: 'agent-1', sessionId: 'session-1' }
        })
        
        useIDEStore.getState().selectSession(null)
        
        expect(useIDEStore.getState().selection.sessionId).toBeNull()
      })
    })

    describe('clearSelection', () => {
      it('should clear both agentId and sessionId', () => {
        useIDEStore.setState({
          selection: { agentId: 'agent-1', sessionId: 'session-1' }
        })
        
        useIDEStore.getState().clearSelection()
        
        const state = useIDEStore.getState()
        
        expect(state.selection.agentId).toBeNull()
        expect(state.selection.sessionId).toBeNull()
      })
    })
  })

  describe('Layout Actions', () => {
    describe('toggleLeftSidebar', () => {
      it('should toggle left sidebar visibility', () => {
        const initial = useIDEStore.getState().layout.leftSidebarVisible
        
        useIDEStore.getState().toggleLeftSidebar()
        
        expect(useIDEStore.getState().layout.leftSidebarVisible).toBe(!initial)
        
        useIDEStore.getState().toggleLeftSidebar()
        
        expect(useIDEStore.getState().layout.leftSidebarVisible).toBe(initial)
      })
    })

    describe('setLeftSidebarWidth', () => {
      it('should set width within valid range (200-500)', () => {
        useIDEStore.getState().setLeftSidebarWidth(300)
        
        expect(useIDEStore.getState().layout.leftSidebarWidth).toBe(300)
      })

      it('should clamp width to minimum of 200', () => {
        useIDEStore.getState().setLeftSidebarWidth(100)
        
        expect(useIDEStore.getState().layout.leftSidebarWidth).toBe(200)
      })

      it('should clamp width to maximum of 500', () => {
        useIDEStore.getState().setLeftSidebarWidth(600)
        
        expect(useIDEStore.getState().layout.leftSidebarWidth).toBe(500)
      })
    })

    describe('toggleRightSidebar', () => {
      it('should toggle right sidebar visibility', () => {
        const initial = useIDEStore.getState().layout.rightSidebarVisible
        
        useIDEStore.getState().toggleRightSidebar()
        
        expect(useIDEStore.getState().layout.rightSidebarVisible).toBe(!initial)
      })
    })

    describe('setRightSidebarWidth', () => {
      it('should set width within valid range (280-600)', () => {
        useIDEStore.getState().setRightSidebarWidth(400)
        
        expect(useIDEStore.getState().layout.rightSidebarWidth).toBe(400)
      })

      it('should clamp width to minimum of 280', () => {
        useIDEStore.getState().setRightSidebarWidth(100)
        
        expect(useIDEStore.getState().layout.rightSidebarWidth).toBe(280)
      })

      it('should clamp width to maximum of 600', () => {
        useIDEStore.getState().setRightSidebarWidth(800)
        
        expect(useIDEStore.getState().layout.rightSidebarWidth).toBe(600)
      })
    })

    describe('setRightSidebarTab', () => {
      it('should set the active tab', () => {
        useIDEStore.getState().setRightSidebarTab('history')
        
        expect(useIDEStore.getState().layout.rightSidebarActiveTab).toBe('history')
      })

      it('should accept all valid tab values', () => {
        const validTabs = [
          'config', 'history', 'skill', 'mcp', 'subagent',
          'model', 'memory', 'workspace', 'cron', 'channel', 'log'
        ]
        
        validTabs.forEach(tab => {
          useIDEStore.getState().setRightSidebarTab(tab as any)
          expect(useIDEStore.getState().layout.rightSidebarActiveTab).toBe(tab)
        })
      })
    })

    describe('toggleLogPanel', () => {
      it('should toggle log panel expanded state', () => {
        const initial = useIDEStore.getState().layout.logPanelExpanded
        
        useIDEStore.getState().toggleLogPanel()
        
        expect(useIDEStore.getState().layout.logPanelExpanded).toBe(!initial)
      })
    })

    describe('resetLayout', () => {
      it('should reset layout to default values', () => {
        // 先修改布局
        useIDEStore.setState({
          layout: {
            leftSidebarVisible: false,
            leftSidebarWidth: 400,
            rightSidebarVisible: false,
            rightSidebarWidth: 500,
            rightSidebarActiveTab: 'log',
            logPanelExpanded: true,
          }
        })
        
        // 重置布局
        useIDEStore.getState().resetLayout()
        
        const state = useIDEStore.getState()
        
        expect(state.layout.leftSidebarVisible).toBe(true)
        expect(state.layout.leftSidebarWidth).toBe(280)
        expect(state.layout.rightSidebarVisible).toBe(true)
        expect(state.layout.rightSidebarWidth).toBe(360)
        expect(state.layout.rightSidebarActiveTab).toBe('config')
        expect(state.layout.logPanelExpanded).toBe(false)
      })
    })
  })

  describe('Log Filter Actions', () => {
    describe('setLogLevels', () => {
      it('should set log levels', () => {
        useIDEStore.getState().setLogLevels(['error'])
        
        expect(useIDEStore.getState().logFilters.levels).toEqual(['error'])
      })

      it('should replace existing levels completely', () => {
        useIDEStore.getState().setLogLevels(['debug', 'info', 'warn', 'error'])
        
        expect(useIDEStore.getState().logFilters.levels).toEqual([
          'debug', 'info', 'warn', 'error'
        ])
      })
    })

    describe('toggleLogLevel', () => {
      it('should add level if not present', () => {
        useIDEStore.getState().toggleLogLevel('debug')
        
        expect(useIDEStore.getState().logFilters.levels).toContain('debug')
      })

      it('should remove level if already present', () => {
        useIDEStore.getState().setLogLevels(['error', 'warn', 'info'])
        
        useIDEStore.getState().toggleLogLevel('warn')
        
        expect(useIDEStore.getState().logFilters.levels).not.toContain('warn')
        expect(useIDEStore.getState().logFilters.levels).toEqual(['error', 'info'])
      })
    })

    describe('addLogSource', () => {
      it('should add source to sources list', () => {
        useIDEStore.getState().addLogSource('gateway')
        
        expect(useIDEStore.getState().logFilters.sources).toContain('gateway')
      })

      it('should not add duplicate source', () => {
        useIDEStore.getState().addLogSource('gateway')
        useIDEStore.getState().addLogSource('gateway')
        
        expect(useIDEStore.getState().logFilters.sources.filter(s => s === 'gateway')).toHaveLength(1)
      })
    })

    describe('removeLogSource', () => {
      it('should remove source from sources list', () => {
        useIDEStore.getState().setLogSources(['gateway', 'cli', 'ws'])
        
        useIDEStore.getState().removeLogSource('cli')
        
        expect(useIDEStore.getState().logFilters.sources).toEqual(['gateway', 'ws'])
      })
    })

    describe('setLogSearchQuery', () => {
      it('should set search query', () => {
        useIDEStore.getState().setLogSearchQuery('error message')
        
        expect(useIDEStore.getState().logFilters.searchQuery).toBe('error message')
      })
    })

    describe('resetLogFilters', () => {
      it('should reset all filters to defaults', () => {
        useIDEStore.setState({
          logFilters: {
            levels: ['debug'],
            sources: ['source1', 'source2'],
            searchQuery: 'test',
          }
        })
        
        useIDEStore.getState().resetLogFilters()
        
        const state = useIDEStore.getState()
        
        expect(state.logFilters.levels).toEqual(['error', 'warn', 'info'])
        expect(state.logFilters.sources).toEqual([])
        expect(state.logFilters.searchQuery).toBe('')
      })
    })
  })

  describe('Input Actions', () => {
    describe('setSessionModel', () => {
      it('should set model override for a session', () => {
        useIDEStore.getState().setSessionModel('session-1', 'gpt-4')
        
        expect(useIDEStore.getState().input.modelOverride['session-1']).toBe('gpt-4')
      })

      it('should allow different models for different sessions', () => {
        useIDEStore.getState().setSessionModel('session-1', 'gpt-4')
        useIDEStore.getState().setSessionModel('session-2', 'claude-3')
        
        expect(useIDEStore.getState().input.modelOverride['session-1']).toBe('gpt-4')
        expect(useIDEStore.getState().input.modelOverride['session-2']).toBe('claude-3')
      })
    })

    describe('clearSessionModel', () => {
      it('should clear model override for a session', () => {
        useIDEStore.getState().setSessionModel('session-1', 'gpt-4')
        
        useIDEStore.getState().clearSessionModel('session-1')
        
        expect(useIDEStore.getState().input.modelOverride['session-1']).toBeUndefined()
      })
    })

    describe('setPreferredLanguage', () => {
      it('should set preferred language', () => {
        useIDEStore.getState().setPreferredLanguage('zh-CN')
        
        expect(useIDEStore.getState().input.preferredLanguage).toBe('zh-CN')
      })

      it('should accept all valid language options', () => {
        const languages = ['auto', 'zh-CN', 'zh-TW', 'en', 'ja', 'ko']
        
        languages.forEach(lang => {
          useIDEStore.getState().setPreferredLanguage(lang as any)
          expect(useIDEStore.getState().input.preferredLanguage).toBe(lang)
        })
      })
    })
  })

  describe('Persistence Actions', () => {
    describe('resetAllToDefaults', () => {
      it('should reset all state slices to their defaults', () => {
        // 修改所有状态切片
        useIDEStore.setState({
          gateway: { status: 'connected', url: 'ws://test', lastError: undefined, reconnectCount: 5 },
          selection: { agentId: 'test-agent', sessionId: 'test-session' },
          layout: { leftSidebarVisible: false, leftSidebarWidth: 400, rightSidebarVisible: false, rightSidebarWidth: 500, rightSidebarActiveTab: 'log', logPanelExpanded: true },
          logFilters: { levels: ['debug'], sources: ['test'], searchQuery: 'query' },
          input: { modelOverride: { s1: 'm1' }, preferredLanguage: 'en', history: { s1: ['msg'] } },
        })
        
        // 重置所有状态
        useIDEStore.getState().resetAllToDefaults()
        
        const state = useIDEStore.getState()
        
        // 验证 Gateway 状态
        expect(state.gateway.status).toBe('disconnected')
        expect(state.gateway.reconnectCount).toBe(0)
        
        // 验证选择状态
        expect(state.selection.agentId).toBeNull()
        expect(state.selection.sessionId).toBeNull()
        
        // 验证布局状态（使用默认值）
        expect(state.layout.leftSidebarVisible).toBe(true)
        expect(state.layout.rightSidebarActiveTab).toBe('config')
        
        // 验证日志过滤器
        expect(state.logFilters.levels).toEqual(['error', 'warn', 'info'])
        expect(state.logFilters.sources).toEqual([])
        
        // 验证输入状态
        expect(state.input.modelOverride).toEqual({})
        expect(state.input.preferredLanguage).toBe('auto')
      })
    })
  })
})
