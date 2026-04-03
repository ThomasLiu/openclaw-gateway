#!/usr/bin/env node
/**
 * generate-ai-reference-sources-manifest.mjs
 *
 * Scans the upstream OpenClaw sources in ai-reference-sources/ and generates
 * (or updates) ai-reference-sources.manifest.json with the upstream root,
 * git remote URL, and a watch array derived from significant source files.
 *
 * Usage:
 *   node generate-ai-reference-sources-manifest.mjs
 *   node generate-ai-reference-sources-manifest.mjs --dry-run
 *
 * Environment:
 *   OPENCLAW_SRC   — override the upstream source directory
 *                    (default: ai-reference-sources/openclaw)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "ai-reference-sources.manifest.json");

// ─── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") return { dryRun: true };
  }
  return { dryRun: false };
}

// ─── Git helpers ───────────────────────────────────────────────────────────────

function gitRun(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    status: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

// ─── Source file discovery ────────────────────────────────────────────────────

/**
 * Return a map of significant source files in the upstream root.
 * Key = relative path from upstreamRoot, Value = full absolute path.
 *
 * Focuses on integration-relevant files: server-methods, agents, UI, config.
 */
function discoverSignificantFiles(upstreamRoot) {
  const SIGNIFICANT_PATTERNS = [
    // Gateway core
    /^src\/gateway\/server-methods\//,
    /^src\/gateway\/config\//,
    /^src\/gateway\/ws\//,
    /^src\/gateway\/cli\//,
    // Agents
    /^src\/agents\//,
    // Skills & MCP
    /^src\/skills\//,
    /^src\/mcp\//,
    // UI
    /^ui\/src\/ui\//,
  ];

  const files = new Map();

  function walk(dir, prefix = "") {
    if (!existsSync(dir)) return;
    try {
      const entries = require("fs").readdirSync(dir);
      for (const entry of entries) {
        if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
        const full = join(dir, entry);
        const rel = prefix ? `${prefix}/${entry}` : entry;
        const stat = require("fs").statSync(full);
        if (stat.isDirectory()) {
          walk(full, rel);
        } else if (stat.isFile() && /\.(ts|js|json)$/.test(entry)) {
          for (const pattern of SIGNIFICANT_PATTERNS) {
            if (pattern.test(rel)) {
              files.set(rel, full);
              break;
            }
          }
        }
      }
    } catch {
      // ignore permission errors
    }
  }

  walk(upstreamRoot);
  return files;
}

// ─── Integrates mapping ───────────────────────────────────────────────────────

/**
 * Map an upstream file path to local integration points in the openclaw-chat app.
 */
function mapToIntegrates(upstreamPath) {
  const map = {
    "src/gateway/server-methods/chat.ts": [
      "apps/openclaw-chat/src/lib/openclaw/client.ts",
      "apps/openclaw-chat/src/app/api/chat/route.ts",
    ],
    "src/gateway/server-methods/sessions.ts": [
      "apps/openclaw-chat/src/lib/openclaw/client.ts",
      "apps/openclaw-chat/src/app/api/gateway/sessions/route.ts",
    ],
    "src/gateway/server-methods/config.ts": [
      "apps/openclaw-chat/src/lib/openclaw/client.ts",
      "apps/openclaw-chat/src/app/api/openclaw/config/route.ts",
    ],
    "src/gateway/server-methods/exec-approval.ts": [
      "apps/openclaw-chat/src/lib/openclaw/client.ts",
      "apps/openclaw-chat/src/lib/openclaw/exec-approval-bridge.ts",
    ],
    "src/gateway/server-methods/plugin-approval.ts": [
      "apps/openclaw-chat/src/lib/openclaw/client.ts",
      "apps/openclaw-chat/src/lib/openclaw/exec-approval-bridge.ts",
    ],
    "src/gateway/server-methods/cron.ts": [
      "apps/openclaw-chat/src/app/api/openclaw/cron/route.ts",
      "apps/openclaw-chat/src/lib/openclaw/use-scheduled-cron-tasks.ts",
    ],
    "src/gateway/server-methods/mcp.ts": [
      "apps/openclaw-chat/src/app/api/openclaw/mcp-servers/route.ts",
      "apps/openclaw-chat/src/components/right-panel/McpServicesTabContent.tsx",
    ],
    "src/gateway/server-methods/skills.ts": [
      "apps/openclaw-chat/src/app/api/openclaw/skills/route.ts",
      "apps/openclaw-chat/src/components/right-panel/SkillsTabContent.tsx",
    ],
    "src/gateway/server-methods/models.ts": [
      "apps/openclaw-chat/src/app/api/openclaw/models/route.ts",
      "apps/openclaw-chat/src/components/right-panel/ModelManagementTabContent.tsx",
    ],
    "src/agents/agent-scope.ts": [
      "apps/openclaw-chat/src/lib/openclaw/workspace-path.ts",
    ],
    "ui/src/ui/chat/slash-commands.ts": [
      "apps/openclaw-chat/src/lib/slash-commands/composer-slash-registry.ts",
    ],
    "ui/src/ui/chat/composer.ts": [
      "apps/openclaw-chat/src/components/ChatPanel.tsx",
    ],
    "ui/src/ui/chat/message.ts": [
      "apps/openclaw-chat/src/components/ChatMarkdown.tsx",
    ],
  };

  return map[upstreamPath] ?? [];
}

