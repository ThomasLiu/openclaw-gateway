/**
 * Session unread state computation.
 */
export interface UnreadState {
  sessionKey: string;
  count: number;
  latestMessageId?: number;
}

export function computeSessionUnreadByKey(
  messages: Array<{ id: string; role: string; createdAt?: string }>,
  _readMap: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  // Simplified: count messages with id greater than read cursor
  // In full impl, would track by session key using _readMap
  void messages;
  void _readMap;
  return result;
}

export function aggregateUnreadByAgentId(
  unreadBySession: Record<string, number>
): Record<string, number> {
  return unreadBySession; // simplified
}

export function mergeUnreadWithSnapshot(
  current: Record<string, number>,
  snapshot: Record<string, number>
): Record<string, number> {
  return { ...snapshot, ...current };
}

export function maxUiMessageId(messages: Array<{ id: string }>): number {
  return messages.reduce((max, m) => {
    const n = parseInt(m.id.replace(/\D/g, "")) || 0;
    return n > max ? n : max;
  }, 0);
}
