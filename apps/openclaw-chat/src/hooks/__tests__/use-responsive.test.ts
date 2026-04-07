import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsive } from '../use-responsive'

// Mock window.matchMedia
const createMatchMedia = (matches: boolean) => vi.fn().mockImplementation((query: string) => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

describe('useResponsive', () => {
  let matchMediaSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Default: desktop (>1200px)
    matchMediaSpy = createMatchMedia(false)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    })
    // Reset innerWidth
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 })
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 900 })
  })

  it('should return isMobile=false, isTablet=false, isDesktop=true on large screen', () => {
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.breakpoint).toBe('desktop')
  })

  it('should return isTablet=true on tablet screen (768px-1199px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 992 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.breakpoint).toBe('tablet')
  })

  it('should return isMobile=true on mobile screen (<768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.breakpoint).toBe('mobile')
  })

  it('should return correct breakpoint at exact boundary 768px (tablet)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.breakpoint).toBe('tablet')
  })

  it('should return correct breakpoint at exact boundary 1200px (desktop)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.breakpoint).toBe('desktop')
  })

  it('should return correct breakpoint at boundary 767px (mobile)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.breakpoint).toBe('mobile')
  })

  it('should return correct breakpoint at boundary 1199px (tablet)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1199 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isTablet).toBe(true)
    expect(result.current.breakpoint).toBe('tablet')
  })

  it('should expose window dimensions', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 })
    Object.defineProperty(window, 'innerHeight', { value: 768 })
    const { result } = renderHook(() => useResponsive())
    expect(result.current.width).toBe(1024)
    expect(result.current.height).toBe(768)
  })

  it('should detect touch device capability', () => {
    const { result } = renderHook(() => useResponsive())
    expect(typeof result.current.isTouchDevice).toBe('boolean')
  })

  it('should provide orientation info', () => {
    const { result } = renderHook(() => useResponsive())
    expect(['portrait', 'landscape']).toContain(result.current.orientation)
  })

  it('should respond to window resize events', async () => {
    const { result, rerender } = renderHook(() => useResponsive())
    expect(result.current.breakpoint).toBe('desktop')

    await act(async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isMobile).toBe(true)
    expect(result.current.breakpoint).toBe('mobile')
  })

  it('should provide sidebar visibility recommendations based on breakpoint', () => {
    // Desktop: both sidebars visible
    Object.defineProperty(window, 'innerWidth', { value: 1440 })
    const { result: r1 } = renderHook(() => useResponsive())
    expect(r1.current.shouldShowLeftSidebar).toBe(true)
    expect(r1.current.shouldShowRightSidebar).toBe(true)

    // Tablet: left icon mode, right hidden
    Object.defineProperty(window, 'innerWidth', { value: 992 })
    const { result: r2 } = renderHook(() => useResponsive())
    expect(r2.current.shouldShowLeftSidebar).toBe(true)
    expect(r2.current.shouldShowRightSidebar).toBe(false)

    // Mobile: both as drawer
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    const { result: r3 } = renderHook(() => useResponsive())
    expect(r3.current.shouldShowLeftSidebar).toBe(false)
    expect(r3.current.shouldShowRightSidebar).toBe(false)
  })
})
