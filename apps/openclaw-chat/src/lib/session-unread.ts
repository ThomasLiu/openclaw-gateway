/**
 * 会话未读计数计算工具
 *
 * 纯函数，便于单测
 */

/**
 * 已读游标 Map：sessionKey → 最后已读消息的 id
 */
export type SessionReadMap = Map<string, string | number>;

/**
 * 未读快照：sessionKey → 未读计数
 */
export type UnreadSnapshot = Record<string, number>;

/**
 * 计算某会话的未读消息数
 *
 * @param sessionKey 会话 key
 * @param messages 消息列表（应按时间正序）
 * @param readMap 已读游标
 * @returns 未读消息数
 */
export function computeSessionUnreadByKey(
  sessionKey: string,
  messages: Array<{ id?: string | number }>,
  readMap: SessionReadMap
): number {
  const lastReadId = readMap.get(sessionKey);

  if (!lastReadId) {
    // 从未已读，所有消息都视为未读（排除用户消息）
    return messages.filter((m) => m.id !== undefined).length;
  }

  // 找到最后已读消息的位置
  let lastReadIndex = -1;
  for (let i = 0; i < messages.length; i++) {
    const msgId = messages[i].id;
    if (msgId !== undefined && String(msgId) === String(lastReadId)) {
      lastReadIndex = i;
      break;
    }
  }

  if (lastReadIndex === -1) {
    // 最后已读 id 不在当前消息列表中，视为全部未读
    return messages.filter((m) => m.id !== undefined && m.id !== lastReadId).length;
  }

  // lastReadIndex 之后的消息视为未读
  return Math.max(0, messages.length - lastReadIndex - 1);
}

/**
 * 按 agentId 聚合未读数
 *
 * @param sessions 会话列表（每个包含 sessionKey 和 agentId）
 * @param unreadByKey 按 sessionKey 的未读数
 * @returns 按 agentId 的未读数 Map
 */
export function aggregateUnreadByAgentId(
  sessions: Array<{ sessionKey: string; agentId?: string }>,
  unreadByKey: Record<string, number>
): Map<string, number> {
  const result = new Map<string, number>();

  for (const session of sessions) {
    const unread = unreadByKey[session.sessionKey] ?? 0;
    const agentId = session.agentId ?? "unknown";

    result.set(agentId, (result.get(agentId) ?? 0) + unread);
  }

  return result;
}

/**
 * 合并内存未读与持久化快照
 *
 * 取较大值（防止因并发导致丢失未读）
 */
export function mergeUnreadWithSnapshot(
  memoryUnread: Record<string, number>,
  snapshot: UnreadSnapshot
): Record<string, number> {
  const result: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(memoryUnread), ...Object.keys(snapshot)]);

  for (const key of allKeys) {
    const mem = memoryUnread[key] ?? 0;
    const snap = snapshot[key] ?? 0;
    result[key] = Math.max(mem, snap);
  }

  return result;
}

/**
 * 返回消息列表中最大 id
 *
 * 数字 id 按数值比较，字符串 id 按字典序比较
 */
export function maxUiMessageId(
  messages: Array<{ id?: string | number }>
): string | number | null {
  let max: string | number | null = null;

  for (const msg of messages) {
    if (msg.id !== undefined) {
      if (max === null) {
        max = msg.id;
      } else if (typeof msg.id === "number" && typeof max === "number") {
        max = Math.max(max, msg.id);
      } else {
        // 同字符串或混合类型，按字符串比较
        const msgStr = String(msg.id);
        const maxStr = String(max);
        if (msgStr > maxStr) {
          max = msg.id as typeof max;
        }
      }
    }
  }

  return max;
}

/**
 * 判断某条消息是否未读
 *
 * 同类型按原值比较，混合类型按字符串比较
 */
export function isMessageUnread(
  msgId: string | number | undefined,
  sessionKey: string,
  readMap: SessionReadMap
): boolean {
  if (msgId === undefined) return false;

  const lastReadId = readMap.get(sessionKey);
  if (!lastReadId) return true;

  // 尝试转为数字进行数值比较
  const msgIdNum = Number(msgId);
  const lastReadNum = Number(lastReadId);

  if (!Number.isNaN(msgIdNum) && !Number.isNaN(lastReadNum)) {
    return msgIdNum > lastReadNum;
  }

  // 不能转为数字时按字符串比较
  return String(msgId) > String(lastReadId);
}
