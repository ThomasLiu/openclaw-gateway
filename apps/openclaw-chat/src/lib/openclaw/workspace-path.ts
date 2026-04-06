/**
 * workspace-path.ts
 * 工作区路径解析与安全校验工具
 *
 * 路径安全规则：
 * - safeWorkspaceRelativePath: 仅允许不含 .. 和 . 的 POSIX 相对路径，解析结果必须在 workspaceDir 之下
 * - safeWorkspaceFilePath: 单层 basename 白名单（WORKSPACE_MARKDOWN_BASENAMES 等）
 * - assertWorkspaceTargetSafe: 对已有路径做 realpath 校验，防止符号链接逃逸
 */

import "server-only";

import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { readOpenClawJson } from "./config";

/** 白名单文件名（与上游 WORKSPACE_MARKDOWN_BASENAMES 一致） */
export const WORKSPACE_MARKDOWN_BASENAMES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
  "memory.md",
] as const;

/** 类型别名 */
export type WhitelistedBasename = (typeof WORKSPACE_MARKDOWN_BASENAMES)[number];

// ─── State dir ─────────────────────────────────────────────────────────────

/**
 * 获取 OpenClaw state 目录
 * 优先级：OPENCLAW_STATE_DIR > ~/.openclaw
 */
export function resolveOpenClawStateDir(
  env: Record<string, string | undefined> = process.env
): string {
  const override = env.OPENCLAW_STATE_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), ".openclaw");
}

// ─── Default workspace dir ─────────────────────────────────────────────────

/**
 * 获取默认工作区目录
 * 优先级：OPENCLAW_WORKSPACE_DIR > ~/.openclaw/workspace
 */
export function resolveDefaultWorkspaceDir(
  env: Record<string, string | undefined> = process.env
): string {
  const override = env.OPENCLAW_WORKSPACE_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), ".openclaw", "workspace");
}

// ─── Agent workspace dir ───────────────────────────────────────────────────

/**
 * 解析 Agent 的工作区目录
 *
 * 逻辑（与上游 resolveAgentWorkspaceDir 对齐）：
 * 1. 若配置了 agents.list[].workspace，使用该路径
 * 2. 若为默认 Agent，使用 agents.defaults.workspace 或 ~/.openclaw/workspace
 * 3. 若为非默认 Agent，使用 agents.defaults.workspace/<agentId> 或 ~/.openclaw/workspace-<agentId>
 */
export async function resolveAgentWorkspaceDir(
  agentId: string
): Promise<string> {
  const normalizedId = normalizeAgentId(agentId);
  const config = readOpenClawJson();

  if (config) {
    const agents = (config.agents as { list?: Array<{ id?: string; workspace?: string }> } | undefined)?.list ?? [];
    const entry = agents.find((a) => normalizeAgentId(a.id ?? "") === normalizedId);

    if (entry?.workspace?.trim()) {
      return path.resolve(entry.workspace.trim());
    }

    // 检查默认 workspace
    const defaults = (config.agents as { defaults?: { workspace?: string } } | undefined)?.defaults;
    const defaultWs = defaults?.workspace?.trim();

    if (normalizedId === "main" || normalizedId === "default") {
      if (defaultWs) {
        return path.resolve(defaultWs);
      }
      return path.join(resolveOpenClawStateDir(), "workspace");
    }

    // 非默认 agent
    if (defaultWs) {
      return path.resolve(path.join(defaultWs, normalizedId));
    }
    return path.join(resolveOpenClawStateDir(), `workspace-${normalizedId}`);
  }

  // 无配置文件：使用默认路径
  if (normalizedId === "main" || normalizedId === "default") {
    return path.join(resolveOpenClawStateDir(), "workspace");
  }
  return path.join(resolveOpenClawStateDir(), `workspace-${normalizedId}`);
}

// ─── Agent dir ─────────────────────────────────────────────────────────────

/**
 * 解析 Agent 的私有目录（agent-dir）
 * 格式：~/.openclaw/agents/<agentId>/agent
 */
