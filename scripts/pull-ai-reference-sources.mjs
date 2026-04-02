#!/usr/bin/env node
/**
 * pull-ai-reference-sources.mjs
 *
 * Clones or updates the ai-reference-sources directory based on
 * ai-reference-sources.manifest.json.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "ai-reference-sources.manifest.json");
const SOURCES_DIR = join(ROOT, "ai-reference-sources");

// Default manifest if none exists
const DEFAULT_MANIFEST = {
  upstreamRoot: "ai-reference-sources/openclaw",
  watch: [],
};

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.log("No manifest found — creating default.");
    mkdirSync(SOURCES_DIR, { recursive: true });
    writeFileSync(MANIFEST_PATH, JSON.stringify(DEFAULT_MANIFEST, null, 2));
    return DEFAULT_MANIFEST;
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

async function pull(upstream, gitUrl) {
  const targetDir = join(SOURCES_DIR, upstream);

  if (existsSync(join(targetDir, ".git"))) {
    console.log(`Pulling ${upstream}...`);
    const r = spawnSync("git", ["pull", "--rebase"], { cwd: targetDir, stdio: "inherit" });
    if (r.status !== 0) console.warn(`  pull failed for ${upstream}`);
  } else {
    console.log(`Cloning ${gitUrl} into ${targetDir}...`);
    mkdirSync(dirname(targetDir), { recursive: true });
    const r = spawnSync("git", ["clone", "--depth=1", gitUrl, targetDir], {
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.warn(`  clone failed for ${upstream} — check manifest git URL`);
    }
  }
}

async function main() {
  const manifest = loadManifest();
  console.log("ai-reference-sources manifest loaded.");
  // In a real setup, manifest would have entries with gitUrl
  // For now, log readiness
  console.log("Reference sources directory:", SOURCES_DIR);
  console.log("To update, configure ai-reference-sources.manifest.json with git URLs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
