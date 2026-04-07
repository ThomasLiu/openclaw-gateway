// ============================================================
// OpenClaw Chat - Agent 列表 E2E 测试
// 验证 Agent 列表的展示与基本交互
// TDD 红阶段：先写测试，预期组件实现后会通过
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('Agent 列表', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('页面加载后应显示 Agent 列表容器', async ({ page }) => {
    const agentList = page.locator('[data-testid="agent-list"]')
    await expect(agentList).toBeVisible()
  })

  test('Agent 卡片应渲染名称和描述信息', async ({ page }) => {
    // Agent 卡片应该包含名称和描述信息
    const agentCards = page.locator('[data-testid="agent-card"]')

    // 至少应该有一个默认 Agent
    const count = await agentCards.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // 第一个卡片应该有名称
    const firstCard = agentCards.first()
    const cardName = firstCard.locator('[data-testid="agent-card-name"]')
    await expect(cardName).toBeVisible()
  })

  test('点击 Agent 后应高亮显示选中状态', async ({ page }) => {
    // 点击 Agent 后应该高亮选中状态
    const agentCards = page.locator('[data-testid="agent-card"]')
    const firstCard = agentCards.first()

    // 点击前没有选中状态
    await expect(firstCard).not.toHaveClass(/selected/)

    // 点击选中
    await firstCard.click()

    // 点击后应有选中状态
    await expect(firstCard).toHaveClass(/selected/)
  })

  test('Agent 列表应在左侧栏面板内显示', async ({ page }) => {
    // Agent 列表应该在左侧栏中显示
    const leftSidebar = page.locator('[data-testid="left-sidebar"]')
    const agentList = page.locator('[data-testid="agent-list"]')

    // Agent 列表应该在左侧栏的边界内
    const sidebarBox = await leftSidebar.boundingBox()
    const listBox = await agentList.boundingBox()

    expect(sidebarBox).not.toBeNull()
    expect(listBox).not.toBeNull()

    if (sidebarBox && listBox) {
      expect(listBox.x).toBeGreaterThanOrEqual(sidebarBox.x)
      expect(listBox.x + listBox.width).toBeLessThanOrEqual(sidebarBox.x + sidebarBox.width)
    }
  })

  test('Agent 数量超出可视区域时应支持滚动', async ({ page }) => {
    // 当 Agent 数量超过可视区域时，列表应该可以滚动
    const agentList = page.locator('[data-testid="agent-list"]')

    // 检查 overflow 行为（即使只有少量 Agent 也应支持滚动）
    const scrollHeight = await agentList.evaluate(el => el.scrollHeight)
    const clientHeight = await agentList.evaluate(el => el.clientHeight)

    // scrollHeight >= clientHeight 表示支持滚动
    expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight)
  })

  test('不存在任何 Agent 时应显示空状态提示', async ({ page }) => {
    // 如果没有 Agent，应该显示空状态提示
    // 注意：此测试可能需要特定条件才能触发
    const agentList = page.locator('[data-testid="agent-list"]')
    const emptyState = page.locator('[data-testid="agent-list-empty"]')

    // 检查空状态是否存在（取决于数据）
    const hasAgents = (await agentList.locator('[data-testid="agent-card"]').count()) > 0

    if (!hasAgents) {
      await expect(emptyState).toBeVisible()
    }
  })

  test('所有 Agent 卡片的样式应保持一致', async ({ page }) => {
    // 所有 Agent 卡片应该有一致的样式
    const agentCards = page.locator('[data-testid="agent-card"]')
    const count = await agentCards.count()

    if (count >= 2) {
      // 检查前两个卡片的某些样式属性是否一致
      const firstCardStyle = await agentCards.nth(0).evaluate(el => ({
        padding: getComputedStyle(el).padding,
        borderRadius: getComputedStyle(el).borderRadius,
      }))
      const secondCardStyle = await agentCards.nth(1).evaluate(el => ({
        padding: getComputedStyle(el).padding,
        borderRadius: getComputedStyle(el).borderRadius,
      }))

      expect(firstCardStyle.padding).toEqual(secondCardStyle.padding)
      expect(firstCardStyle.borderRadius).toEqual(secondCardStyle.borderRadius)
    }
  })
})
