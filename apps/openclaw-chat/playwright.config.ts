/**
 * Playwright E2E 测试配置
 *
 * 默认运行：next start 于 3015
 * 避免与本机 next dev（3005）冲突
 *
 * 使用 PLAYWRIGHT_E2E_PORT 环境变量覆盖
 */

import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = process.env.PLAYWRIGHT_E2E_PORT ?? "3015";
const BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    // E2E 测试期望 next start 运行于 3015
    // 如果端口 3015 不可用，跳过 webServer 启动
    command: `next start -p ${E2E_PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
