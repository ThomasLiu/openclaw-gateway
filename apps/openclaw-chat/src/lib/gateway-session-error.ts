/**
 * 网关会话错误格式化
 *
 * 将网关错误转为用户友好的中文消息
 */

export type GatewayError = {
  message: string;
  code?: string | number;
  retryable?: boolean;
};

/** 错误码 → 中文描述映射 */
const ERROR_MESSAGES_MAP: Record<string, { message: string; retryable?: boolean }> = {
  UNAUTHORIZED: {
    message: "未授权，请检查登录状态",
    retryable: false,
  },
  FORBIDDEN: {
    message: "无权限执行此操作",
    retryable: false,
  },
  NOT_FOUND: {
    message: "请求的资源不存在",
    retryable: false,
  },
  SESSION_NOT_FOUND: {
    message: "会话不存在或已过期",
    retryable: true,
  },
  AGENT_NOT_FOUND: {
    message: "Agent 不存在",
    retryable: false,
  },
  INVALID_REQUEST: {
    message: "请求参数无效",
    retryable: false,
  },
  TIMEOUT: {
    message: "请求超时，请重试",
    retryable: true,
  },
  RATE_LIMIT: {
    message: "请求过于频繁，请稍后再试",
    retryable: true,
  },
  GATEWAY_UNAVAILABLE: {
    message: "网关不可用，请检查连接",
    retryable: true,
  },
  CONNECTION_FAILED: {
    message: "连接失败，请检查网络",
    retryable: true,
  },
  INTERNAL_ERROR: {
    message: "服务器内部错误",
    retryable: true,
  },
};

/**
 * 将网关错误转为用户友好消息
 */
export function formatGatewayUserMessage(error: unknown): string {
  if (!error) return "未知错误";

  const err = error as GatewayError;
  const rawMessage = err.message ?? String(error);

  // 尝试匹配已知错误码
  const code = err.code ?? "";
  if (typeof code === "string" && code in ERROR_MESSAGES_MAP) {
    return ERROR_MESSAGES_MAP[code].message;
  }

  // 从原始消息中提取错误码
  for (const [errorCode, info] of Object.entries(ERROR_MESSAGES_MAP)) {
    if (rawMessage.toUpperCase().includes(errorCode)) {
      return info.message;
    }
  }

  // 常见网络错误
  if (
    rawMessage.includes("timeout") ||
    rawMessage.includes("Timeout") ||
    rawMessage.includes("TIMEOUT")
  ) {
    return "请求超时，请重试";
  }

  if (
    rawMessage.includes("ECONNREFUSED") ||
    rawMessage.includes("connection refused")
  ) {
    return "连接被拒绝，请检查网关是否运行";
  }

  if (rawMessage.includes("WebSocket") && rawMessage.includes("close")) {
    return "连接已断开，正在尝试重连...";
  }

  // 未知错误，返回简化版本（去掉技术细节）
  if (rawMessage.length > 100) {
    return rawMessage.slice(0, 80) + "...";
  }

  return rawMessage;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const err = error as GatewayError;

  // 显式标记
  if (typeof err.retryable === "boolean") return err.retryable;

  // 从 code 判断
  const code = err.code ?? "";
  if (typeof code === "string" && code in ERROR_MESSAGES_MAP) {
    return ERROR_MESSAGES_MAP[code].retryable ?? false;
  }

  // 从消息判断
  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("connection") ||
    msg.includes("unavailable")
  );
}

/**
 * 获取建议的重试延迟（毫秒）
 */
export function getErrorRetryDelay(error: unknown): number {
  if (!error) return 5000;

  const err = error as GatewayError;
  const msg = (err.message ?? "").toLowerCase();

  if (msg.includes("rate limit") || msg.includes("429")) {
    return 30_000; // 限流：30 秒
  }

  if (msg.includes("timeout")) {
    return 10_000; // 超时：10 秒
  }

  return 5000; // 默认：5 秒
}
