// ============================================================
// OpenClaw Chat - IDE 三栏布局 E2E 测试
// 验证 IDE 布局的基本渲染和侧边栏交互
// TDD 红阶段：先写测试，预期组件实现后会通过
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('IDE 布局', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应正确渲染主布局容器', async ({ page }) => {
    // 验证主布局容器存在
    const layout = page.locator('[data-testid="ide-layout"]')
    await expect(layout).toBeVisible()
  })

  test('应呈现三栏布局结构：左侧栏、主内容区、右侧栏', async ({ page }) => {
    // 验证三栏布局结构：左侧栏、主内容区、右侧栏
    const leftSidebar = page.locator('[data-testid="left-sidebar"]')
    const mainContent = page.locator('[data-testid="main-content"]')
    const rightSidebar = page.locator('[data-testid="right-sidebar"]')

    await expect(leftSidebar).toBeVisible()
    await expect(mainContent).toBeVisible()
    await expect(rightSidebar).toBeVisible()
  })

  test('默认状态下左侧栏应为展开状态', async ({ page }) => {
    // 默认状态下左侧栏应该是展开的
    const leftSidebar = page.locator('[data-testid="left-sidebar"]')
    await expect(leftSidebar).toHaveClass(/sidebar-expanded/)
    // 或者检查宽度
    const boundingBox = await leftSidebar.boundingBox()
    expect(boundingBox?.width).toBeGreaterThan(100)
  })

  test('点击折叠按钮后左侧栏应收起，再次点击应展开', async ({ page }) => {
    // 点击折叠按钮后，左侧栏应该收起
    const toggleButton = page.locator('[data-testid="toggle-left-sidebar"]')
    const leftSidebar = page.locator('[data-testid="left-sidebar"]')

    // 初始状态：展开
    const initialBox = await leftSidebar.boundingBox()
    const initialWidth = initialBox?.width ?? 0

    // 点击折叠按钮
    await toggleButton.click()

    // 收起后的宽度应该变小
    const collapsedBox = await leftSidebar.boundingBox()
    const collapsedWidth = collapsedBox?.width ?? 0
    expect(collapsedWidth).toBeLessThan(initialWidth)

    // 再次点击展开
    await toggleButton.click()

    // 展开后恢复原始宽度
    const restoredBox = await leftSidebar.boundingBox()
    const restoredWidth = restoredBox?.width ?? 0
    expect(restoredWidth).toBeGreaterThanOrEqual(initialWidth)
  })

  test('点击切换按钮后右侧栏应在可见与隐藏之间切换', async ({ page }) => {
    // 点击右侧栏切换按钮，右侧栏应该显示/隐藏
    const toggleButton = page.locator('[data-testid="toggle-right-sidebar"]')
    const rightSidebar = page.locator('[data-testid="right-sidebar"]')

    // 初始状态：可见
    await expect(rightSidebar).toBeVisible()

    // 点击隐藏
    await toggleButton.click()
    await expect(rightSidebar).toBeHidden()

    // 再次点击显示
    await toggleButton.click()
    await expect(rightSidebar).toBeVisible()
  })

  test('主内容区域应保持最小宽度以保证可用性', async ({ page }) => {
    // 主内容区域应该有最小宽度保证可用性
    const mainContent = page.locator('[data-testid="main-content"]')
    const box = await mainContent.boundingBox()
    expect(box?.width).toBeGreaterThan(200)
  })

  test('窗口大小变化时布局应自适应调整', async ({ page }) => {
    // 窗口大小变化时，布局应自适应
    const layout = page.locator('[data-testid="ide-layout"]')

    // 设置较小窗口
    await page.setViewportSize({ width: 1024, height: 768 })
    const smallBox = await layout.boundingBox()
    expect(smallBox?.width).toBe(1024)

    // 设置较大窗口
    await page.setViewportSize({ width: 1920, height: 1080 })
    const largeBox = await layout.boundingBox()
    expect(largeBox?.width).toBe(1920)
  })
})
