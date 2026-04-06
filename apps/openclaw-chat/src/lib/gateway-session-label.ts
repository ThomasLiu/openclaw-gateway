/**
 * 网关会话标签生成
 *
 * 为会话生成唯一、用户友好的展示标签
 */

export const SESSION_LABEL_MAX_LENGTH = 50;

export type SessionLabelInput = {
  key: string;
  agentId?: string;
  label?: string;
  title?: string;
  lastMessage?: string;
  createdAt?: string;
};

/**
 * 生成唯一会话标签
 */
export function makeUniqueSessionLabel(session: SessionLabelInput): string {
  // 优先使用 label
  if (session.label && session.label.trim()) {
    return truncateSessionLabel(session.label.trim());
  }

  // 其次使用 title
  if (session.title && session.title.trim()) {
    return truncateSessionLabel(session.title.trim());
  }

  // 从最后消息提取
  if (session.lastMessage && session.lastMessage.trim()) {
    return truncateSessionLabel(session.lastMessage.trim());
  }

  // 使用 agentId + 创建时间
  const agent = session.agentId ?? "agent";
  const time = session.createdAt
    ? formatSessionTimestamp({ createdAt: session.createdAt })
    : "新会话";

  return `${agent} - ${time}`;
}

/**
 * 截断超长标签
 */
export function truncateSessionLabel(label: string): string {
  if (label.length <= SESSION_LABEL_MAX_LENGTH) {
    return label;
  }
  return label.slice(0, SESSION_LABEL_MAX_LENGTH - 1) + "…";
}

/**
 * 格式化会话时间戳为可读标签
 */
export function formatSessionTimestamp(
  session: { createdAt?: string }
): string {
  if (!session.createdAt) return "未知时间";

  try {
    const date = new Date(session.createdAt);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 7) return `${diffDay} 天前`;

    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "未知时间";
  }
}

/**
 * 生成简短标签（用于侧栏）
 */
export function makeShortLabel(session: SessionLabelInput): string {
  const full = makeUniqueSessionLabel(session);

  // 截取前 20 字符
  if (full.length <= 20) return full;
  return full.slice(0, 19) + "…";
}
