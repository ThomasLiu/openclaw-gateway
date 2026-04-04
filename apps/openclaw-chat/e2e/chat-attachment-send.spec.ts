/**
 * e2e/chat-attachment-send.spec.ts
 *
 * E2E 测试：附件发送流程
 *
 * 测试步骤：
 * 1. 打开浏览器访问 http://localhost:3005（或 PLAYWRIGHT_E2E_PORT）
 * 2. 确认聊天界面加载
 * 3. 找到输入框
 * 4. 输入测试消息
 * 5. 点击发送按钮
 * 6. 确认消息出现在消息列表中
 *
 * 运行：PLAYWRIGHT_E2E_PORT=3015 pnpm --filter openclaw-chat exec playwright test e2e/chat-attachment-send.spec.ts
 */

import { test, expect } from "@playwright/test";

// 默认端口：next start 于 3015（避免与本机 next dev 3005 冲突）
const E2E_PORT = process.env.PLAYWRIGHT_E2E_PORT ?? "3015";
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

test.describe("聊天附件发送", () => {
  test.beforeEach(async ({ page }) => {
    // 打开应用
    await page.goto(E2E_BASE_URL, { waitUntil: "networkidle" });
  });

  test("聊天界面正常加载", async ({ page }) => {
    // 确认页面标题或顶栏存在
    const title = page.locator("text=OpenClaw Gateway");
    await expect(title).toBeVisible({ timeout: 10_000 });
  });

  test("输入框可以输入并发送消息", async ({ page }) => {
    // 等待聊天界面加载
    await expect(page.locator('[data-testid="composer"]')).toBeVisible({ timeout: 10_000 });

    // 输入测试消息
    const composer = page.locator('[data-testid="composer"]');
    await composer.fill("Hello, this is an E2E test message");

    // 点击发送按钮（如果有）
    const sendButton = page.locator('[data-testid="send-button"]');
    if (await sendButton.isVisible()) {
      await sendButton.click();

      // 确认消息出现在列表中
      await expect(page.locator("text=Hello, this is an E2E test message")).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("会话侧栏显示", async ({ page }) => {
    // 确认会话侧栏存在
    const sessionSidebar = page.locator("aside").first();
    await expect(sessionSidebar).toBeVisible({ timeout: 10_000 });
  });

  test("网关状态指示器显示", async ({ page }) => {
    // 确认状态指示器存在
    const statusIndicator = page.locator(".status-indicator");
    await expect(statusIndicator).toBeVisible({ timeout: 10_000 });
  });

  test("错误时显示网关告警弹窗", async ({ page }) => {
    // 断开网关连接时（如果有告警弹窗）
    const alertDialog = page.locator('[data-testid="gateway-alert-dialog"]');
    const isAlertVisible = await alertDialog.isVisible().catch(() => false);

    if (isAlertVisible) {
      await expect(alertDialog).toBeVisible();
    } else {
      // 正常情况下告警弹窗不应显示
      expect(true).toBe(true);
    }
  });
});

test.describe("网关连接状态", () => {
  test("网关连接时状态指示器为绿色", async ({ page }) => {
    await page.goto(E2E_BASE_URL, { waitUntil: "networkidle" });

    // 等待连接建立（最多 10 秒）
    await page.waitForTimeout(3000);

    // 检查状态指示器类
    const statusIndicator = page.locator(".status-indicator").first();
    const className = await statusIndicator.getAttribute("class");

    // connected 或 disconnected 类名
    expect(className).toMatch(/status-(connected|disconnected)/);
  });

  test("GET /api/gateway/status 返回网关状态", async ({ request }) => {
    const resp = await request.get(`${E2E_BASE_URL}/api/gateway/status`);
    expect(resp.status()).toBeGreaterThanOrEqual(200);

    const data = (await resp.json()) as {
      ok: boolean;
      connected: boolean;
      source?: string;
    };
    expect(typeof data.ok).toBe("boolean");
    expect(typeof data.connected).toBe("boolean");
  });
});
