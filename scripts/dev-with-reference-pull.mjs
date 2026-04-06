#!/usr/bin/env node
/**
 * scripts/dev-with-reference-pull.mjs
 *
 * 后台异步拉取参考源码（不阻塞），前台启动 openclaw-chat dev。
 */

import { spawn } from "node:child_process";
import { join } from "node:path";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const ROOT_DIR = join(SCRIPT_DIR, "..");

// ─── 后台拉取参考源码 ────────────────────────────────────────────────────────

console.log("📥 正在后台拉取 AI 参考源码...\n");

const pullProcess = spawn("node", ["scripts/pull-ai-reference-sources.mjs"], {
  cwd: ROOT_DIR,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

pullProcess.stdout?.on("data", (chunk) => {
  process.stdout.write(`  [pull] ${chunk}`);
});

pullProcess.stderr?.on("data", (chunk) => {
  process.stderr.write(`  [pull] ${chunk}`);
});

pullProcess.on("exit", (code) => {
  if (code === 0) {
    console.log("\n✅ 参考源码拉取完成\n");
  } else {
    console.warn(`\n⚠️ 参考源码拉取退出（code: ${code}），继续启动 dev...\n`);
  }
});

// ─── 前台启动 dev ────────────────────────────────────────────────────────────

setTimeout(() => {
  console.log("🚀 启动 openclaw-chat dev server...\n");

  const devProcess = spawn(
    "pnpm",
    ["--filter", "openclaw-chat", "dev"],
    {
      cwd: ROOT_DIR,
      stdio: "inherit",
    }
  );

  devProcess.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}, 500); // 短暂延迟确保 pull 进程已启动
