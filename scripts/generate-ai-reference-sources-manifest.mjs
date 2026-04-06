#!/usr/bin/env node
/**
 * scripts/generate-ai-reference-sources-manifest.mjs
 *
 * 扫描 ai-reference-sources/ 子目录，读取各子仓库的 .git/config
 * 获取 remote URL，并写入 ai-reference-sources.manifest.json。
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const ROOT_DIR = join(SCRIPT_DIR, "..");
const MANIFEST_PATH = join(ROOT_DIR, "ai-reference-sources.manifest.json");
const REFERENCE_DIR = join(ROOT_DIR, "ai-reference-sources");

async function getGitRemoteUrl(repoDir) {
  try {
    const configPath = join(repoDir, ".git", "config");
    if (!existsSync(configPath)) return null;

    const content = readFileSync(configPath, "utf-8");

    // 提取第一个 remote 的 url
    const match = content.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/i);
    if (match) {
      return match[1].trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  let entries;
  try {
    entries = readdirSync(REFERENCE_DIR, { withFileTypes: true });
  } catch {
    console.error("❌ 无法读取 ai-reference-sources/ 目录");
    process.exit(1);
  }

  const repos = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const repoDir = join(REFERENCE_DIR, entry.name);
    const remoteUrl = await getGitRemoteUrl(repoDir);

    repos.push({
      name: entry.name,
      path: `ai-reference-sources/${entry.name}`,
      remoteUrl: remoteUrl ?? null,
    });
  }

  const manifest = {
    version: "1.0.0",
    description: "AI 参考源码清单 - 记录 ai-reference-sources/ 中各子仓库的来源",
    repositories: repos,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`✅ 已生成 ${MANIFEST_PATH}`);
  console.log(`   包含 ${repos.length} 个仓库`);
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
