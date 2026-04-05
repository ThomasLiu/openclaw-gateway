/**
 * SessionCache - 会话列表本地缓存
 *
 * 将 sessionsMap 缓存到 localStorage，页面刷新时先读缓存，
 * 等定时刷新的订阅更新来更新数据，避免每次刷新都重新加载导致白屏/闪烁。
 */

import type { SessionInfo_ } from "@/components/chat-types";

const CACHE_KEY = "openclaw-sessions-cache";
const CACHE_VERSION = 1;

type CacheEntry = {
  version: number;
  data: Record<string, SessionInfo_[]>;
  updatedAt: number; // timestamp
};

interface CacheStore {
  sessionsMap: Record<string, SessionInfo_[]>;
  updatedAt: number;
}

/** 格式化相对时间（与 ChatApp 保持一致） */
function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return "刚刚";
}

/** 从 localStorage 读取缓存，并重新计算 relativeTime（避免缓存过期） */
export function getSessionCache(): CacheStore {
  if (typeof window === "undefined") {
    return { sessionsMap: {}, updatedAt: 0 };
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { sessionsMap: {}, updatedAt: 0 };

    const cache: CacheEntry = JSON.parse(raw);
    if (cache.version !== CACHE_VERSION) {
      // 版本不匹配，清除旧缓存
      localStorage.removeItem(CACHE_KEY);
      return { sessionsMap: {}, updatedAt: 0 };
    }

    // 重新计算每个 session 的 relativeTime（因为缓存中的已经过期）
    for (const agentId of Object.keys(cache.data)) {
      const sessions = cache.data[agentId];
      for (const session of sessions) {
        if (session.updatedAt) {
          // updatedAt 在 JSON 序列化后变成字符串，需要转换回 Date
          const updatedAtDate = typeof session.updatedAt === "string"
            ? new Date(session.updatedAt)
            : session.updatedAt;
          session.relativeTime = formatRelativeTime(updatedAtDate);
        }
      }
    }

    // 返回缓存数据的深拷贝，避免直接修改原始缓存对象
    return {
      sessionsMap: JSON.parse(JSON.stringify(cache.data)),
      updatedAt: cache.updatedAt,
    };
  } catch {
    return { sessionsMap: {}, updatedAt: 0 };
  }
}

/** 保存 sessionsMap 到 localStorage */
export function setSessionCache(sessionsMap: Record<string, SessionInfo_[]>): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      data: sessionsMap,
      updatedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage 写失败（如容量限制），静默忽略
  }
}

/** 更新单个 agent 的 sessions 到缓存 */
export function updateAgentSessionsCache(
  agentId: string,
  sessions: SessionInfo_[]
): void {
  const cache = getSessionCache();
  cache.sessionsMap[agentId] = sessions;
  setSessionCache(cache.sessionsMap);
}

/** 清除所有缓存 */
export function clearSessionCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
