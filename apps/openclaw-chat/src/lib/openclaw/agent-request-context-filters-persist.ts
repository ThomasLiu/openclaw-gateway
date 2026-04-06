/**
 * agent-request-context-filters-persist.ts
 * 上下文过滤器持久化工具
 *
 * 从 agent-dir 读取/写入上下文过滤配置
 */

import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { resolveAgentDir } from "./workspace-path";

export type ContextFilterKind = "include" | "exclude";

export interface ContextFilter {
  type: ContextFilterKind;
  /** glob 模式数组 */
  patterns: string[];
  /** 可选描述 */
  description?: string;
}

export interface ContextFiltersConfig {
  version: 1;
  filters: ContextFilter[];
}

/** 上下文过滤器配置文件名 */
const CONTEXT_FILTERS_FILENAME = "context-filters.json";

/**
 * 从 agent-dir 加载上下文过滤配置
 *
 * @param agentId Agent ID
 * @returns 过滤器配置，若不存在则返回默认空配置
 */
export async function loadContextFilters(
  agentId: string
): Promise<ContextFiltersConfig> {
  const agentDir = await resolveAgentDir(agentId);
  const filtersPath = path.join(agentDir, CONTEXT_FILTERS_FILENAME);

  try {
    const content = await fs.readFile(filtersPath, "utf-8");
    return JSON.parse(content) as ContextFiltersConfig;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOENT") {
      // 文件不存在，返回默认空配置
      return { version: 1, filters: [] };
    }
    throw err;
  }
}

/**
 * 保存上下文过滤配置到 agent-dir
 *
 * @param agentId Agent ID
 * @param filters 过滤器配置
 */
export async function saveContextFilters(
  agentId: string,
  filters: ContextFiltersConfig
): Promise<void> {
  const agentDir = await resolveAgentDir(agentId);
  const filtersPath = path.join(agentDir, CONTEXT_FILTERS_FILENAME);

  // 确保目录存在
  await fs.mkdir(agentDir, { recursive: true });

  // 写入配置文件
  await fs.writeFile(
    filtersPath,
    JSON.stringify(filters, null, 2),
    "utf-8"
  );
}

/**
 * 将 JSONL 摘要按过滤器裁剪
 *
 * @param summary JSONL 摘要
 * @param filters 过滤器配置
 * @returns 是否应保留该条目
 */
export function shouldIncludeJsonlEntry(
  entry: Record<string, unknown>,
  filters: ContextFiltersConfig
): boolean {
  for (const filter of filters.filters) {
    const message = String(entry.message ?? entry.text ?? "");

    if (filter.type === "exclude") {
      for (const pattern of filter.patterns) {
        if (message.includes(pattern)) {
          return false;
        }
      }
    } else if (filter.type === "include") {
      // include 模式：至少匹配一个才保留
      let matched = false;
      for (const pattern of filter.patterns) {
        if (message.includes(pattern)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
  }

  return true;
}
