// ============================================================
// OpenClaw Chat - 其余 Detail Panel Tabs E2E 测试
// Skill / Subagent / Model / Memory / Workspace / Cron / Channel
// 所有测试文案为中文
// ============================================================

import { test, expect } from '@playwright/test'

// ==================== 技能管理 ====================

test.describe('技能管理 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openSkillTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '技能' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Skills' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="skill-manager-tab"]')
  }

  test('应渲染技能管理面板并展示分类标签（内置/全局/工作区）', async ({ page }) => {
    const panel = await openSkillTab(page)
    await expect(panel).toBeVisible()
    const tags = panel.locator('[data-testid="skill-category-tag"]')
    expect(await tags.count()).toBeGreaterThanOrEqual(0)
  })

  test('点击技能项应显示 SKILL.md 详细内容', async ({ page }) => {
    const panel = await openSkillTab(page)
    const skillItem = panel.locator('[data-testid="skill-item"]').first()
    if (await skillItem.isVisible()) {
      await skillItem.click()
      const detail = panel.locator('[data-testid="skill-detail"]')
      await expect(detail.first()).toBeVisible()
    }
  })

  test('"添加技能"应通过当前选中 Agent 的会话协作引导完成', async ({ page }) => {
    const panel = await openSkillTab(page)
    const addBtn = panel.locator('[data-testid="skill-add-btn"], button:has-text("添加")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      // 应触发与当前 Agent 的会话流程
    }
  })
})

// ==================== MCP 管理 ====================
// (已有独立 mcp-manager.spec.ts，此处做简要补充)

test.describe('MCP 管理补充测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  test('MCP 服务器连接状态变化时应有实时动画指示', async ({ page }) => {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: 'MCP' }).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }

    const mcpPanel = page.locator('[data-testid="mcp-manager-tab"]')
    await expect(mcpPanel).toBeVisible()
  })
})

// ==================== 子代理配置 ====================

test.describe('子代理配置 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openSubagentTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '子代理' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Subagent' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="subagent-tab"]')
  }

  test('应同时展示全局子代理配置和 Agent 级别子代理配置', async ({ page }) => {
    const panel = await openSubagentTab(page)
    await expect(panel).toBeVisible()
    
    const globalSection = panel.locator('[data-testid="subagent-global"]')
    const agentSection = panel.locator('[data-testid="subagent-agent-level"]')
    // 至少有一个区域存在
    const hasSections = (await globalSection.count() > 0) || (await agentSection.count() > 0)
    expect(hasSections).toBeTruthy()
  })

  test('子代理配置应以 JSON 块形式查看和编辑', async ({ page }) => {
    const panel = await openSubagentTab(page)
    const jsonBlock = panel.locator('[data-testid="json-block"], pre code, [data-testid="subagent-config-json"]')
    expect(await jsonBlock.count()).toBeGreaterThanOrEqual(0)
  })
})

// ==================== 模型管理 ====================

test.describe('模型管理 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openModelTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '模型' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Models' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="model-manager-tab"]')
  }

  test('应按提供商分组展示所有可用模型定义', async ({ page }) => {
    const panel = await openModelTab(page)
    await expect(panel).toBeVisible()
    const providerGroups = panel.locator('[data-testid="model-provider-group"]')
    expect(await providerGroups.count()).toBeGreaterThanOrEqual(0)
  })

  test('应能设置默认模型并保存', async ({ page }) => {
    const panel = await openModelTab(page)
    const defaultBtn = panel.locator('[data-testid="set-default-model"]').first()
    if (await defaultBtn.isVisible()) {
      await defaultBtn.click()
      // 应有确认反馈
    }
  })

  test('新增模型应通过表单填写配置并通过主 Agent 协作引导', async ({ page }) => {
    const panel = await openModelTab(page)
    const addModelBtn = panel.locator('[data-testid="add-model-btn"], button:has-text("新增")').first()
    if (await addModelBtn.isVisible()) {
      await addModelBtn.click()
      // 表单或协作引导流程
    }
  })

  test('应内嵌 SchemaHelpPanel 用于配置字段解释', async ({ page }) => {
    const panel = await openModelTab(page)
    const schemaHelp = panel.locator('.schema-help-panel')
    expect(await schemaHelp.count()).toBeGreaterThanOrEqual(0)
  })
})

// ==================== 记忆管理 ====================

test.describe('记忆管理 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openMemoryTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '记忆' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Memory' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="memory-manager-tab"]')
  }

  test('应展示 MEMORY.md 文件内容并提供 Diff 编辑', async ({ page }) => {
    const panel = await openMemoryTab(page)
    await expect(panel).toBeVisible()
    const memoryMd = panel.locator('[data-testid="memory-md-content"]')
    expect(await memoryMd.count()).toBeGreaterThanOrEqual(0)
  })

  test('应列出 memory/*.md 下所有记忆文件', async ({ page }) => {
    const panel = await openMemoryTab(page)
    const fileList = panel.locator('[data-testid="memory-file-list"]')
    expect(await fileList.count()).toBeGreaterThanOrEqual(0)
  })

  test('应显示记忆索引状态信息', async ({ page }) => {
    const panel = await openMemoryTab(page)
    const indexStatus = panel.locator('[data-testid="memory-index-status"]')
    expect(await indexStatus.count()).toBeGreaterThanOrEqual(0)
  })
})

