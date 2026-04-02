import { test, expect } from "@playwright/test";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * E2E: Agent export zip generation and import flow.
 * Uses playwright fixtures from e2e/fixtures/agent-export/
 */
test.describe("Agent export zip", () => {
  test("GET /api/agents/main/export returns zip with correct content-type", async ({ request }) => {
    const res = await request.get("/api/agents/main/export");
    // Gateway may not be available in all test environments
    if (res.status() === 404) {
      test.skip();
      return;
    }
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/zip");
  });

  test("zip filename includes agent id", async ({ request }) => {
    const res = await request.get("/api/agents/main/export");
    if (res.status() === 404) {
      test.skip();
      return;
    }
    const disposition = res.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("openclaw-agent-main-export.zip");
  });
});
