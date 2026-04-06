/**
 * 已读游标管理
 *
 * 维护每个会话的"最后已读消息 id"游标
 */

import type { SessionReadMap } from "./session-unread";

const SESSION_READ_STATE_KEY = "openclaw:session:read";

/**
 * 判断是否在浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * 从 localStorage 读取已读游标 Map
 */
export function readSessionReadMap(): SessionReadMap {
  const map = new Map<string, string | number>();

  if (!isBrowser()) return map;

  try {
    const raw = localStorage.getItem(SESSION_READ_STATE_KEY);
    if (!raw) return map;

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return map;

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" || typeof value === "number") {
        map.set(key, value);
      }
    }
    return map;
  } catch {
    return map;
  }
}

/**
 * 写入完整已读游标 Map 到 localStorage
 */
export function writeSessionReadMap(map: SessionReadMap): void {
  if (!isBrowser()) return;

  try {
    const obj: Record<string, string | number> = {};
    for (const [key, value] of map) {
      obj[key] = value;
    }
    localStorage.setItem(SESSION_READ_STATE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage 满或不可用
  }
}

/**
 * 更新指定会话的已读游标
 */
export function patchSessionRead(
  sessionKey: string,
  lastReadId: string | number
): void {
  const map = readSessionReadMap();
  map.set(sessionKey, lastReadId);
  writeSessionReadMap(map);
}

/**
 * 获取指定会话的已读游标
 */
export function getLastReadMessageId(sessionKey: string): string | number | undefined {
  const map = readSessionReadMap();
  return map.get(sessionKey);
}

/**
 * 清除指定会话的已读游标
 */
export function clearSessionRead(sessionKey: string): void {
  const map = readSessionReadMap();
  map.delete(sessionKey);
  writeSessionReadMap(map);
}

/**
 * 清除所有已读游标
 */
export function clearAllSessionReads(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(SESSION_READ_STATE_KEY);
  } catch {
    // ignore
  }
}
