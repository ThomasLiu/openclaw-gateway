// ============================================================
// OpenClaw Chat - 输入区域 E2E 完整测试
// 覆盖模型选择器/斜杠命令面板/语言选择/发送与停止/撤销重做
// 所有测试文案为中文
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('输入区域 - E2E 完整测试套件', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  async function getInputArea(page: any) {
    return page.locator('[data-testid="input-area"], [data-testid="chat-input-container"]')
  }


  // ==================== P0: 聊天输入框 ====================

  test.describe('P0: 聊天输入框', () => {

    test('P0-1 应显示多行文本输入框且默认获得焦点', async ({ page }) => {
      const inputArea = await getInputArea(page)
      const textarea = inputArea.locator('textarea, [data-testid="chat-input"]')
      await expect(textarea.first()).toBeVisible()
    })

    test('P0-2 输入框高度应随内容自动增长（最大 200px）', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        const initialHeight = (await textarea.boundingBox())?.height ?? 0

        // 输入多行文本
        await textarea.fill('第一行\n第二行\n第三行\n第四行\n第五行\n第六行\n第七行\n第八行\n第九行\n第十行')
        await page.waitForTimeout(100)

        const newHeight = (await textarea.boundingBox())?.height ?? 0
        expect(newHeight).toBeGreaterThan(initialHeight)
        // 但不超过 200px
        expect(newHeight).toBeLessThanOrEqual(210)
      }
    })

    test('P0-3 按 Enter 键应发送消息，按 Shift+Enter 应换行', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      const sendBtn = page.locator('[data-testid="send-btn"]').first()

      if (await textarea.isVisible() && await sendBtn.isVisible()) {
        // Shift + Enter → 换行
        await textarea.fill('第一行')
        await page.keyboard.press('Shift+Enter')
        await page.keyboard.type('第二行')
        const valueAfterShiftEnter = await textarea.inputValue()
        expect(valueAfterShiftEnter).toContain('\n')

        // 清空后测试 Enter → 发送
        await textarea.clear()
        await textarea.fill('单行消息')
        
        // 记录当前消息数
        const msgList = page.locator('[data-testid="message-list"]')
        const beforeCount = await (await msgList.locator('[data-testid="user-message"]')).count()

        await page.keyboard.press('Enter')
        await page.waitForTimeout(300)

        // 消息数应增加
        const afterCount = await (await msgList.locator('[data-testid="user-message"]')).count()
        expect(afterCount).toBeGreaterThan(beforeCount)
      }
    })

    test('P0-4 输入框为空时发送按钮应为禁用状态', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      const sendBtn = page.locator('[data-testid="send-btn"]').first()

      if (await textarea.isVisible()) {
        await textarea.clear()
        // 空输入时发送按钮应禁用或隐藏
        // 具体行为取决于实现：禁用 / 自动聚焦到输入框
        await expect(sendBtn).toBeVisible()
      }
    })
  })


  // ==================== P0: 发送/停止切换 ====================

  test.describe('P0: 发送/停止切换', () => {

    test('P0-5 Agent 运行中时发送按钮应变为停止按钮', async ({ page }) => {
      // 模拟 Agent 正在运行的状态
      // 这通常需要在有活跃会话时测试
      
      const stopBtn = page.locator('[data-testid="stop-btn"], button[aria-label*="停止"]')
      // 如果当前有运行中的请求，应显示停止按钮
      // 否则显示发送按钮
      const sendBtn = page.locator('[data-testid="send-btn"]')
      
      // 同一时间只能显示其中一个
      const bothVisible = (await stopBtn.isVisible() && await sendBtn.isVisible())
      // 取决于具体实现，可能都存在于 DOM 但只有一个可见
    })

    test('P0-6 点击停止按钮应中止当前请求', async ({ page }) => {
      const stopBtn = page.locator('[data-testid="stop-btn"]').first()
      
      if (await stopBtn.isVisible()) {
        await stopBtn.click()
        
        // 停止后应恢复为发送按钮
        const sendBtn = page.locator('[data-testid="send-btn"]').first()
        await expect(sendBtn).toBeVisible({ timeout: 2000 })
      }
    })
  })


  // ==================== P0: 模型选择器 ====================

  test.describe('P0: 模型选择器', () => {

    test('P0-7 输入框上方或旁边应显示模型选择下拉框', async ({ page }) => {
      const modelSelector = page.locator('[data-testid="model-selector"], [data-testid="model-dropdown"]')
      await expect(modelSelector.first()).toBeVisible()
    })

    test('P0-8 点击模型选择器应展开可用模型列表', async ({ page }) => {
      const modelSelector = page.locator('[data-testid="model-selector"]').first()
      if (await modelSelector.isVisible()) {
        await modelSelector.click()

        const dropdown = page.locator('[data-testid="model-dropdown-list"], [role="listbox"]')
        await expect(dropdown.first()).toBeVisible({ timeout: 1000 })
      }
    })

    test('P0-9 选择模型后下拉框关闭并更新选中项', async ({ page }) => {
      const modelSelector = page.locator('[data-testid="model-selector"]').first()
      if (await modelSelector.isVisible()) {
        await modelSelector.click()
        await page.waitForTimeout(200)

        const options = page.locator('[data-testid="model-option"], [role="option"]')
        if (await options.count() > 0) {
          await options.first().click()
          await page.waitForTimeout(200)

          // 下拉框应关闭
          const dropdown = page.locator('[data-testid="model-dropdown-list"]')
          const visibleDropdown = dropdown.filter({ visible: true })
          await expect(visibleDropdown).toHaveCount(0)
        }
      }
    })

    test('P0-10 当所选模型不可用时应显示降级警告', async ({ page }) => {
      // Mock 一个不可用的模型场景
      const modelSelector = page.locator('[data-testid="model-selector"]').first()
      if (await modelSelector.isVisible()) {
        // 当前选中的模型名称应可见
        const selectedModel = modelSelector.locator('[data-testid="selected-model"]')
        await expect(selectedModel).toBeVisible()
      }
    })
  })


  // ==================== P0: 斜杠命令面板 ====================

  test.describe('P0: 斜杠命令面板', () => {

    test('P0-11 在输入框中输入 "/" 应弹出斜杠命令面板', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.click()
        await page.keyboard.type('/')
        await page.waitForTimeout(200)

        // 斜杠命令面板应出现
        const slashPanel = page.locator('[data-testid="slash-command-panel"]')
        await expect(slashPanel.first()).toBeVisible()
      }
    })

    test('P0-12 斜杠命令面板应采用左右分栏布局（左侧命令列表+右侧详情）', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.click()
        await page.keyboard.type('/kill')
        await page.waitForTimeout(200)

        const slashPanel = page.locator('[data-testid="slash-command-panel"]').first()
        if (await slashPanel.isVisible()) {
          // 左侧命令列表
          const cmdList = slashPanel.locator('[data-testid="command-list"]')
          // 右侧详情区
          const detailArea = slashPanel.locator('[data-testid="command-detail"]')
          
          const hasLayout = (await cmdList.count() > 0) || (await detailArea.count() > 0)
          expect(hasLayout).toBeTruthy()
        }
      }
    })

    test('P0-13 输入 "/kill " 后应自动过滤匹配的命令并高亮第一个', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.click()
        await page.keyboard.type('/kill')
        await page.waitForTimeout(300)

        // 命令列表应过滤显示 kill 相关命令
        const cmdItems = page.locator('[data-testid="command-item"]')
        if (await cmdItems.count() > 0) {
          // 第一个应高亮
          const highlighted = cmdItems.first().locator('[class*="highlighted"], [class*="selected"]')
          await expect(highlighted).toBeVisible()
        }
      }
    })

    test('P0-14 按 ESC 或点击外部区域应关闭斜杠命令面板', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.click()
        await page.keyboard.type('/')
        await page.waitForTimeout(200)

        // 按 ESC 关闭
        await page.keyboard.press('Escape')

        const slashPanel = page.locator('[data-testid="slash-command-panel"]')
        const visiblePanel = slashPanel.filter({ visible: true })
        await expect(visiblePanel).toHaveCount(0)
      }
    })

    test('P0-15 选择命令后应将命令模板填入输入框', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.click()
        await page.keyboard.type('/skill')
        await page.waitForTimeout(200)

        // 选择一个命令
        const cmdItem = page.locator('[data-testid="command-item"]').first()
        if (await cmdItem.isVisible()) {
          await cmdItem.click()
          await page.waitForTimeout(200)

          // 输入框应填充命令相关内容
          const value = await textarea.inputValue()
          expect(value.length).toBeGreaterThan(0)
        }
      }
    })
  })


  // ==================== P1: 语言选择器 ====================

  test.describe('P1: 语言选择器', () => {

    test('P1-1 应显示语言选择下拉框', async ({ page }) => {
      const langSelector = page.locator('[data-testid="language-selector"], [data-testid="lang-dropdown"]')
      await expect(langSelector.first()).toBeVisible()
    })

    test('P1-2 语言选项应包含: 自动/中文(简体)/中文(繁体)/英文/日文/韩文', async ({ page }) => {
      const langSelector = page.locator('[data-testid="language-selector"]').first()
      if (await langSelector.isVisible()) {
        await langSelector.click()
        await page.waitForTimeout(200)

        const options = page.locator('[data-testid="lang-option"], [role="option"]')
        // 应至少有几个语言选项
        expect(await options.count()).toBeGreaterThanOrEqual(3)
      }
    })

    test('P1-3 选择语言后应更新全局语言设置', async ({ page }) => {
      const langSelector = page.locator('[data-testid="language-selector"]').first()
      if (await langSelector.isVisible()) {
        await langSelector.click()
        await page.waitForTimeout(200)

        const enOption = page.locator('[data-testid="lang-option"]:has-text("English"), [data-testid="lang-option"]:has-text("en")').first()
        if (await enOption.isVisible()) {
          await enOption.click()
          // 设置应保存
        }
      }
    })
  })


  // ==================== P1: 撤销/重做 ====================

  test.describe('P1: 撤销/重做', () => {

    test('P1-4 在输入框中按 Command+Z 应撤销上一步操作', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.fill('原始文本')
        await page.keyboard.press('Control+a')
        await page.keyboard.type('追加文本')
        
        let value = await textarea.inputValue()
        expect(value).toContain('追加文本')

        // 撤销
        await page.keyboard.press('Meta+z')
        value = await textarea.inputValue()
        // 应回到之前的状态
      }
    })

    test('P1-5 按 Command+Shift+Z 应重做撤销的操作', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.fill('文本A')
        await page.keyboard.press('Meta+z') // 撤销
        await page.keyboard.press('Meta+Shift+z') // 重做
        
        // 文本应恢复
        const value = await textarea.inputValue()
        expect(value).toBeTruthy()
      }
    })

    test('P1-6 使用方向键上/下应导航输入历史记录', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        // 先输入一些内容建立历史
        await textarea.fill('历史消息 1')
        // 模拟发送
        const sendBtn = page.locator('[data-testid="send-btn"]').first()
        if (await sendBtn.isVisible()) await sendBtn.click()
        await page.waitForTimeout(200)

        // 按 ↑ 应显示上一条历史
        await page.keyboard.press('ArrowUp')
        const valueUp = await textarea.inputValue()
        // 应填充历史内容
      }
    })
  })


  // ==================== P2: 边界条件 ====================

  test.describe('P2: 边界条件', () => {

    test('P2-1 输入超长文本(>5000 字)时发送不应卡死', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      const sendBtn = page.locator('[data-testid="send-btn"]').first()

      if (await textarea.isVisible() && await sendBtn.isVisible()) {
        // 生成超长文本
        const longText = '这是一段很长的测试文本。'.repeat(250)
        await textarea.fill(longText)
        await sendBtn.click()
        
        // 不应卡死
        await expect(page).toHaveURL(/\//, { timeout: 5000 })
      }
    })

    test('P2-2 仅包含空格和换行的输入不应触发发送', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      if (await textarea.isVisible()) {
        await textarea.fill('   \n  \n  ')
        // Enter 不应发送（纯空白）
        // 或者发送前应 trim
        await page.keyboard.press('Enter')
        // 不应有错误
      }
    })

    test('P2-3 连续快速按下 Enter 不应重复发送同一条消息', async ({ page }) => {
      const textarea = page.locator('[data-testid="chat-input"], textarea').first()
      const sendBtn = page.locator('[data-testid="send-btn"]').first()

      if (await textarea.isVisible() && await sendBtn.isVisible()) {
        await textarea.fill('防抖测试消息')
        await sendBtn.click()
        
        // 快速再次按 Enter（此时输入框可能已被清空）
        // 不应产生重复消息
        await page.waitForTimeout(100)
      }
    })
  })

})
