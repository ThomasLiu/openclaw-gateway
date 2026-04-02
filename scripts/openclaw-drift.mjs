#!/usr/bin/env node
/**
 * openclaw-drift.mjs
 *
 * Detects drift between upstream OpenClaw sources and local integrations.
 * Reads openclaw-integration.manifest.json and uses git to compare changes.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "openclaw-integration.manifest.json");
const INTEGRATION_MANIFEST = join(ROOT, "openclaw-integration.manifest.json");

function loadManifest() {
  if (!existsSync(INTEGRATION_MANIFEST)) {
    console.error("openclaw-integration.manifest.json not found.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(INTEGRATION_MANIFEST, "utf-8"));
}

async function main() {
  const manifest = loadManifest();
  const upstreamRoot = join(ROOT, manifest.upstreamRoot);

  if (!existsSync(upstreamRoot)) {
    console.error(`upstreamRoot not found: ${upstreamRoot}`);
    console.error("Run: pnpm pull:ai-reference-sources");
    process.exit(1);
  }

  // Check git status in upstream
  const r = spawnSync("git", ["status", "--short"], {
    cwd: upstreamRoot,
    encoding: "utf-8",
  });

  if (r.status !== 0) {
    console.error("git status failed in upstreamRoot");
    process.exit(1);
  }

  const changed = r.stdout.trim().split("\n").filter(Boolean);

  if (changed.length === 0) {
    console.log("No upstream changes detected.");
    return;
  }

  console.log(`${changed.length} file(s) changed in upstream:\n`);
  for (const line of changed) {
    console.log(" ", line);
  }

  // Try to map changes to local integrates
  console.log("\nChecking local integration points:");
  for (const watch of manifest.watch ?? []) {
    const changedInWatch = changed.filter((l) => l.includes(watch.path));
    if (changedInWatch.length > 0) {
      console.log(`\n  ${watch.path} changed → review:`);
      for (const integrates of watch.integrates ?? []) {
        console.log(`    - ${integrates}`);
      }
    }
  }

  console.log("\nRun: pnpm openclaw:drift -- --range '<old>..<new>' for diff");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
