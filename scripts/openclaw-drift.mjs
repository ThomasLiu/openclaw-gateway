#!/usr/bin/env node
/**
 * openclaw-drift.mjs
 *
 * Detects drift between upstream OpenClaw sources and local integrations.
 * Reads openclaw-integration.manifest.json and uses git to compare changes.
 *
 * Usage:
 *   node openclaw-drift.mjs                       # show uncommitted changes
 *   node openclaw-drift.mjs -- --range '<old>..<new>'   # show diff for commit range
 *   node openclaw-drift.mjs -- --status            # explicit status mode
 *
 * Environment:
 *   OPENCLAW_SRC  — override upstreamRoot from manifest
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INTEGRATION_MANIFEST = join(ROOT, "openclaw-integration.manifest.json");

// ─── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = { mode: "status", range: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--range" || arg === "-r") {
      // Next arg should be the range, strip surrounding quotes if present
      const raw = argv[i + 1];
      if (raw === undefined) {
        console.error("error: --range requires a value");
        process.exit(1);
      }
      result.mode = "range";
      result.range = raw.replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
      i++;
    } else if (arg.startsWith("--range=") || arg.startsWith("-r=")) {
      result.mode = "range";
      result.range = arg.slice(arg.indexOf("=") + 1).replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
    } else if (arg === "--status" || arg === "-s") {
      result.mode = "status";
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

function printHelp() {
  console.log(`openclaw-drift.mjs — upstream drift detection

Usage:
  node openclaw-drift.mjs [options]

Modes (mutually exclusive, status is default):
  --status, -s         Show uncommitted (dirty) upstream changes (default)
  --range <spec>, -r <spec>
                        Show diff for a commit range, e.g. 'v1.0..v2.0'

Options:
  --help, -h            Show this help message

Environment:
  OPENCLAW_SRC         Override upstreamRoot from manifest.json

Examples:
  # Show uncommitted changes
  node openclaw-drift.mjs

  # Show diff between two tags
  node openclaw-drift.mjs -- --range 'v1.0..v2.0'

  # Show diff between commits
  node openclaw-drift.mjs -- --range 'abc123..def456'
`);
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

function loadManifest() {
  if (!existsSync(INTEGRATION_MANIFEST)) {
    console.error("error: openclaw-integration.manifest.json not found.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(INTEGRATION_MANIFEST, "utf-8"));
}

// ─── Git helpers ───────────────────────────────────────────────────────────────

/**
 * Run a git command in the upstream directory.
 * Returns { status, stdout, stderr }.
 */
function gitRun(upstreamRoot, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: upstreamRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Extract file paths from a git --name-status line.
 * Line format: <status>\t<path>
 * Status is one of: A(added), M(modified), D(deleted), R(renamed), etc.
 */
function parseGitNameStatus(output) {
  const files = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length >= 2) {
      files.push(parts[1]);
    }
  }
  return files;
}

// ─── Diff renderer ─────────────────────────────────────────────────────────────

/**
 * Render a unified diff header for a file.
 */
function renderDiffHeader(filePath, upstreamRoot) {
  const relPath = filePath.startsWith(upstreamRoot)
    ? filePath.slice(upstreamRoot.length + 1)
    : filePath;
  return [
    `diff --git a/${relPath} b/${relPath}`,
    `--- a/${relPath}`,
    `+++ b/${relPath}`,
  ].join("\n");
}

// ─── Core drift logic ──────────────────────────────────────────────────────────

/**
 * Check for uncommitted changes (git status --short).
 */
async function checkStatus(upstreamRoot, manifest, changedFiles) {
  const { status, stdout, stderr } = gitRun(upstreamRoot, [
    "status",
    "--short",
  ]);

  if (status !== 0) {
    console.error("git status failed:", stderr);
    process.exit(1);
  }

  const changed = stdout.trim().split("\n").filter(Boolean);

  if (changed.length === 0) {
    console.log("No upstream changes detected (working tree clean).");
    return;
  }

  console.log(`${changed.length} uncommitted file(s) changed in upstream:\n`);
  for (const line of changed) {
    console.log(" ", line);
  }

  // Map to integration points
  const integrationHits = collectIntegrationHits(changedFiles, manifest.watch);

  if (integrationHits.length > 0) {
    console.log("\nMapped to local integration points:");
    for (const hit of integrationHits) {
      console.log(`\n  upstream: ${hit.upstreamPath}`);
      console.log(`  → review local:`);
      for (const local of hit.integrates) {
        console.log(`    - ${local}`);
      }
    }
  } else {
    console.log("\nNo mapped integration points for these changes.");
  }
}

