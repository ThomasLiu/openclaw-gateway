/**
 * workspace-explore.ts
 * 工作区目录树列举工具
 */

import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

export type WorkspaceTreeNode =
  | {
      type: "file";
      name: string;
      relPath: string;
      size: number;
    }
  | {
      type: "dir";
      name: string;
      relPath: string;
      children: WorkspaceTreeNode[];
    };

/** 跳过列表：常见不需要列举的目录 */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  ".svn",
  ".hg",
  "dist",
  "build",
  "coverage",
]);

/** 单目录最大项数限制 */
const MAX_ITEMS_PER_DIR = 500;

const MAX_TREE_DEPTH_DEFAULT = 10;
const MAX_TREE_DEPTH_LIMIT = 20;

/**
 * 列举工作区目录树
 *
 * @param workspaceDir 工作区根目录
 * @param maxDepth 最大深度（默认 10，上限 20）
 */
export async function listWorkspaceTree(
  workspaceDir: string,
  maxDepth: number = MAX_TREE_DEPTH_DEFAULT
): Promise<WorkspaceTreeNode[]> {
  const effectiveDepth = Math.min(
    Math.max(1, maxDepth),
    MAX_TREE_DEPTH_LIMIT
  );

  return buildTree(workspaceDir, workspaceDir, 1, effectiveDepth);
}

async function buildTree(
  rootDir: string,
  currentDir: string,
  currentDepth: number,
  maxDepth: number
): Promise<WorkspaceTreeNode[]> {
  if (currentDepth > maxDepth) {
    return [];
  }

  let entries: Dirent[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (err) {
    // 权限错误或其他错误：静默返回空
    return [];
  }

  // 限制单目录项数
  if (entries.length > MAX_ITEMS_PER_DIR) {
    entries = entries.slice(0, MAX_ITEMS_PER_DIR);
  }

  const nodes: WorkspaceTreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    // 计算相对路径
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const children = await buildTree(
        rootDir,
        fullPath,
        currentDepth + 1,
        maxDepth
      );

      nodes.push({
        type: "dir",
        name: entry.name,
        relPath,
        children,
      });
    } else if (entry.isFile()) {
      let size = 0;
      try {
        const stat = await fs.stat(fullPath);
        size = stat.size;
      } catch {
        // 忽略 stat 错误
      }

      nodes.push({
        type: "file",
        name: entry.name,
        relPath,
        size,
      });
    }
  }

  // 按名称排序：目录在前，文件在后
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
