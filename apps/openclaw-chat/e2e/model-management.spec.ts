import { test, expect } from '@playwright/test';

/**
 * E2E: Model Management Tab
 * Tests: Model list display, wizard config API, selection confirmation flow.
 * Uses serial mode to avoid parallel gateway request overload.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Model Management Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=openClaw Chat', { timeout: 10_000 }).catch(() => {});

    // Open right panel via header button, then switch to 模型管理 tab
    await page.locator('header button:has-text("日志")').first().click();
    await page.waitForTimeout(500);
    await page.locator('aside button:has-text("模型管理")').click();
    // Wait for model section to appear
    await page.waitForSelector('aside >> text=可用模型', { timeout: 15_000 }).catch(() => {});
    // Wait for React to fully render the model list buttons
    await page.waitForFunction(
      () => {
        const asides = document.querySelectorAll('aside');
        const lastAside = asides[asides.length - 1];
        if (!lastAside) return false;
        const buttons = lastAside.querySelectorAll('button');
        for (const btn of buttons) {
          if ((btn as HTMLElement).innerText.includes('MiniMax')) return true;
        }
        return false;
      },
      { timeout: 20_000 }
    );
  });

  test('model management tab shows models section header', async ({ page }) => {
    const sectionHeader = page.locator('aside').last().locator('text=可用模型');
    await expect(sectionHeader).toBeVisible();
  });

  test('displays available models in the panel', async ({ page }) => {
    const rightPanel = page.locator('aside').last();
    const panelText = await rightPanel.evaluate(el => el.textContent ?? '');
    expect(panelText).toContain('minimax-portal');
    expect(panelText).toContain('可用模型');
  });

  test('config API returns wizard information', async ({ page }) => {
    const configResult = await page.evaluate(async () => {
      const r = await fetch('/api/openclaw/config');
      const data = await r.json();
      return {
        status: r.status,
        hasWizard: !!(data?.parsed?.wizard),
        wizardKeys: Object.keys(data?.parsed?.wizard ?? {}),
      };
    });
    expect(configResult.status).toBe(200);
    expect(configResult.hasWizard).toBe(true);
    expect(configResult.wizardKeys).toContain('lastRunAt');
    expect(configResult.wizardKeys).toContain('lastRunCommand');
  });

  test('clicking a model opens confirmation dialog', async ({ page }) => {
    // Use page.evaluate to find model buttons (more reliable than locator.evaluateAll)
    const modelBtnIndex = await page.evaluate(() => {
      const asides = document.querySelectorAll('aside');
      const lastAside = asides[asides.length - 1];
      const buttons = lastAside.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        if ((buttons[i] as HTMLElement).innerText.includes('MiniMax')) {
          return i;
        }
      }
      return -1;
    });
    expect(modelBtnIndex).toBeGreaterThanOrEqual(0);
    const modelBtns = page.locator('aside').last().locator('button');
    await modelBtns.nth(modelBtnIndex).click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('heading', { name: '确认切换模型' });
    await expect(dialog).toBeVisible();
  });

  test('confirmation dialog has cancel and confirm buttons', async ({ page }) => {
    const modelBtnIndex = await page.evaluate(() => {
      const asides = document.querySelectorAll('aside');
      const lastAside = asides[asides.length - 1];
      const buttons = lastAside.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        if ((buttons[i] as HTMLElement).innerText.includes('MiniMax')) {
          return i;
        }
      }
      return -1;
    });
    const modelBtns = page.locator('aside').last().locator('button');
    await modelBtns.nth(modelBtnIndex).click();
    await page.waitForTimeout(500);

    const cancelBtn = page.locator('button:has-text("取消")');
    await expect(cancelBtn).toBeVisible();
    const confirmBtn = page.locator('button:has-text("确认切换")');
    await expect(confirmBtn).toBeVisible();
  });

  test('Escape key closes confirmation dialog', async ({ page }) => {
    const modelBtnIndex = await page.evaluate(() => {
      const asides = document.querySelectorAll('aside');
      const lastAside = asides[asides.length - 1];
      const buttons = lastAside.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        if ((buttons[i] as HTMLElement).innerText.includes('MiniMax')) {
          return i;
        }
      }
      return -1;
    });
    const modelBtns = page.locator('aside').last().locator('button');
    await modelBtns.nth(modelBtnIndex).click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('heading', { name: '确认切换模型' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(dialog).not.toBeVisible();
  });

  test('cancel button closes confirmation dialog', async ({ page }) => {
    const modelBtnIndex = await page.evaluate(() => {
      const asides = document.querySelectorAll('aside');
      const lastAside = asides[asides.length - 1];
      const buttons = lastAside.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        if ((buttons[i] as HTMLElement).innerText.includes('MiniMax')) {
          return i;
        }
      }
      return -1;
    });
    const modelBtns = page.locator('aside').last().locator('button');
    await modelBtns.nth(modelBtnIndex).click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('heading', { name: '确认切换模型' });
    await expect(dialog).toBeVisible();

    await page.locator('button:has-text("取消")').click();
    await page.waitForTimeout(500);

    await expect(dialog).not.toBeVisible();
  });

  test('refresh button is visible in panel header', async ({ page }) => {
    const rightPanel = page.locator('aside').last();
    const refreshBtn = rightPanel.locator('button[title="刷新"]');
    await expect(refreshBtn).toBeVisible();
  });
});
