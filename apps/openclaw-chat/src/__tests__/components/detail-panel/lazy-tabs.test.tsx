import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils/render-with-providers'

// We test the lazy-tabs module structure and the Suspense fallback
// Full lazy component rendering requires special handling in test env

describe('LazyTabs - Performance Optimization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Module exports', () => {
    it('should export lazyTabComponents registry', async () => {
      const { lazyTabComponents } = await import('@/components/detail-panel/lazy-tabs')
      expect(lazyTabComponents).toBeDefined()
      expect(typeof lazyTabComponents).toBe('object')
    })

    it('should have entries for all 10 detail panel tabs', async () => {
      const { lazyTabComponents } = await import('@/components/detail-panel/lazy-tabs')
      const expectedKeys = ['config', 'history', 'skill', 'mcp', 'subagent', 'model', 'memory', 'workspace', 'cron', 'channel']
      
      for (const key of expectedKeys) {
        expect(lazyTabComponents[key]).toBeDefined()
        // React.lazy components are objects (have $$typeof symbol)
        expect(lazyTabComponents[key]).toBeTruthy()
      }
    })

    it('should NOT include log tab (it has placeholder content)', async () => {
      const { lazyTabComponents } = await import('@/components/detail-panel/lazy-tabs')
      expect(lazyTabComponents['log']).toBeUndefined()
    })
  })

  describe('LazyTabLoader fallback for unknown tabs', () => {
    it('should render "Unknown tab" message for invalid key', async () => {
      const { LazyTabLoader } = await import('@/components/detail-panel/lazy-tabs')
      
      // Use a key that definitely won't exist
      const { container } = render(
        <LazyTabLoader tabKey={'__invalid_test_key__' as any} />
      )
      
      expect(container.textContent).toContain('Unknown tab')
    })
  })

  describe('preload helpers', () => {
    it('preloadTab should not throw for valid keys', async () => {
      const { preloadTab } = await import('@/components/detail-panel/lazy-tabs')
      expect(() => preloadTab('config')).not.toThrow()
      expect(() => preloadTab('history')).not.toThrow()
      expect(() => preloadTab('skill')).not.toThrow()
    })

    it('preloadAllTabs should not throw', async () => {
      const { preloadAllTabs } = await import('@/components/detail-panel/lazy-tabs')
      expect(() => preloadAllTabs()).not.toThrow()
    })
  })

  describe('Suspense integration', () => {
    it('LazyTabLoader should be a valid React component', async () => {
      const { LazyTabLoader } = await import('@/components/detail-panel/lazy-tabs')
      expect(LazyTabLoader).toBeDefined()
      expect(typeof LazyTabLoader).toBe('function')
    })
  })
})
