#!/usr/bin/env node
/**
 * scripts/openclaw-drift.mjs
 *
 * 检测上游 OpenClaw 源码变更，输出对应的本仓库集成点。
 *
 * 用法：
 *   node scripts/openclaw-drift.mjs
 *   node scripts/openclaw-drift.mjs --range 'HEAD~5..HEAD'
 *   node scripts/openclaw-drift.mjs --upstream-root /path/to/openclaw
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const ROOT_DIR = join(SCRIPT_DIR, "..");

// ─── CLI 参数解析 ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let upstreamRoot = process.env.OPENCLAW_SRC ?? join(ROOT_DIR, "ai-reference-sources", "openclaw");
let commitRange = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--range" && i + 1 < args.length) {
    commitRange = args[++i];
  } else if (args[i] === "--upstream-root" && i + 1 < args.length) {
    upstreamRoot = args[++i];
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`用法: node scripts/openclaw-drift.mjs [选项]
选项:
  --range <range>     Git commit 范围（默认: HEAD~10..HEAD）
  --upstream-root <dir>  上游源码根目录（默认: OPENCLAW_SRC 或 ai-reference-sources/openclaw）
  -h, --help          显示帮助
`);
    process.exit(0);
  }
}

if (!commitRange) {
  // 默认取最近 10 个 commit
  commitRange = "HEAD~10..HEAD";
}

// ─── 加载 manifest ──────────────────────────────────────────────────────────

let manifest;
try {
  const manifestPath = join(ROOT_DIR, "openclaw-integration.manifest.json");
  manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
} catch {
  console.error("❌ 无法加载 openclaw-integration.manifest.json");
  process.exit(1);
}

const watchMap = new Map<string, string[]>();
for (const entry of manifest.watch ?? []) {
  watchMap.set(entry.path, entry.integrates ?? []);
}

const normalizedUpstreamRoot = upstreamRoot.replace(/\/$/, "");

// ─── 获取变更文件 ────────────────────────────────────────────────────────────

let changedFiles: string[];
try {
  const output = execSync(`git diff ${commitRange} --name-only`, {
    cwd: normalizedUpstreamRoot,
    encoding: "utf-8",
  });
  changedFiles = output.trim().split("\n").filter(Boolean);
} catch {
  console.error(`❌ 无法获取 git diff（upstream root: ${normalizedUpstreamRoot}）`);
  console.error("请确保 OPENCLAW_SRC 指向有效的 OpenClaw 源码目录");
  process.exit(1);
}

if (changedFiles.length === 0) {
  console.log("✅ 在指定范围内没有上游源码变更");
  process.exit(0);
}

// ─── 匹配集成点 ──────────────────────────────────────────────────────────────

const matchedIntegrations = new Map<string, string[]>();

for (const changedFile of changedFiles) {
  const integrations = watchMap.get(changedFile);
  if (integrations) {
    matchedIntegrations.set(changedFile, integrations);
  }
}

// ─── 输出报告 ────────────────────────────────────────────────────────────────

console.log(`\n🔍 OpenClaw Drift 检测报告`);
console.log(`上游目录: ${normalizedUpstreamRoot}`);
console.log(`Commit 范围: ${commitRange}`);
console.log(`变更文件数: ${changedFiles.length}`);
console.log(`\n${"─".repeat(70)}`);

if (matchedIntegrations.size === 0) {
  console.log("\n✅ 没有检测到与本仓库集成点相关的变更");
} else {
  console.log(`\n⚠️  检测到 ${matchedIntegrations.size} 个上游变更涉及本仓库集成点：\n`);

  for (const [upstreamFile, integrations] of matchedIntegrations) {
    const relPath = relative(normalizedUpstreamRoot, join(normalizedUpstreamRoot, upstreamFile));
    console.log(`📄 ${relPath}`);
    for (const integrate of integrations) {
      console.log(`   → ${integrate}`);
    }
    console.log("");
  }

  console.log("请 review 以上集成点，确保与上游变更保持一致。");
}

console.log(`\n${"─".repeat(70)}`);
console.log(`\n💡 运行以下命令查看完整 diff:`);
console.log(`   cd ${normalizedUpstreamRoot}`);
console.log(`   git diff ${commitRange}`);
