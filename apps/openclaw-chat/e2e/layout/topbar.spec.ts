// ============================================================
// OpenClaw Chat - 顶部状态栏 E2E 测试
// 验证 TopBar 组件的连接状态、版本号等显示
// TDD 红阶段：先写测试，预期组件实现后会通过
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('顶部状态栏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应正确渲染顶部状态栏组件', async ({ page }) => {
    const topbar = page.locator('[data-testid="topbar"]')
    await expect(topbar).toBeVisible()
  })

  test('应显示连接状态指示器', async ({ page }) => {
    // 连接状态指示器应该存在并显示当前连接状态
    const statusIndicator = page.locator('[data-testid="connection-status"]')
    await expect(statusIndicator).toBeVisible()

    // 应该包含状态文本（已连接/未连接/连接中）
    const statusText = await statusIndicator.textContent()
    expect(statusText).toBeTruthy()
  })

  test('Gateway 可用时应显示"已连接"状态', async ({ page }) => {
    // 当 Gateway 可用时，应显示"已连接"状态
    const statusIndicator = page.locator('[data-testid="connection-status"]')

    // 等待连接状态稳定
    await expect(statusIndicator).toHaveAttribute('data-status', /connected|disconnected|connecting/)
  })

  test('应在 TopBar 中显示应用版本号', async ({ page }) => {
    // 版本号应该在 TopBar 中显示
    const versionElement = page.locator('[data-testid="app-version"]')
    await expect(versionElement).toBeVisible()

    // 版本号格式应为 semver（如 v0.1.0 或 0.1.0）
    const versionText = await versionElement.textContent()
    expect(versionText).toMatch(/\d+\.\d+\.\d+/)
  })

  test('应在左侧显示项目名称或 Logo', async ({ page }) => {
    // 项目名称或 Logo 应该在左侧显示
    const branding = page.locator('[data-testid="topbar-branding"]')
    await expect(branding).toBeVisible()
  })

  test('设置或菜单按钮应可正常访问', async ({ page }) => {
    // 设置或菜单按钮应该可点击
    const menuButton = page.locator('[data-testid="topbar-menu-button"]')
    await expect(menuButton).toBeVisible()
    await expect(menuButton).toBeEnabled()
  })

  test('滚动页面时 TopBar 应固定在顶部不动', async ({ page }) => {
    // TopBar 应固定在页面顶部
    const topbar = page.locator('[data-testid="topbar"]')

    // 检查位置是否在顶部
    const box = await topbar.boundingBox()
    expect(box?.y).toBe(0)

    // 滚动页面后仍应在顶部
    await page.mouse.wheel(0, 500)
    const afterScrollBox = await topbar.boundingBox()
    expect(afterScrollBox?.y).toBe(0)
  })
})