export async function resolveAgentDir(agentId: string): Promise<string> {
  const normalizedId = normalizeAgentId(agentId);
  return path.join(resolveOpenClawStateDir(), "agents", normalizedId, "agent");
}

// ─── Path normalization ────────────────────────────────────────────────────

/**
 * 去除路径中的 null 字节（防止 ENOTDIR 错误）
 */
function stripNullBytes(s: string): string {
  return s.replace(/\0/g, "");
}

/**
 * 规范化 agent ID（小写、去空格）
 */
export function normalizeAgentId(id: string): string {
  return id.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * 验证相对路径不包含 .. 或 . 段，并解析后在工作区根之下
 * @param workspaceDir 工作区根目录
 * @param rel 相对路径（POSIX 格式）
 * @returns 解析后的绝对路径（必定在 workspaceDir 之下）
 * @throws 若路径非法
 */
export function safeWorkspaceRelativePath(
  workspaceDir: string,
  rel: string
): string {
  // 去除 null 字节
  const cleanedRel = stripNullBytes(rel);

  // 禁止空路径
  if (!cleanedRel) {
    throw new Error("Relative path cannot be empty");
  }

  // 验证不含 .. 和 . 段（逐段检查）
  const segments = cleanedRel.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "." || seg === "..") {
      throw new Error(`Invalid path segment in '${rel}': '${seg}'`);
    }
  }

  // 禁止以 / 开头（绝对路径）
  if (cleanedRel.startsWith("/")) {
    throw new Error(`Absolute paths are not allowed: '${rel}'`);
  }

  // 禁止 .. 相对路径（防止 escape）
  if (cleanedRel.includes("..")) {
    throw new Error(`Parent-directory references are not allowed: '${rel}'`);
  }

  // 解析并验证结果在工作区之下
  const resolved = path.resolve(workspaceDir, cleanedRel);
  const relative = path.relative(workspaceDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Resolved path '${resolved}' escapes workspace '${workspaceDir}'`
    );
  }

  return resolved;
}

/**
 * 验证单层文件名（basename）在白名单内
 * @param workspaceDir 工作区根目录
 * @param filename 文件名（不含路径）
 * @returns 完整文件路径
 * @throws 若文件名不在白名单
 */
export function safeWorkspaceFilePath(
  workspaceDir: string,
  filename: string
): string {
  const cleaned = stripNullBytes(filename.trim());
  const basename = path.basename(cleaned);

  if (basename !== cleaned || !cleaned) {
    throw new Error(
      `Path traversal detected or empty filename: '${filename}'`
    );
  }

  if (
    !WORKSPACE_MARKDOWN_BASENAMES.includes(basename as WhitelistedBasename)
  ) {
    throw new Error(
      `Filename '${basename}' is not in the allowed list: [${WORKSPACE_MARKDOWN_BASENAMES.join(", ")}]`
    );
  }

  return path.join(workspaceDir, cleaned);
}

/**
 * 验证目标路径在工作区之下（使用 realpath 解析符号链接后校验）
 * 用于 PUT 写入前的安全校验
 * @param workspaceDir 工作区根目录
 * @param targetPath 目标文件路径（绝对或相对）
 * @throws 若路径逃逸工作区
 */
export async function assertWorkspaceTargetSafe(
  workspaceDir: string,
  targetPath: string
): Promise<void> {
  let resolved: string;
  try {
    resolved = await fs.realpath(targetPath);
  } catch (err) {
    // 文件不存在时，允许继续（写入时会在后文校验 workspace 内）
    const code = (err as { code?: string }).code;
    if (code === "ENOENT") {
      // 对于不存在的文件，至少确保父目录在工作区内
      const parent = path.dirname(path.resolve(targetPath));
      const relative = path.relative(workspaceDir, parent);
      if (relative.startsWith("..")) {
        throw new Error(
          `Parent directory of '${targetPath}' escapes workspace '${workspaceDir}'`
        );
      }
      return;
    }
    throw err;
  }

  const relative = path.relative(workspaceDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Resolved path '${resolved}' escapes workspace '${workspaceDir}'`
    );
  }
}
