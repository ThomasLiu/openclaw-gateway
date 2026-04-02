#!/usr/bin/env node
/**
 * dev-with-reference-pull.mjs
 *
 * Runs reference source pull in the background, then starts openclaw-chat dev.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Pull reference sources asynchronously (don't block dev start)
  const pullPath = join(__dirname, "pull-ai-reference-sources.mjs");

  const pull = spawn("node", [pullPath], {
    stdio: "inherit",
    detached: true,
  });

  // Start dev server
  const dev = spawn("pnpm", ["--filter", "openclaw-chat", "dev"], {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });

  pull.unref();

  dev.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
