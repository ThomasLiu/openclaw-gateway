/**
 * Session history in-memory cache.
 */
interface CacheEntry {
  messages: unknown[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export function makeSessionHistoryCacheKey(
  agentId: string,
  sessionKey: string
): string {
  return `${agentId}:${sessionKey}`;
}

export function getCachedHistory(key: string): unknown[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.messages;
}

export function setCachedHistory(key: string, messages: unknown[]): void {
  cache.set(key, { messages, timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}