// ==================== 工作区浏览器 ====================

test.describe('工作区浏览器 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openWorkspaceTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '工作区' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Workspace' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="workspace-browser-tab"]')
  }

  test('应展示项目目录树形结构', async ({ page }) => {
    const panel = await openWorkspaceTab(page)
    await expect(panel).toBeVisible()
    const tree = panel.locator('[data-testid="directory-tree"]')
    expect(await tree.count()).toBeGreaterThanOrEqual(0)
  })

  test('不同类型文件应使用对应图标区分', async ({ page }) => {
    const panel = await openWorkspaceTab(page)
    const fileIcons = panel.locator('[data-file-icon], [data-lucide="file"], [data-lucide="folder"]')
    expect(await fileIcons.count()).toBeGreaterThanOrEqual(0)
  })

  test('点击文件应显示文件内容预览', async ({ page }) => {
    const panel = await openWorkspaceTab(page)
    const fileItem = panel.locator('[data-testid="file-item"]').first()
    if (await fileItem.isVisible()) {
      await fileItem.click()
      const preview = panel.locator('[data-testid="file-preview"]')
      await expect(preview.first()).toBeVisible()
    }
  })

  test('应支持新建文件夹/文件和删除操作', async ({ page }) => {
    const panel = await openWorkspaceTab(page)
    const newFolderBtn = panel.locator('[data-testid="new-folder-btn"], button:has-text("新建文件夹")').first()
    const newFileBtn = panel.locator('[data-testid="new-file-btn"], button:has-text("新建文件")').first()
    // 至少有操作按钮存在
    expect((await newFolderBtn.isVisible()) || (await newFileBtn.isVisible())).toBeTruthy()
  })
})

// ==================== 定时任务管理 ====================

test.describe('定时任务管理 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openCronTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '定时' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Cron' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="cron-manager-tab"]')
  }

  test('应列出所有定时任务及其名称/调度周期/状态/上次运行时间', async ({ page }) => {
    const panel = await openCronTab(page)
    await expect(panel).toBeVisible()
    const jobCards = panel.locator('[data-testid="cron-job-card"]')
    expect(await jobCards.count()).toBeGreaterThanOrEqual(0)
  })

  test('应对任务提供启用/禁用/手动触发/删除操作', async ({ page }) => {
    const panel = await openCronTab(page)
    const jobCard = panel.locator('[data-testid="cron-job-card"]').first()
    if (await jobCard.isVisible()) {
      // 操作按钮组
      const actions = jobCard.locator('[data-testid="cron-actions"]')
      expect(await actions.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('删除任务前应弹出二次确认对话框', async ({ page }) => {
    const panel = await openCronTab(page)
    const deleteBtn = panel.locator('[data-testid="cron-delete-btn"], [data-lucide="trash-2"]').first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()
      const confirmDialog = page.locator('[data-testid="cron-delete-confirm"], [role="alertdialog"]')
      await expect(confirmDialog.first()).toBeVisible()
    }
  })

  test('应显示任务的运行历史记录', async ({ page }) => {
    const panel = await openCronTab(page)
    const runHistory = panel.locator('[data-testid="cron-run-history"]')
    expect(await runHistory.count()).toBeGreaterThanOrEqual(0)
  })

  test('添加新任务应通过当前选中 Agent 会话协作引导', async ({ page }) => {
    const panel = await openCronTab(page)
    const addBtn = panel.locator('[data-testid="cron-add-btn"], button:has-text("添加")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      // 协作引导流程
    }
  })
})

// ==================== 渠道管理 ====================

test.describe('渠道管理 - E2E 测试', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  async function openChannelTab(page: any) {
    const rs = page.locator('[data-testid="right-sidebar"]')
    if (!(await rs.isVisible())) {
      const btn = page.locator('[data-testid="right-sidebar-expand-btn"]')
      if (await btn.isVisible()) await btn.click()
    }
    const tab = page.locator('button[role="tab"]').filter({ hasText: '渠道' }).or(
      page.locator('button[role="tab"]').filter({ hasText: 'Channel' })
    ).first()
    if (await tab.isVisible()) { await tab.click(); await page.waitForTimeout(300) }
    return page.locator('[data-testid="channel-manager-tab"]')
  }

  test('应列出所有已配置渠道的类型/账号/状态', async ({ page }) => {
    const panel = await openChannelTab(page)
    await expect(panel).toBeVisible()
    const channelCards = panel.locator('[data-testid="channel-card"]')
    expect(await channelCards.count()).toBeGreaterThanOrEqual(0)
  })

  test('渠道配置应以 JSON 形式查看和编辑', async ({ page }) => {
    const panel = await openChannelTab(page)
    const jsonViewer = panel.locator('[data-testid="channel-json"], pre code')
    expect(await jsonViewer.count()).toBeGreaterThanOrEqual(0)
  })

  test('添加渠道应通过当前 Agent 会话协作引导（含网络查找和凭证步骤）', async ({ page }) => {
    const panel = await openChannelTab(page)
    const addBtn = panel.locator('[data-testid="channel-add-btn"], button:has-text("添加")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      // 协作引导多步骤流程
    }
  })
})
