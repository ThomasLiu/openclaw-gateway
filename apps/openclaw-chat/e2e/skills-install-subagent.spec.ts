import { test, expect } from '@playwright/test';

/**
 * E2E: Skills Install + Subagent Policy
 * Tests: Skills tab with install modal, Subagent tab with policy edit modal.
 */

test.describe('Skills Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=openClaw Chat', { timeout: 10_000 }).catch(() => {
      // Gateway may not be available
    });

    // Open right panel via header button
    await page.locator('button:has-text("日志")').first().click();
    await page.waitForTimeout(500);

    // Navigate to Skills tab
    await page.locator('aside button:has-text("Skill")').click();
    await page.waitForTimeout(1000);
  });

  test('skills tab opens with install button', async ({ page }) => {
    // Header should show "已安装 Skill"
    const header = page.locator('aside').last().locator('text=已安装 Skill');
    await expect(header).toBeVisible();

    // Install button should be visible
    const installBtn = page.locator('aside button:has-text("+ 安装")');
    await expect(installBtn).toBeVisible();
  });

  test('install modal opens with all required fields', async ({ page }) => {
    // Open install modal
    await page.locator('aside button:has-text("+ 安装")').click();
    await page.waitForTimeout(500);

    // Modal title (use heading role to avoid matching header "已安装 Skill")
    const modal = page.getByRole('heading', { name: '安装 Skill' });
    await expect(modal).toBeVisible();

    // Skill name field
    const nameLabel = page.locator('text=Skill 名称');
    await expect(nameLabel).toBeVisible();

    // Scope selection should have two options
    const globalOpt = page.getByRole('button', { name: '全局安装' });
    await expect(globalOpt).toBeVisible();
    const agentOpt = page.getByRole('button', { name: '当前 Agent' });
    await expect(agentOpt).toBeVisible();

    // Cancel and save buttons
    const cancelBtn = page.getByRole('button', { name: '取消' });
    await expect(cancelBtn).toBeVisible();
    const installBtn = page.getByRole('button', { name: '安装', exact: true });
    await expect(installBtn).toBeVisible();

    // Modal should close on cancel
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  test('install modal validates empty name', async ({ page }) => {
    await page.locator('aside button:has-text("+ 安装")').click();
    await page.waitForTimeout(500);

    // Fill in name then clear it to test validation
    const nameInput = page.locator('input[placeholder="例如：code-search"]');
    await nameInput.fill('test-skill');
    await nameInput.clear();
    await page.waitForTimeout(100);

    // Button should still be disabled with empty name
    const installBtn = page.getByRole('button', { name: '安装', exact: true });
    await expect(installBtn).toBeDisabled();

    // Enter valid name and verify button becomes enabled
    await nameInput.fill('valid-skill');
    await page.waitForTimeout(100);
    await expect(installBtn).toBeEnabled();
  });
});

test.describe('Subagent Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=openClaw Chat', { timeout: 10_000 }).catch(() => {
      // Gateway may not be available
    });

    // Open right panel
    await page.locator('button:has-text("日志")').first().click();
    await page.waitForTimeout(500);

    // Navigate to Subagent tab
    await page.locator('aside button:has-text("Subagent")').click();
    await page.waitForTimeout(1000);
  });

  test('subagent tab opens with policy button', async ({ page }) => {
    // Header should show "子会话" (use first() since both header and content match)
    const header = page.locator('aside').last().locator('span:text-is("子会话")');
    await expect(header).toBeVisible();

    // Policy button should be visible
    const policyBtn = page.locator('aside button:has-text("策略")');
    await expect(policyBtn).toBeVisible();
  });

  test('policy edit modal opens with all sections', async ({ page }) => {
    await page.locator('aside button:has-text("策略")').click();
    await page.waitForTimeout(500);

    // Modal title
    const modal = page.locator('text=编辑子会话策略');
    await expect(modal).toBeVisible();

    // Three kind options
    const defaultsOpt = page.locator('text=全局默认策略');
    await expect(defaultsOpt).toBeVisible();
    const toolsOpt = page.locator('text=工具策略');
    await expect(toolsOpt).toBeVisible();
    const agentOpt = page.locator('text=当前 Agent 策略');
    await expect(agentOpt).toBeVisible();

    // Fields
    const allowAgentsLabel = page.locator('text=允许的 Agent');
    await expect(allowAgentsLabel).toBeVisible();
    const maxDepthLabel = page.locator('text=最大嵌套深度');
    await expect(maxDepthLabel).toBeVisible();

    // Toggle
    const toggle = page.locator('[role="switch"]');
    await expect(toggle).toBeVisible();

    // Cancel and save
    const cancelBtn = page.locator('button:has-text("取消")');
    await expect(cancelBtn).toBeVisible();
    const saveBtn = page.locator('button:has-text("保存")');
    await expect(saveBtn).toBeVisible();

    // Modal closes on cancel
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  test('policy modal closes on Escape key', async ({ page }) => {
    await page.locator('aside button:has-text("策略")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('text=编辑子会话策略');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });
});
