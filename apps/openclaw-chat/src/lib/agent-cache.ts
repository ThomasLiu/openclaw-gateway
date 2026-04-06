/**
 * AgentCache - Agent 列表本地缓存
 *
 * 将 agents 列表缓存到 localStorage，页面刷新时先读缓存，
 * 等定时刷新的订阅更新来更新数据，避免每次刷新都重新加载导致白屏/闪烁。
 */

import type { AgentInfo } from "@/components/chat-types";

const CACHE_KEY = "openclaw-agents-cache";
const CACHE_VERSION = 1;

type CacheEntry = {
  version: number;
  agents: AgentInfo[];
  updatedAt: number; // timestamp
};

interface AgentCacheStore {
  agents: AgentInfo[];
  updatedAt: number;
}

/** 从 localStorage 读取缓存 */
export function getAgentCache(): AgentCacheStore {
  if (typeof window === "undefined") {
    return { agents: [], updatedAt: 0 };
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { agents: [], updatedAt: 0 };

    const cache: CacheEntry = JSON.parse(raw);
    if (cache.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return { agents: [], updatedAt: 0 };
    }

    return {
      agents: cache.agents,
      updatedAt: cache.updatedAt,
    };
  } catch {
    return { agents: [], updatedAt: 0 };
  }
}

/** 保存 agents 到 localStorage */
export function setAgentCache(agents: AgentInfo[]): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      agents,
      updatedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage 写失败，静默忽略
  }
}

/** 清除所有缓存 */
export function clearAgentCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
