// ============================================================
// OpenClaw Chat - Playwright E2E 测试配置
// 用于端到端测试 IDE 布局、Agent 管理、聊天等核心功能
// ============================================================

import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 完全并行运行测试
  fullyParallel: true,

  // CI 环境下禁止 .only
  forbidOnly: !!process.env.CI,

  // CI 环境下失败重试次数
  retries: process.env.CI ? 2 : 0,

  // CI 环境下限制并发数
  workers: process.env.CI ? 1 : undefined,

  // 报告器配置
  reporter: 'html',

  // 全局配置
  use: {
    // 基础 URL（与 webServer 对应）
    baseURL: 'http://localhost:3000',

    // 首次重试时收集 trace
    trace: 'on-first-retry',

    // 仅在失败时截图
    screenshot: 'only-on-failure',

    // 操作超时时间
    actionTimeout: 10 * 1000,
  },

  // 配置测试项目（浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 开发服务器配置（本地开发时自动启动）
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
