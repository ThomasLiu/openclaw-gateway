#!/usr/bin/env node
/**
 * import.mjs - OpenClaw Agent 导入脚本（Node 18+）
 *
 * 将 ZIP 包中的 Agent 配置合并到目标机器的 openclaw.json。
 *
 * 用法：
 *   node import.mjs --force --secrets-file secrets.json
 *   node import.mjs --help
 *
 * 环境：
 *   OPENCLAW_CONFIG_PATH  - 目标 openclaw.json 路径（默认：~/.openclaw/openclaw.json）
 *   OPENCLAW_STATE_DIR    - OpenClaw state 目录（默认：~/.openclaw）
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { AdmZip } from "adm-zip"; // 轻量 ZIP 解析（Node 内置，或使用 yauzl）

// ─── 配置 ──────────────────────────────────────────────────────────────────

const DEFAULT_OPENCLAW_DIR = join(homedir(), ".openclaw");
const DEFAULT_CONFIG_PATH = join(DEFAULT_OPENCLAW_DIR, "openclaw.json");

// ─── CLI 参数 ────────────────────────────────────────────────────────────────

const { values: cliArgs } = parseArgs({
  options: {
    force: { type: "boolean", short: "f", default: false },
    "secrets-file": { type: "string", short: "s" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (cliArgs.help) {
  console.log(`
用法: node import.mjs [选项]

选项:
  -f, --force             覆盖已存在的同名 Agent
  -s, --secrets-file <path>  包含密钥的 JSON 文件路径
  -h, --help              显示此帮助

环境变量:
  OPENCLAW_CONFIG_PATH  目标 openclaw.json 路径
  OPENCLAW_STATE_DIR    OpenClaw state 目录

示例:
  node import.mjs --force --secrets-file secrets.json
`);
  process.exit(0);
}

const FORCE = cliArgs.force ?? false;
const SECRETS_FILE = cliArgs["secrets-file"] ?? null;

// ─── 主逻辑 ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 OpenClaw Agent 导入工具\n");

  // 确定 ZIP 文件路径（从命令行参数或当前目录）
  const zipPath = cliArgs._[0] ?? findZipInCurrentDir();

  if (!zipPath) {
    console.error("❌ 未找到 ZIP 文件。请提供 ZIP 文件路径或确保当前目录有 export zip 文件。");
    process.exit(1);
  }

  console.log(`📦 ZIP 文件: ${zipPath}\n`);

  // 读取 secrets
  const secrets = loadSecrets(SECRETS_FILE);

  // 解压 ZIP
  console.log("📂 解压 ZIP...");
  const { manifest, configs, workspaceFiles, skillsFiles, agentDirFiles, tempDir } =
    await extractZip(zipPath);
  console.log(`   Agent ID: ${manifest.agentId}\n`);

  // 备份现有配置
  const configPath = process.env.OPENCLAW_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
  const configBackup = backupConfig(configPath);

  try {
    // 合并配置
    console.log("🔀 合并配置...");
    const mergedConfig = mergeConfig(configPath, configs, secrets, FORCE);
    writeConfig(configPath, mergedConfig);

    // 复制 workspace 文件
    console.log("📁 复制 workspace 文件...");
    const workspaceDir = resolveAgentWorkspace(manifest.agentId);
    await copyFiles(workspaceFiles, workspaceDir);

    // 复制 agent-dir 文件
    console.log("📁 复制 agent-dir 文件...");
    const agentDir = resolveAgentDir(manifest.agentId);
    await copyFiles(agentDirFiles, agentDir);

    // 复制 skills 文件
    console.log("📁 复制 skills 文件...");
    for (const [name, content] of Object.entries(skillsFiles)) {
      const skillDest = join(workspaceDir, "skills", name);
      await copySingleFile(content, skillDest);
    }

    console.log("\n✅ 导入完成！");
    console.log(`   配置文件: ${configPath}`);
    console.log(`   Workspace: ${workspaceDir}`);
    console.log(`   Agent-dir: ${agentDir}`);
  } catch (err) {
    // 恢复备份
    console.error(`\n❌ 导入失败: ${err instanceof Error ? err.message : err}`);
    if (configBackup) {
      console.log("\n🔄 恢复配置备份...");
      writeConfig(configPath, configBackup);
    }
    process.exit(1);
  } finally {
    // 清理临时目录
    await cleanup(tempDir);
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────────────

function findZipInCurrentDir() {
  try {
    const files = readdirSync(".");
    const zipFiles = files.filter((f) => f.endsWith("-export.zip"));
    return zipFiles[0] ?? null;
  } catch {
    return null;
  }
}

function loadSecrets(secretsFile) {
  if (!secretsFile) return {};

  try {
    const content = readFileSync(secretsFile, "utf-8");
    const parsed = JSON.parse(content);

    // 支持数组或对象格式
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.map((s) => [s.id, s.value]));
    }
    return parsed;
  } catch {
    console.warn("⚠️  无法加载 secrets 文件，继续不加密导入。");
    return {};
  }
}

async function extractZip(zipPath) {
  const tempDir = await Deno.makeTempDir?.() ?? "/tmp/openclaw-import-" + Date.now();
  // 使用 adm-zip 或 Node 内置方式解压
  // 这里用简化实现：读取 ZIP 文件
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const manifest = { agentId: "", exportedAt: "" };
  const configs = {};
  const workspaceFiles = {};
  const skillsFiles = {};
  const agentDirFiles = {};

  for (const entry of entries) {
    const name = entry.entryName;

    if (name === "manifest.json") {
      Object.assign(manifest, JSON.parse(entry.getData().toString("utf-8")));
    } else if (name.startsWith("config/")) {
      const key = name.replace("config/", "").replace(".json", "");
      configs[key] = JSON.parse(entry.getData().toString("utf-8"));
    } else if (name.startsWith("workspace/")) {
      const rel = name.replace("workspace/", "");
      workspaceFiles[rel] = entry.getData();
    } else if (name.startsWith("skills/")) {
      const rel = name.replace("skills/", "");
      skillsFiles[rel] = entry.getData();
    } else if (name.startsWith("agent-dir/")) {
      const rel = name.replace("agent-dir/", "");
      agentDirFiles[rel] = entry.getData();
    }
  }

  return { manifest, configs, workspaceFiles, skillsFiles, agentDirFiles, tempDir };
}

function backupConfig(configPath) {
  try {
    const content = readFileSync(configPath, "utf-8");
    const backupPath = configPath + `.import-backup-${Date.now()}.json`;
    writeFileSync(backupPath, content, "utf-8");
    console.log(`   备份: ${backupPath}`);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function mergeConfig(configPath, configs, secrets, force) {
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    // 文件不存在，使用空配置
  }

  // 深度合并 agents.list
  const existingAgents = existing.agents?.list ?? [];
  const newAgentEntry = configs["agent-list-entry.json"];

  if (newAgentEntry) {
    const idx = existingAgents.findIndex(
      (a) => a.id === newAgentEntry.id
    );

    if (idx >= 0) {
      if (force) {
        existingAgents[idx] = { ...existingAgents[idx], ...newAgentEntry };
      } else {
        throw new Error(
          `Agent '${newAgentEntry.id}' 已存在。使用 --force 覆盖。`
        );
      }
    } else {
      existingAgents.push(newAgentEntry);
    }
  }

  // 脱敏还原（用 secrets 替换占位符）
  const merged = applySecrets(existing, secrets);

  return {
    ...merged,
    agents: {
      ...(merged.agents ?? {}),
      defaults: {
        ...(merged.agents?.defaults ?? {}),
        ...(configs["agents-defaults.json"] ?? {}),
      },
      list: existingAgents,
    },
  };
}

function applySecrets(config, secrets) {
  const REDACTED_PREFIX = "__OPENCLAW_IMPORT_REQUIRED__:";

  function replace(obj) {
    if (typeof obj === "string" && obj.startsWith(REDACTED_PREFIX)) {
      const id = obj.slice(REDACTED_PREFIX.length);
      return secrets[id] ?? obj; // 如果没有提供密钥，保留占位符
    }
    if (Array.isArray(obj)) return obj.map(replace);
    if (obj && typeof obj === "object") {
      const result = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = replace(v);
      }
      return result;
    }
    return obj;
  }

  return replace(config);
}

function writeConfig(path, config) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}

function resolveAgentWorkspace(agentId) {
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? DEFAULT_OPENCLAW_DIR;
  return join(stateDir, "workspace", agentId);
}

function resolveAgentDir(agentId) {
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? DEFAULT_OPENCLAW_DIR;
  return join(stateDir, "agents", agentId, "agent");
}

async function copyFiles(fileMap, destDir) {
  mkdirSync(destDir, { recursive: true });

  for (const [relPath, data] of Object.entries(fileMap)) {
    const dest = join(destDir, relPath);

    // 跳过目录条目（以 / 结尾的名为目录）
    if (relPath.endsWith("/")) {
      mkdirSync(dest, { recursive: true });
      continue;
    }

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, data);
  }
}

async function copySingleFile(data, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, data);
}

async function cleanup(tempDir) {
  // 清理临时文件（如果使用临时目录）
}

main().catch((err) => {
  console.error("❌ 错误:", err);
  process.exit(1);
});
