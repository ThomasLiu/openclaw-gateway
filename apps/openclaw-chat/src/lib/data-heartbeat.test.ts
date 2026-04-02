import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeDataHeartbeat, stopAllHeartbeats } from './data-heartbeat';

describe('subscribeDataHeartbeat', () => {
  beforeEach(() => {
    stopAllHeartbeats();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopAllHeartbeats();
    vi.useRealTimers();
  });

  it('calls callback immediately on subscribe', () => {
    const fn = vi.fn();
    subscribeDataHeartbeat(fn, 60_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls callback again after interval', () => {
    const fn = vi.fn();
    subscribeDataHeartbeat(fn, 5000);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns unsubscribe function', () => {
    const fn = vi.fn();
    const unsub = subscribeDataHeartbeat(fn, 5000);
    unsub();
    vi.advanceTimersByTime(10_000);
    expect(fn).toHaveBeenCalledTimes(1); // only the immediate call
  });
});
