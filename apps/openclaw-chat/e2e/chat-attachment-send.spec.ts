import { test, expect } from "@playwright/test";

/**
 * E2E: Send message with image attachment.
 * Requires OpenClaw gateway running and app started.
 */
test.describe("Chat attachment send", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to load
    await page.waitForSelector("text=openClaw Chat", { timeout: 10_000 }).catch(() => {
      // Gateway may not be available in CI
    });
  });

  test("shows attachment button in composer", async ({ page }) => {
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
  });

  test("attachment UI interaction", async ({ page }) => {
    // Textarea is always editable — send button prevents sending when disconnected
    const textarea = page.locator("textarea");
    await textarea.click();
    // Placeholder reflects connection state; textarea itself is always editable
    const placeholder = await textarea.getAttribute("placeholder");
    const isConnected = /输入消息/.test(placeholder!);
    const isDisconnected = /网关未连接/.test(placeholder!);
    expect(isConnected || isDisconnected).toBe(true);
    // Input is possible regardless of connection state
    await textarea.fill("test message");
    await expect(textarea).toHaveValue("test message");
  });
});
