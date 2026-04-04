/**
 * 会话 UI 状态标志
 *
 * 纯函数，计算会话在 UI 中需要的各种标志
 */

export type SessionInfo = {
  key: string;
  agentId?: string;
  label?: string;
  title?: string;
  updatedAt?: string;
  lastMessage?: string;
  createdAt?: string;
  thinking?: boolean;
  streaming?: boolean;
  error?: string;
};

/**
 * 判断会话是否需要显示 Continue 按钮
 *
 * 条件：会话有错误消息，或者最后消息是 assistant 角色
 */
export function computeSessionNeedsContinue(session: SessionInfo): boolean {
  // 有错误时显示 Continue
  if (session.error) return true;

  // 最后消息是 assistant 说的（可能需要追问）
  // 简版判断：如果会话不是"正在说"状态
  if (!session.thinking && !session.streaming) {
    // 检查最后更新时间，5 分钟内无更新的 assistant 会话
    if (session.updatedAt) {
      const updatedMs = new Date(session.updatedAt).getTime();
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (updatedMs < fiveMinAgo && session.lastMessage) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 从会话对象提取 agentId
 */
export function extractAgentIdFromSession(session: SessionInfo): string {
  if (session.agentId) return session.agentId;

  // 从 sessionKey 提取（格式: agent:<id>:chat:<id>）
  const key = session.key;
  const match = key.match(/^agent:([^:]+):/);
  if (match) return match[1];

  return "unknown";
}

/**
 * 计算会话活跃状态
 */
export type SessionActiveState = "active" | "thinking" | "idle" | "error";

export function computeSessionActiveState(session: SessionInfo): SessionActiveState {
  if (session.error) return "error";
  if (session.thinking) return "thinking";
  if (session.streaming) return "active";

  // 检查是否在 1 分钟内有更新
  if (session.updatedAt) {
    const updatedMs = new Date(session.updatedAt).getTime();
    const oneMinAgo = Date.now() - 60_000;
    if (updatedMs >= oneMinAgo) return "active";
  }

  return "idle";
}

/**
 * 判断是否显示未读红点
 */
export function shouldShowUnreadBadge(
  session: SessionInfo,
  unreadCount: number
): boolean {
  // 有未读消息且会话不在前台（不在 active/thinking 状态）
  if (unreadCount <= 0) return false;
  const state = computeSessionActiveState(session);
  return state === "idle" || state === "error";
}
