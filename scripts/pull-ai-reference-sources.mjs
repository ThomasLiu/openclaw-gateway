#!/usr/bin/env node
/**
 * scripts/pull-ai-reference-sources.mjs
 *
 * 读取 ai-reference-sources.manifest.json，对每个条目执行 git clone 或 git pull。
 * 目标目录：ai-reference-sources/<name>
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const ROOT_DIR = join(SCRIPT_DIR, "..");
const MANIFEST_PATH = join(ROOT_DIR, "ai-reference-sources.manifest.json");
const REFERENCE_DIR = join(ROOT_DIR, "ai-reference-sources");

function runGit(repoDir, remoteUrl, name) {
  const exists = existsSync(join(repoDir, ".git"));

  if (exists) {
    // git pull
    try {
      console.log(`📥 更新 ${name}...`);
      execSync("git pull --ff origin", {
        cwd: repoDir,
        stdio: "pipe",
        timeout: 60_000,
      });
      console.log(`  ✅ ${name} 已更新`);
    } catch {
      console.warn(`  ⚠️  ${name} 更新失败（忽略）`);
    }
  } else {
    // git clone
    try {
      console.log(`📥 克隆 ${name}...`);
      execSync(`git clone --depth 1 "${remoteUrl}" "${repoDir}"`, {
        stdio: "pipe",
        timeout: 120_000,
      });
      console.log(`  ✅ ${name} 已克隆`);
    } catch {
      console.warn(`  ⚠️  ${name} 克隆失败（忽略）: ${remoteUrl}`);
    }
  }
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  } catch {
    console.error("❌ 无法加载 ai-reference-sources.manifest.json");
    console.error("   请先运行: node scripts/generate-ai-reference-sources-manifest.mjs");
    process.exit(1);
  }

  if (!existsSync(REFERENCE_DIR)) {
    mkdirSync(REFERENCE_DIR, { recursive: true });
  }

  const repos = manifest.repositories ?? [];

  if (repos.length === 0) {
    console.log("✅ manifest 中没有仓库条目");
    return;
  }

  console.log(`📚 开始拉取 ${repos.length} 个参考源码仓库...\n`);

  for (const repo of repos) {
    const { name, remoteUrl } = repo;
    if (!remoteUrl) {
      console.warn(`  ⚠️  ${name}: 没有 remote URL，跳过`);
      continue;
    }

    const repoDir = join(REFERENCE_DIR, name);
    runGit(repoDir, remoteUrl, name);
  }

  console.log("\n✅ 完成");
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
