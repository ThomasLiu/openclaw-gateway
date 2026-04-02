#!/usr/bin/env node
/**
 * prepare-agent-export-fixture.mjs
 *
 * Creates a temporary openclaw.json fixture for Playwright E2E tests.
 * Writes to the path configured via OPENCLAW_CONFIG_PATH.
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixtures", "agent-export");
const FIXTURE_CONFIG = join(FIXTURE_DIR, "openclaw.json");

export function prepareAgentExportFixture() {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const fixture = {
    agents: {
      list: [
        {
          id: "test-agent",
          label: "Test Agent",
          skills: ["coding"],
        },
      ],
    },
    gateway: {
      port: 18789,
      auth: {
        token: "test-token",
      },
    },
  };

  writeFileSync(FIXTURE_CONFIG, JSON.stringify(fixture, null, 2));
  console.log(`Fixture written to: ${FIXTURE_CONFIG}`);
  console.log(`Set OPENCLAW_CONFIG_PATH=${FIXTURE_CONFIG} before running E2E.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareAgentExportFixture();
}
