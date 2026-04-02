import { describe, it, expect, beforeEach } from 'vitest';
import {
  makeSessionHistoryCacheKey,
  getCachedHistory,
  setCachedHistory,
  invalidateCache,
} from './session-history-cache';

describe('session-history-cache', () => {
  beforeEach(() => {
    invalidateCache('agent1:session1');
    invalidateCache('agent1:session2');
  });

  describe('makeSessionHistoryCacheKey', () => {
    it('creates key from agentId and sessionKey', () => {
      expect(makeSessionHistoryCacheKey('agent1', 'session1')).toBe('agent1:session1');
    });
  });

  describe('getCachedHistory / setCachedHistory', () => {
    it('returns null for missing key', () => {
      expect(getCachedHistory('missing')).toBeNull();
    });

    it('returns cached value after set', () => {
      setCachedHistory('agent1:session1', [{ id: '1', content: 'test' }]);
      expect(getCachedHistory('agent1:session1')).toEqual([{ id: '1', content: 'test' }]);
    });
  });

  describe('invalidateCache', () => {
    it('removes cached entry', () => {
      setCachedHistory('agent1:session1', [{ id: '1' }]);
      invalidateCache('agent1:session1');
      expect(getCachedHistory('agent1:session1')).toBeNull();
    });
  });
});