// ─── Watch entry builder ──────────────────────────────────────────────────────

function buildWatchEntries(significantFiles) {
  const entries = [];

  for (const [relPath] of significantFiles) {
    const integrates = mapToIntegrates(relPath);
    if (integrates.length > 0 || true) {
      entries.push({
        path: relPath,
        integrates,
        discovered: true,
      });
    }
  }

  // Sort by path for consistent output
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

// ─── Git remote detection ─────────────────────────────────────────────────────

function detectGitRemote(upstreamRoot) {
  const { status, stdout } = gitRun(upstreamRoot, [
    "remote",
    "get-url",
    "origin",
  ]);
  if (status === 0 && stdout) return stdout;
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const upstreamRoot = process.env.OPENCLAW_SRC
    ? join(ROOT, process.env.OPENCLAW_SRC)
    : join(ROOT, "ai-reference-sources/openclaw");

  if (!existsSync(upstreamRoot)) {
    console.error(`error: upstream source directory not found: ${upstreamRoot}`);
    console.error("Hint: Run 'pnpm pull:ai-reference-sources' first.");
    process.exit(1);
  }

  if (!existsSync(join(upstreamRoot, ".git"))) {
    console.error(`error: upstream directory is not a git repository: ${upstreamRoot}`);
    process.exit(1);
  }

  console.log(`Scanning upstream sources in: ${upstreamRoot}`);

  // Load existing manifest for reference
  let existingManifest = null;
  if (existsSync(MANIFEST_PATH)) {
    try {
      existingManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
      console.log("Loaded existing manifest for reference.");
    } catch {
      // ignore parse errors
    }
  }

  // Discover significant files
  const significantFiles = discoverSignificantFiles(upstreamRoot);
  console.log(`Found ${significantFiles.size} significant source file(s).`);

  // Build watch entries
  const watchEntries = buildWatchEntries(significantFiles);
  console.log(`Generated ${watchEntries.length} watch entry/entries.`);

  // Detect git remote
  const remoteUrl = detectGitRemote(upstreamRoot);
  if (remoteUrl) {
    console.log(`Git remote: ${remoteUrl}`);
  }

  // Build new manifest
  const newManifest = {
    upstreamRoot: relative(ROOT, upstreamRoot).replace(/\\/g, "/"),
    upstreamRemote: remoteUrl,
    watch: watchEntries,
    generatedAt: new Date().toISOString(),
    generatedBy: "generate-ai-reference-sources-manifest.mjs",
    ...(existingManifest?.version ? { version: existingManifest.version } : {}),
  };

  const manifestJson = JSON.stringify(newManifest, null, 2) + "\n";

  if (dryRun) {
    console.log("\n[DRY RUN] Would write the following manifest:\n");
    console.log(manifestJson);
  } else {
    writeFileSync(MANIFEST_PATH, manifestJson, "utf-8");
    console.log(`\nManifest written to: ${MANIFEST_PATH}`);

    // Also update openclaw-integration.manifest.json if it exists
    const integrationManifestPath = join(ROOT, "openclaw-integration.manifest.json");
    if (existsSync(integrationManifestPath)) {
      try {
        const integrationManifest = JSON.parse(
          readFileSync(integrationManifestPath, "utf-8")
        );
        // Preserve upstreamRoot and add watch entries
        const updatedIntegration = {
          ...integrationManifest,
          watch: watchEntries.filter((w) => w.integrates.length > 0),
          updatedAt: new Date().toISOString(),
        };
        writeFileSync(
          integrationManifestPath,
          JSON.stringify(updatedIntegration, null, 2) + "\n",
          "utf-8"
        );
        console.log(`Also updated: ${integrationManifestPath}`);
      } catch {
        // ignore errors on integration manifest
      }
    }
  }

  console.log(`\nDone. ${dryRun ? "(dry run — no files written)" : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
