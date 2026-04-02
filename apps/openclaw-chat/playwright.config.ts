import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${process.env.PLAYWRIGHT_E2E_PORT ?? "3015"}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `next start -p ${process.env.PLAYWRIGHT_E2E_PORT ?? "3015"}`,
    url: `http://localhost:${process.env.PLAYWRIGHT_E2E_PORT ?? "3015"}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
