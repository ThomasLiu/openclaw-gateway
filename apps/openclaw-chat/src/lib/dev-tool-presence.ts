/**
 * 开发工具存在探测
 *
 * 使用 child_process.spawn 执行 'which' 命令检测工具是否存在
 *
 * server-only
 */

import { spawn } from "child_process";

export type ToolPresence = {
  name: string;
  found: boolean;
  path?: string;
  version?: string;
};

// 常用开发工具列表
export const COMMON_DEV_TOOLS = [
  "node",
  "npm",
  "pnpm",
  "yarn",
  "git",
  "python",
  "python3",
  "pip",
  "pip3",
  "docker",
  "go",
  "rustc",
  "cargo",
] as const;

// 内存缓存：相同工具不重复 spawn
const presenceCache = new Map<string, { result: ToolPresence; ts: number }>();
const CACHE_TTL_MS = 10_000; // 10 秒缓存

/**
 * 检测单个工具是否存在
 *
 * @param toolName 工具名称
 * @param useCache 是否使用缓存（默认 true）
 */
export function checkDevToolPresence(
  toolName: string,
  useCache = true
): Promise<ToolPresence> {
  // 检查缓存
  if (useCache) {
    const cached = presenceCache.get(toolName);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return Promise.resolve(cached.result);
    }
  }

  return new Promise((resolve) => {
    const proc = spawn("which", [toolName], {
      timeout: 5000,
    });

    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", () => {
      const result: ToolPresence = { name: toolName, found: false };
      if (useCache) {
        presenceCache.set(toolName, { result, ts: Date.now() });
      }
      resolve(result);
    });

    proc.on("close", (code) => {
      const path = output.trim();
      const found = code === 0 && path.length > 0 && !path.includes("not found");

      const result: ToolPresence = {
        name: toolName,
        found,
        ...(found ? { path } : {}),
      };

      if (useCache) {
        presenceCache.set(toolName, { result, ts: Date.now() });
      }
      resolve(result);
    });

    // 超时保护
    setTimeout(() => {
      proc.kill();
      const result: ToolPresence = { name: toolName, found: false };
      if (useCache) {
        presenceCache.set(toolName, { result, ts: Date.now() });
      }
      resolve(result);
    }, 5000);
  });
}

/**
 * 检测所有常用开发工具
 */
export async function checkAllDevTools(): Promise<ToolPresence[]> {
  const results = await Promise.all(
    COMMON_DEV_TOOLS.map((tool) => checkDevToolPresence(tool))
  );
  return results;
}

/**
 * 检测指定工具（来自 query 参数）
 */
export async function checkDevTools(
  toolNames?: string | string[]
): Promise<ToolPresence[]> {
  if (!toolNames) {
    return checkAllDevTools();
  }

  const names = Array.isArray(toolNames) ? toolNames : [toolNames];
  return Promise.all(names.map((name) => checkDevToolPresence(name)));
}

/**
 * 清除工具存在性缓存
 */
export function clearDevToolPresenceCache(): void {
  presenceCache.clear();
}
