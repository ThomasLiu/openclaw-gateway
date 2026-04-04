/**
 * chat-utils.ts
 * ChatApp 相关的工具函数（不含 JSX，供组件使用）
 */

/** localStorage key 生成器：sessionKeyStorageKey(agentId) */
export function sessionKeyStorageKey(agentId: string): string {
  return `openclaw-chat.sessionKey.${agentId}`;
}

/** localStorage key 生成器：sessionKeyBelongsToAgent 校验用 */
export function sessionKeyBelongsToAgent(sessionKey: string, agentId: string): boolean {
  return sessionKey.startsWith(`${agentId}:`);
}
