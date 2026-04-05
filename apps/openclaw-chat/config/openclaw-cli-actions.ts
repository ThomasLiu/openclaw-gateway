/**
 * OpenClaw CLI 白名单配置
 *
 * 定义允许通过 /api/openclaw/cli-exec 执行的 CLI 子命令
 * 安全关键：禁止任意 shell 命令
 *
 * server-only
 */

/** 允许的 CLI action 白名单 */
export const ALLOWED_CLI_ACTIONS = new Set<string>([
  "agents",
  "agents list",
  "agents show",
  "status",
  "version",
  "health",
  "logs",
  "logs tail",
  "config",
  "config get",
  "config set",
  "config show",
  "models",
  "models list",
  "skills",
  "skills list",
  "skills status",
  "sessions",
  "sessions list",
  "sessions show",
  "update",
  "self-update",
]);

/**
 * 判断 action 是否在白名单中
 */
export function isOpenClawCliExecAction(action: string): boolean {
  if (!action || typeof action !== "string") return false;
  const normalized = action.trim().toLowerCase();
  return ALLOWED_CLI_ACTIONS.has(normalized);
}

/**
 * 获取 CLI 可执行文件路径
 */
export function getOpenClawCliPath(): string {
  return process.env.OPENCLAW_CLI_PATH ?? "openclaw";
}

/**
 * 从 action 构造 CLI 参数数组
 */
export function getOpenClawCliExecArgv(
  action: string,
  args?: string[]
): string[] {
  const cliPath = getOpenClawCliPath();
  const parts = action.trim().split(/\s+/);
  const extraArgs = Array.isArray(args) ? args.filter((a) => typeof a === "string" && a.trim() !== "") : [];
  return [cliPath, ...parts, ...extraArgs];
}

/**
 * 获取已授权的 actions 列表（用于文档/调试）
 */
export function getAllowedCliActions(): string[] {
  return [...ALLOWED_CLI_ACTIONS];
}
