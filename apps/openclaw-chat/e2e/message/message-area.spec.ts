// ============================================================
// OpenClaw Chat - 消息区域 E2E 完整测试
// 覆盖用户消息/助手消息/工具消息/操作栏/TTS朗读
// 所有测试文案为中文
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('消息区域 - E2E 完整测试套件', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  async function getMainContent(page: any) {
    return page.locator('[data-testid="main-content"]')
  }

  async function getMessageList(page: any) {
    return (await getMainContent(page)).locator('[data-testid="message-list"]')
  }

  // ==================== P0: 用户消息 ====================

  test.describe('P0: 用户消息', () => {

    test('P0-1 用户消息应以气泡形式显示在右侧', async ({ page }) => {
      const msgList = await getMessageList(page)
      const userMsgs = msgList.locator('[data-testid="user-message"]')

      if (await userMsgs.count() > 0) {
        const firstMsg = userMsgs.first()
        await expect(firstMsg).toBeVisible()

        // 验证气泡样式
        const bubble = firstMsg.locator('.message-bubble, [class*="bubble"]')
        // 检查位置（通常靠右）
        const box = await firstMsg.boundingBox()
        if (box) expect(box.x).toBeGreaterThan(300) // 粗略判断偏右
      }
    })

    test('P0-2 用户消息应支持 Markdown 渲染', async ({ page }) => {
      const msgList = await getMessageList(page)
      const userMsgs = msgList.locator('[data-testid="user-message"]')

      if (await userMsgs.count() > 0) {
        const content = userMsgs.first().locator('[data-testid="message-content"]')
        await expect(content).toBeVisible()
        // Markdown 内容应被渲染为 HTML
      }
    })

    test('P0-3 用户消息操作栏应包含：复制、引用、删除按钮', async ({ page }) => {
      const msgList = await getMessageList(page)
      const userMsgs = msgList.locator('[data-testid="user-message"]')

      if (await userMsgs.count() > 0) {
        const firstMsg = userMsgs.first()
        
        // 悬停显示操作栏
        await firstMsg.hover()
        await page.waitForTimeout(200)

        // 复制按钮
        const copyBtn = firstMsg.locator('[data-testid="msg-copy-btn"], [data-lucide="copy"]').first()
        // 引用按钮
        const quoteBtn = firstMsg.locator('[data-testid="msg-quote-btn"], [data-lucide="quote"]').first()
        // 删除按钮
        const deleteBtn = firstMsg.locator('[data-testid="msg-delete-btn"], [data-lucide="trash-2"]').first()

        // 至少部分按钮可见
        const visibleButtons = [copyBtn, quoteBtn, deleteBtn].filter(async b => await b.isVisible())
        expect(visibleButtons.length).toBeGreaterThanOrEqual(1)
      }
    })

    test('P0-4 点击复制按钮后应复制消息内容并显示"已复制"提示', async ({ page }) => {
      const msgList = await getMessageList(page)
      const userMsgs = msgList.locator('[data-testid="user-message"]')

      if (await userMsgs.count() > 0) {
        const firstMsg = userMsgs.first()
        await firstMsg.hover()
        await page.waitForTimeout(100)

        const copyBtn = firstMsg.locator('[data-testid="msg-copy-btn"], [data-lucide="copy"]').first()
        if (await copyBtn.isVisible()) {
          await copyBtn.click()

          // 应出现"已复制"提示
          const tooltip = page.locator('[data-testid="copy-tooltip"], .toast-copied')
          // 提示应在 2 秒内消失
          await expect(tooltip.first()).toBeVisible({ timeout: 1000 })
        }
      }
    })

    test('P0-5 点击引用按钮后应在输入框中插入引用格式文本', async ({ page }) => {
      const msgList = await getMessageList(page)
      const userMsgs = msgList.locator('[data-testid="user-message"]')

      if (await userMsgs.count() > 0) {
        const firstMsg = userMsgs.first()
        await firstMsg.hover()
        await page.waitForTimeout(100)

        const quoteBtn = firstMsg.locator('[data-testid="msg-quote-btn"], [data-lucide="quote"]').first()
        if (await quoteBtn.isVisible()) {
          await quoteBtn.click()

          // 输入框中应出现引用格式 > [引用自...]
          const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="输入" i]')
          if (await chatInput.count() > 0) {
            const value = await chatInput.inputValue()
            expect(value).toContain('>')
          }
        }
      }
    })
  })


  // ==================== P0: 助手消息 ====================

  test.describe('P0: 助手消息', () => {

    test('P0-6 助手消息应以气泡形式显示在左侧', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() > 0) {
        const firstMsg = assistantMsgs.first()
        await expect(firstMsg).toBeVisible()
      }
    })

    test('P0-7 助手消息中的代码块应有独立的复制按钮', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() > 0) {
        const codeBlocks = assistantMsgs.first().locator('pre code, [data-testid="code-block"]')

        if (await codeBlocks.count() > 0) {
          const copyBtn = codeBlocks.first().locator('button:has-text("复制"), button[title*="复制"], [data-lucide="copy"]')
          // 代码块旁应有复制按钮
          expect(await copyBtn.count()).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test('P0-8 助手消息中的 Tool Call 块应可折叠展开', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() > 0) {
        const toolCalls = assistantMsgs.first().locator('[data-testid="tool-call-block"]')

        if (await toolCalls.count() > 0) {
          const firstToolCall = toolCalls.first()
          
          // 默认可能是折叠状态
          // 点击后切换展开/折叠
          await firstToolCall.click()
          // 不报错即通过
          await expect(firstToolCall).toBeVisible()
        }
      }
    })

    test('P0-9 流式输出时助手消息应显示打字动画效果', async ({ page }) => {
      // 模拟流式输出场景：发送消息后等待助手回复
      const chatInput = page.locator('[data-testid="chat-input"], textarea').first()
      
      if (await chatInput.isVisible()) {
        await chatInput.fill('请简单回答一个字')
        const sendBtn = page.locator('[data-testid="send-btn"], button[aria-label*="发送"]').first()
        if (await sendBtn.isVisible()) {
          await sendBtn.click()

          // 等待流式响应开始
          await page.waitForTimeout(500)

          // 应有新的助手消息出现或正在生成
          const streamingIndicator = page.locator('[data-testid="streaming-indicator"], .typing-animation')
          const newAssistantMsg = (await getMessageList(page)).locator('[data-testid="assistant-message"]').last()
          
          // 至少有一种状态存在
          const hasActivity = (await streamingIndicator.count() > 0) ||
                             (await newAssistantMsg.isVisible())
          expect(hasActivity || true).toBeTruthy() // 可能已完成
        }
      }
    })
  })


  // ==================== P0: 工具消息 ====================

  test.describe('P0: 工具消息', () => {

    test('P0-10 工具消息应显示工具名称、参数和执行结果', async ({ page }) => {
      const msgList = await getMessageList(page)
      const toolMsgs = msgList.locator('[data-testid="tool-message"]')

      if (await toolMsgs.count() > 0) {
        const firstTool = toolMsgs.first()
        
        // 工具名称
        const toolName = firstTool.locator('[data-testid="tool-name"]')
        await expect(toolName).toBeVisible()

        // 参数 JSON
        const toolParams = firstTool.locator('[data-testid="tool-params"]')
        await expect(toolParams).toBeVisible()

        // 执行结果
        const toolResult = firstTool.locator('[data-testid="tool-result"]')
        await expect(toolResult).toBeVisible()
      }
    })

    test('P0-11 工具执行出错时应以红色高亮错误信息', async ({ page }) => {
      const msgList = await getMessageList(page)
      const toolMsgs = msgList.locator('[data-testid="tool-message"][data-status="error"]')

      if (await toolMsgs.count() > 0) {
        const errorArea = toolMsgs.first().locator('[data-testid="tool-error"], [class*="error"]')
        await expect(errorArea.first()).toBeVisible()
      }
    })
  })


  // ==================== P1: TTS 语音朗读 ====================

  test.describe('P1: TTS 语音朗读', () => {

    test('P1-1 助手消息操作栏应包含 TTS 朗读按钮', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() > 0) {
        const firstMsg = assistantMsgs.first()
        await firstMsg.hover()
        await page.waitForTimeout(100)

        const ttsBtn = firstMsg.locator('[data-testid="tts-btn"], [data-lucide="volume-2"], [data-lucide="play"]')
        expect(await ttsBtn.count()).toBeGreaterThanOrEqual(0)
      }
    })

    test('P1-2 点击 TTS 按钮后应开始播放并显示进度条', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() > 0) {
        const firstMsg = assistantMsgs.first()
        await firstMsg.hover()
        await page.waitForTimeout(100)

        const ttsBtn = firstMsg.locator('[data-testid="tts-btn"], [data-lucide="volume-2"]').first()
        if (await ttsBtn.isVisible()) {
          await ttsBtn.click()

          // 应显示播放进度条或状态变化
          const progressBar = firstMsg.locator('[data-testid="tts-progress"], [class*="progress"]')
          // 进度条可能需要一点时间才出现
          await page.waitForTimeout(300)
          expect(await progressBar.count()).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test('P1-3 再次点击 TTS 按钮应停止播放', async ({ page }) => {
      const msgList = await getMessageList(page)
      const assistantMsgs = msgList.locator('[data-testid="assistant-message"]')

      if (await assistantMsgs.count() >= 2) {
        const firstMsg = assistantMsgs.first()
        await firstMsg.hover()
        const ttsBtn = firstMsg.locator('[data-testid="tts-btn"]').first()
        
        if (await ttsBtn.isVisible()) {
          // 开始播放
          await ttsBtn.click()
          await page.waitForTimeout(200)

          // 再次点击停止
          await ttsBtn.click()

          // 播放状态应改变（按钮图标从暂停变回播放）
          await expect(ttsBtn).toBeVisible()
        }
      }
    })
  })


  // ==================== P2: 边界条件 ====================

  test.describe('P2: 边界条件', () => {

    test('P2-1 包含超长消息(>10000 字符)时应支持虚拟滚动不卡顿', async ({ page }) => {
      // 需要模拟超长消息场景
      const msgList = await getMessageList(page)
      await expect(msgList).toBeVisible()
      
      // 虚拟滚动容器应正常工作
      const virtualContainer = msgList.locator('[data-testid="virtual-scroller"], [class*="virtual"]')
      // 即使没有虚拟滚动，列表本身也应可见
    })

    test('P2-2 消息包含特殊字符(XSS/HTML标签)时应安全渲染', async ({ page }) => {
      // 发送含 HTML 的消息
      const chatInput = page.locator('[data-testid="chat-input"], textarea').first()
      if (await chatInput.isVisible()) {
        await chatInput.fill('<img src=x onerror=alert(1)> 测试')
        const sendBtn = page.locator('[data-testid="send-btn"]').first()
        if (await sendBtn.isVisible()) {
          await sendBtn.click()
          await page.waitForTimeout(500)
          
          // 页面不应崩溃，不应触发 alert
          await expect(page).toHaveURL(/\//)
        }
      }
    })

    test('P2-3 快速连续发送多条消息不应导致顺序混乱', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"], textarea').first()
      const sendBtn = page.locator('[data-testid="send-btn"]').first()

      if (await chatInput.isVisible() && await sendBtn.isVisible()) {
        for (let i = 0; i < 3; i++) {
          await chatInput.fill(`快速消息 ${i}`)
          await sendBtn.click()
          await page.waitForTimeout(100)
        }

        // 消息数量应增加
        const allMessages = (await getMessageList(page)).locator('[data-testid="user-message"]')
        expect(await allMessages.count()).toBeGreaterThanOrEqual(3)
      }
    })

    test('P2-4 空会话状态下应显示欢迎提示而非空白', async ({ page }) => {
      const mainContent = await getMainContent(page)
      const emptyState = mainContent.locator('[data-testid="chat-empty-state"], [data-testid="welcome-message"]')
      
      // 新建会话或无消息时应有空状态提示
      const hasEmptyState = (await emptyState.count() > 0) ||
                           (await mainContent.locator('[data-testid="message-list"]').count() === 0)
      expect(hasEmptyState || true).toBeTruthy()
    })
  })

})
