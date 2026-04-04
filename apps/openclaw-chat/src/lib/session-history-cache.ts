/**
 * 会话历史内存缓存
 *
 * LRU 淘汰策略，最多缓存 20 个会话
 * 参考 ui/session-cache.ts 的 getOrCreateSessionCacheValue 模式
 */

import type { GatewayMessage } from "./openclaw/types";

export const SESSION_HISTORY_CACHE_MAX_SIZE = 20;

// 内存缓存 Map：sessionKey → { messages, ts }
type CacheEntry = {
  messages: GatewayMessage[];
  ts: number;
};

const historyCache = new Map<string, CacheEntry>();

/**
 * 生成会话历史缓存 key
 */
export function makeSessionHistoryCacheKey(sessionKey: string): string {
  return `history:${sessionKey}`;
}

/**
 * 读取缓存（命中时更新 ts）
 */
export function getCachedHistory(sessionKey: string): GatewayMessage[] | null {
  const entry = historyCache.get(sessionKey);

  if (!entry) return null;

  // 刷新 LRU 顺序（删除再插入）
  historyCache.delete(sessionKey);
  entry.ts = Date.now();
  historyCache.set(sessionKey, entry);

  return entry.messages;
}

/**
 * 写入缓存（LRU 淘汰）
 */
export function setCachedHistory(
  sessionKey: string,
  messages: GatewayMessage[]
): void {
  // 如果已存在，先删除
  if (historyCache.has(sessionKey)) {
    historyCache.delete(sessionKey);
  }

  historyCache.set(sessionKey, {
    messages,
    ts: Date.now(),
  });

  // LRU 淘汰：超过最大容量时移除最老的
  while (historyCache.size > SESSION_HISTORY_CACHE_MAX_SIZE) {
    let oldestKey: string | null = null;
    let oldestTs = Infinity;

    for (const [key, entry] of historyCache) {
      if (entry.ts < oldestTs) {
        oldestTs = entry.ts;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      historyCache.delete(oldestKey);
    } else {
      break;
    }
  }
}

/**
 * 使指定会话的历史缓存失效
 */
export function invalidateSessionHistory(sessionKey: string): void {
  historyCache.delete(sessionKey);
}

/**
 * 使所有会话历史缓存失效
 */
export function clearAllSessionHistoryCache(): void {
  historyCache.clear();
}

/**
 * 获取当前缓存的会话 key 列表（调试用）
 */
export function getCachedSessionKeys(): string[] {
  return [...historyCache.keys()];
}
