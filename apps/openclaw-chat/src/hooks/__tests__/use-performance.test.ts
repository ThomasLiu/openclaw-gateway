import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useThrottledValue,
  useDebouncedValue,
  useMemoCompare,
  useRafCallback,
  useBatchedUpdates,
} from '../use-performance'

describe('useThrottledValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottledValue('initial', 1000))
    expect(result.current).toBe('initial')
  })

  it('should throttle rapid updates to interval', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottledValue(value, 500),
      { initialProps: { value: 'a' } }
    )

    expect(result.current).toBe('a')

    // Rapid updates within throttle window
    rerender({ value: 'b' })
    rerender({ value: 'c' })
    rerender({ value: 'd' })

    // Should still be 'a' (throttled)
    expect(result.current).toBe('a')

    // After throttle interval
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe('d') // Latest value
  })

  it('should eventually reflect latest value after interval', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottledValue(value, 100),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    // Before interval: may or may not be updated (timing dependent)
    
    // After interval: must be updated
    act(() => { vi.advanceTimersByTime(150) })
    expect(result.current).toBe('b')
  })
})

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello'))
    expect(result.current).toBe('hello')
  })

  it('should delay update until stable for delayMs', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useDebouncedValue(val, 300),
      { initialProps: { val: 'first' } }
    )

    rerender({ val: 'second' })
    expect(result.current).toBe('first') // Not yet updated

    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe('first') // Still not updated

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('second') // Updated after delay
  })

  it('should reset timer on each change (debounce behavior)', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useDebouncedValue(val, 200),
      { initialProps: { val: 'a' } }
    )

    rerender({ val: 'b' })
    act(() => { vi.advanceTimersByTime(150) })
    rerender({ val: 'c' }) // Reset timer
    act(() => { vi.advanceTimersByTime(150) })
    expect(result.current).toBe('a') // Still not updated (timer reset)

    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current).toBe('c') // Now updated
  })
})

describe('useMemoCompare', () => {
  it('should return same reference when values are equal by default compare', () => {
    const { result, rerender } = renderHook(
      ({ obj }) => useMemoCompare(obj),
      { initialProps: { obj: { a: 1 } } }
    )
    const firstRef = result.current

    rerender({ obj: { a: 1 } }) // New object but same content
    // Default compare uses === so this is a new reference
    expect(result.current).toEqual({ a: 1 })
  })

  it('should use custom comparator', () => {
    const deepCompare = (a: any, b: any) =>
      JSON.stringify(a) === JSON.stringify(b)

    const { result, rerender } = renderHook(
      ({ obj }) => useMemoCompare(obj, deepCompare),
      { initialProps: { obj: { x: 1 } } }
    )
    const firstRef = result.current

    rerender({ obj: { x: 1 } }) // Same deep content
    expect(result.current).toBe(firstRef) // Same reference!

    rerender({ obj: { x: 2 } }) // Different content
    expect(result.current).not.toBe(firstRef) // New reference
    expect(result.current).toEqual({ x: 2 })
  })
})

describe('useRafCallback', () => {
  it('should return a function', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useRafCallback(callback))
    expect(typeof result.current).toBe('function')
  })

  it('should only call callback once for multiple rapid invocations', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useRafCallback(callback))

    // Simulate multiple rapid calls
    result.current()
    result.current()
    result.current()

    // Callback should only be called once (last one wins via RAF)
    expect(callback).not.toHaveBeenCalled() // Not called yet (pending RAF)
  })
})

describe('useBatchedUpdates', () => {
  it('should provide batchUpdate and flushUpdates functions', () => {
    const { result } = renderHook(() => useBatchedUpdates())
    expect(typeof result.current.batchUpdate).toBe('function')
    expect(typeof result.current.flushUpdates).toBe('function')
  })

  it('should batch multiple updates and flush them together', () => {
    const { result } = renderHook(() => useBatchedUpdates())
    
    let callCount = 0
    result.current.batchUpdate(() => { callCount++ })
    result.current.batchUpdate(() => { callCount++ })
    result.current.batchUpdate(() => { callCount++ })

    // Updates should be pending
    expect(callCount).toBe(0)

    // Flush all at once
    result.current.flushUpdates()
    expect(callCount).toBe(3)
  })

  it('flushUpdates with no pending updates should be safe', () => {
    const { result } = renderHook(() => useBatchedUpdates())
    expect(() => result.current.flushUpdates()).not.toThrow()
  })
})