/**
 * Check for changes in a commit range (git log --name-status --oneline + git diff).
 */
async function checkRange(upstreamRoot, manifest, rangeSpec) {
  console.log(`Checking upstream diff for range: ${rangeSpec}\n`);

  // Get list of changed files in range
  const { status, stdout, stderr } = gitRun(upstreamRoot, [
    "log",
    "--name-status",
    "--oneline",
    rangeSpec,
  ]);

  if (status !== 0) {
    console.error(`git log failed: ${stderr}`);
    process.exit(1);
  }

  if (!stdout.trim()) {
    console.log(`No commits in range '${rangeSpec}' or range is invalid.`);
    return;
  }

  const changedFiles = parseGitNameStatus(stdout);
  const uniqueFiles = [...new Set(changedFiles)];

  if (uniqueFiles.length === 0) {
    console.log("No files changed in this range.");
    return;
  }

  console.log(`${uniqueFiles.length} file(s) changed in range '${rangeSpec}':\n`);
  for (const f of uniqueFiles) {
    console.log(" ", f);
  }

  // Map to integration points
  const integrationHits = collectIntegrationHits(uniqueFiles, manifest.watch);

  if (integrationHits.length > 0) {
    console.log("\nMapped to local integration points:");
    for (const hit of integrationHits) {
      console.log(`\n  upstream: ${hit.upstreamPath}`);
      console.log(`  → review local:`);
      for (const local of hit.integrates) {
        console.log(`    - ${local}`);
      }
    }
  } else {
    console.log("\nNo mapped integration points for this range.");
  }

  // Show diff stats
  console.log(`\nDiff statistics for range '${rangeSpec}':`);
  const { status: statStatus, stdout: statOut } = gitRun(upstreamRoot, [
    "diff",
    "--stat",
    rangeSpec,
  ]);
  if (statStatus === 0 && statOut.trim()) {
    for (const line of statOut.trim().split("\n")) {
      if (line.trim()) console.log(" ", line);
    }
  }

  // Prompt to show full diff
  console.log(
    `\nTo see full diff output, run:\n  git -C "${upstreamRoot}" diff ${rangeSpec}`
  );
}

/**
 * Collect integration hits for a list of changed upstream files.
 */
function collectIntegrationHits(changedFiles, watchEntries) {
  const hits = [];

  for (const watch of watchEntries ?? []) {
    for (const changed of changedFiles) {
      if (changed === watch.path || changed.endsWith("/" + watch.path) || watch.path.endsWith("/" + changed)) {
        hits.push({
          upstreamPath: watch.path,
          integrates: watch.integrates ?? [],
        });
        break; // Only one hit per watch entry
      }
    }
  }

  return hits;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();

  // Allow OPENCLAW_SRC env var to override upstreamRoot
  const upstreamRoot = process.env.OPENCLAW_SRC
    ? join(ROOT, process.env.OPENCLAW_SRC)
    : join(ROOT, manifest.upstreamRoot);

  if (!existsSync(upstreamRoot)) {
    console.error(`upstreamRoot not found: ${upstreamRoot}`);
    console.error("Hint: Run 'pnpm pull:ai-reference-sources' to clone upstream sources.");
    process.exit(1);
  }

  // Verify upstream is a git repo
  if (!existsSync(join(upstreamRoot, ".git"))) {
    console.error(`upstreamRoot is not a git repository: ${upstreamRoot}`);
    process.exit(1);
  }

  if (args.mode === "range") {
    await checkRange(upstreamRoot, manifest, args.range);
  } else {
    // Default: status mode — get uncommitted changes
    const { status, stdout, stderr } = gitRun(upstreamRoot, [
      "status",
      "--short",
    ]);

    if (status !== 0) {
      console.error("git status failed:", stderr);
      process.exit(1);
    }

    const changed = stdout.trim().split("\n").filter(Boolean);
    const changedFiles = changed
      .map((line) => {
        // Format: XY filename  (e.g. " M path/to/file.ts")
        const match = line.match(/^[A-Z\s]+\s+(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    await checkStatus(upstreamRoot, manifest, changedFiles);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
