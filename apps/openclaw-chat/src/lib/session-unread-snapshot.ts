/**
 * 会话未读快照 localStorage 持久化
 *
 * 用于在页面刷新后恢复未读计数
 */

import type { UnreadSnapshot } from "./session-unread";

const SESSION_UNREAD_SNAPSHOT_KEY = "openclaw:unread:snapshot";

/**
 * 判断是否在浏览器环境（避免 SSR 问题）
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * 从 localStorage 读取未读快照
 */
export function readUnreadSnapshot(): UnreadSnapshot {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(SESSION_UNREAD_SNAPSHOT_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    // 过滤掉非数字值
    const result: UnreadSnapshot = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 写入未读快照到 localStorage
 */
export function writeUnreadSnapshot(snapshot: UnreadSnapshot): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(SESSION_UNREAD_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage 写入失败（满或不可用）
  }
}

/**
 * 删除指定会话的未读快照
 */
export function removeUnreadSnapshotKey(sessionKey: string): void {
  const snapshot = readUnreadSnapshot();
  if (sessionKey in snapshot) {
    const updated = { ...snapshot };
    delete updated[sessionKey];
    writeUnreadSnapshot(updated);
  }
}

/**
 * 清空所有未读快照
 */
export function clearUnreadSnapshot(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(SESSION_UNREAD_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

/**
 * 更新指定会话的未读数
 */
export function updateUnreadSnapshot(sessionKey: string, count: number): void {
  const snapshot = readUnreadSnapshot();
  writeUnreadSnapshot({ ...snapshot, [sessionKey]: count });
}
