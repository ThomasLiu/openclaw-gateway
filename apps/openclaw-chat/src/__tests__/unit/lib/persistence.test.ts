// ============================================================
// OpenClaw Chat - Persistence 工具单元测试
// TDD 红阶段：测试 localStorage 持久化工具
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUIState,
  setUIState,
  getAllUIState,
  setAllUIState,
  getInputHistory,
  pushInputHistory,
  clearInputHistory,
  clearAllInputHistory,
  clearAllUIState,
  clearAllOpenClawData,
  getStorageUsage,
  DEFAULT_UI_STATE,
} from '@/lib/persistence'

describe('Persistence Utils', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear()
    
    // Mock console.warn 和 console.error 以避免测试输出噪音
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // 恢复 console
    vi.restoreAllMocks()
  })

  describe('DEFAULT_UI_STATE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_UI_STATE.selectedAgentId).toBeNull()
      expect(DEFAULT_UI_STATE.selectedSessionId).toBeNull()
      expect(DEFAULT_UI_STATE.leftSidebarVisible).toBe(true)
      expect(DEFAULT_UI_STATE.leftSidebarWidth).toBe(280)
      expect(DEFAULT_UI_STATE.rightSidebarVisible).toBe(true)
      expect(DEFAULT_UI_STATE.rightSidebarWidth).toBe(360)
      expect(DEFAULT_UI_STATE.rightSidebarActiveTab).toBe('config')
      expect(DEFAULT_UI_STATE.logPanelExpanded).toBe(false)
      expect(DEFAULT_UI_STATE.logFilters.levels).toEqual(['error', 'warn', 'info'])
      expect(DEFAULT_UI_STATE.logFilters.sources).toEqual([])
      expect(DEFAULT_UI_STATE.logFilters.searchQuery).toBe('')
      expect(DEFAULT_UI_STATE.inputModelOverride).toEqual({})
      expect(DEFAULT_UI_STATE.preferredLanguage).toBe('auto')
    })
  })

  describe('getUIState', () => {
    it('should return default value when key does not exist in localStorage', () => {
      const result = getUIState('selectedAgentId')
      
      expect(result).toBeNull() // 默认值
    })

    it('should return custom default value when provided and key does not exist', () => {
      const result = getUIState('selectedAgentId', 'custom-agent')
      
      expect(result).toBe('custom-agent')
    })

    it('should return stored value when key exists in localStorage', () => {
      localStorage.setItem('openclaw_ui_selectedAgentId', JSON.stringify('agent-123'))
      
      const result = getUIState('selectedAgentId')
      
      expect(result).toBe('agent-123')
    })

    it('should handle boolean values correctly', () => {
      localStorage.setItem('openclaw_ui_leftSidebarVisible', JSON.stringify(false))
      
      const result = getUIState('leftSidebarVisible')
      
      expect(result).toBe(false)
    })

    it('should handle number values correctly', () => {
      localStorage.setItem('openclaw_ui_leftSidebarWidth', JSON.stringify(350))
      
      const result = getUIState('leftSidebarWidth')
      
      expect(result).toBe(350)
    })

    it('should return default value for corrupted data', () => {
      localStorage.setItem('openclaw_ui_selectedAgentId', 'not-valid-json')
      
      const result = getUIState('selectedAgentId')
      
      expect(result).toBeNull() // 返回默认值
    })
  })

  describe('setUIState', () => {
    it('should store value in localStorage with correct prefix', () => {
      const result = setUIState('selectedAgentId', 'agent-456')
      
      expect(result).toBe(true)
      expect(localStorage.getItem('openclaw_ui_selectedAgentId')).toBe(JSON.stringify('agent-456'))
    })

    it('should overwrite existing value', () => {
      setUIState('selectedAgentId', 'agent-1')
      setUIState('selectedAgentId', 'agent-2')
      
      expect(localStorage.getItem('openclaw_ui_selectedAgentId')).toBe(JSON.stringify('agent-2'))
    })

    it('should store different types of values correctly', () => {
      setUIState('leftSidebarVisible', false)
      setUIState('leftSidebarWidth', 300)
      setUIState('rightSidebarActiveTab', 'history')
      
      expect(getUIState('leftSidebarVisible')).toBe(false)
      expect(getUIState('leftSidebarWidth')).toBe(300)
      expect(getUIState('rightSidebarActiveTab')).toBe('history')
    })
  })

  describe('getAllUIState', () => {
    it('should return all UI state as an object', () => {
      // 预设一些值
      setUIState('selectedAgentId', 'test-agent')
      setUIState('leftSidebarVisible', false)
      
      const state = getAllUIState()
      
      expect(state.selectedAgentId).toBe('test-agent')
      expect(state.leftSidebarVisible).toBe(false)
      // 其他字段应该是默认值
      expect(state.selectedSessionId).toBeNull()
      expect(state.leftSidebarWidth).toBe(280) // 默认值
    })
  })

  describe('setAllUIState', () => {
    it('should batch update multiple UI states', () => {
      const result = setAllUIState({
        selectedAgentId: 'batch-agent',
        leftSidebarVisible: false,
        rightSidebarActiveTab: 'history',
      })
      
      expect(result).toBe(true)
      expect(getUIState('selectedAgentId')).toBe('batch-agent')
      expect(getUIState('leftSidebarVisible')).toBe(false)
      expect(getUIState('rightSidebarActiveTab')).toBe('history')
    })

    it('should return false if any write fails', () => {
      // 保存原始 setItem 实现
      const originalSetItem = localStorage.setItem.bind(localStorage)

      // 直接 spy 当前环境的 localStorage.setItem
      const setItemSpy = vi.spyOn(localStorage, 'setItem')
      let callCount = 0
      setItemSpy.mockImplementation((key: string, value: string) => {
        callCount++
        if (callCount === 2) {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError')
        }
        // 第一次调用使用原始实现
        return originalSetItem(key, value)
      })

      const result = setAllUIState({
        selectedAgentId: 'agent-1',
        selectedSessionId: 'session-1',
      })

      // 第一个成功，第二个失败
      expect(result).toBe(false)
      expect(callCount).toBe(2)

      // 恢复原始实现
      setItemSpy.mockRestore()
    })
  })

  describe('getInputHistory', () => {
    it('should return empty array when no history exists', () => {
      const history = getInputHistory('session-1')
      
      expect(history).toEqual([])
    })

    it('should return stored history when exists', () => {
      localStorage.setItem(
        'openclaw_input_history_session-1',
        JSON.stringify(['msg1', 'msg2', 'msg3'])
      )
      
      const history = getInputHistory('session-1')
      
      expect(history).toEqual(['msg1', 'msg2', 'msg3'])
    })
  })

  describe('pushInputHistory', () => {
    it('should add message to history', () => {
      const updated = pushInputHistory('session-1', 'Hello World')
      
      expect(updated).toEqual(['Hello World'])
      expect(getInputHistory('session-1')).toEqual(['Hello World'])
    })

    it('should append multiple messages in order', () => {
      pushInputHistory('session-1', 'First')
      pushInputHistory('session-1', 'Second')
      pushInputHistory('session-1', 'Third')
      
      const history = getInputHistory('session-1')
      
      expect(history).toEqual(['First', 'Second', 'Third'])
    })

    it('should not add empty or whitespace-only messages', () => {
      pushInputHistory('session-1', '')
      pushInputHistory('session-1', '   ')
      pushInputHistory('session-1', 'Valid message')
      
      const history = getInputHistory('session-1')
      
      expect(history).toEqual(['Valid message'])
    })

    it('should deduplicate consecutive identical messages', () => {
      pushInputHistory('session-1', 'Same message')
      pushInputHistory('session-1', 'Same message') // 不应该添加
      
      const history = getInputHistory('session-1')
      
      expect(history).toEqual(['Same message'])
      expect(history.length).toBe(1)
    })

    it('should allow same non-consecutive messages', () => {
      pushInputHistory('session-1', 'Message A')
      pushInputHistory('session-1', 'Message B')
      pushInputHistory('session-1', 'Message A') // 允许（非连续）
      
      const history = getInputHistory('session-1')
      
      expect(history).toEqual(['Message A', 'Message B', 'Message A'])
    })

    it('should limit history to maximum length (100)', () => {
      // 添加超过 100 条消息
      for (let i = 0; i < 105; i++) {
        pushInputHistory('session-1', `Message ${i}`)
      }
      
      const history = getInputHistory('session-1')
      
      expect(history.length).toBeLessThanOrEqual(100)
      // 应该保留最新的消息
      expect(history[history.length - 1]).toBe('Message 104')
    })

    it('should maintain separate histories for different sessions', () => {
      pushInputHistory('session-1', 'Session 1 msg')
      pushInputHistory('session-2', 'Session 2 msg')
      
      expect(getInputHistory('session-1')).toEqual(['Session 1 msg'])
      expect(getInputHistory('session-2')).toEqual(['Session 2 msg'])
    })
  })

  describe('clearInputHistory', () => {
    it('should clear history for specific session', () => {
      pushInputHistory('session-1', 'Message 1')
      pushInputHistory('session-1', 'Message 2')
      
      clearInputHistory('session-1')
      
      expect(getInputHistory('session-1')).toEqual([])
    })

    it('should not affect other sessions', () => {
      pushInputHistory('session-1', 'Session 1')
      pushInputHistory('session-2', 'Session 2')
      
      clearInputHistory('session-1')
      
      expect(getInputHistory('session-2')).toEqual(['Session 2'])
    })
  })

  describe('clearAllInputHistory', () => {
    it('should clear input history for all sessions', () => {
      pushInputHistory('session-1', 'Msg 1')
      pushInputHistory('session-2', 'Msg 2')
      pushInputHistory('session-3', 'Msg 3')
      
      clearAllInputHistory()
      
      expect(getInputHistory('session-1')).toEqual([])
      expect(getInputHistory('session-2')).toEqual([])
      expect(getInputHistory('session-3')).toEqual([])
    })
  })

  describe('clearAllUIState', () => {
    it('should remove all UI state keys from localStorage', () => {
      setUIState('selectedAgentId', 'agent-1')
      setUIState('leftSidebarVisible', false)
      setUIState('rightSidebarActiveTab', 'log')
      
      clearAllUIState()
      
      // 所有 openclaw_ui_ 前缀的键应该被删除
      const keys = Object.keys(localStorage)
      const uiKeys = keys.filter(key => key.startsWith('openclaw_ui_'))
      
      expect(uiKeys).toHaveLength(0)
    })

    it('should not remove input history keys', () => {
      pushInputHistory('session-1', 'Test message')
      
      clearAllUIState()
      
      // 输入历史应该保留
      expect(getInputHistory('session-1')).toEqual(['Test message'])
    })
  })

  describe('clearAllOpenClawData', () => {
    it('should remove both UI state and input history', () => {
      setUIState('selectedAgentId', 'agent-1')
      pushInputHistory('session-1', 'Test')
      
      clearAllOpenClawData()
      
      expect(localStorage.length).toBe(0)
    })
  })

  describe('getStorageUsage', () => {
    it('should return storage usage information', () => {
      setUIState('selectedAgentId', 'test-value')
      
      const usage = getStorageUsage()
      
      expect(usage).not.toBeNull()
      expect(usage!.used).toBeGreaterThan(0)
      expect(usage!.total).toBeGreaterThan(0)
      expect(usage!.percentage).toBeGreaterThanOrEqual(0)
      expect(usage!.percentage).toBeLessThanOrEqual(100)
    })

    it('should calculate correct total size including keys and values', () => {
      localStorage.clear()
      
      setUIState('key1', 'value1')
      setUIState('key2', 'value2')
      
      const usage = getStorageUsage()
      
      // 应该包含两个条目的大小
      expect(usage!.used).toBeGreaterThan(0)
    })
  })
})
