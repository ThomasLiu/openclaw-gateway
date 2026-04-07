// ============================================================
// OpenClaw Chat - Vitest Setup
// 全局测试环境配置
// ============================================================

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ==================== Next.js Navigation Mocks ====================

/**
 * Mock useRouter
 * 提供基本的路由功能 mock
 */
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.pathname,
  useSearchParams: () => new URLSearchParams(),
}))

// ==================== Next.js Image Mock ====================

/**
 * Mock next/image
 * 返回一个简单的 img 标签（使用 React.createElement）
 */
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    require('react').createElement('img', { src, alt, ...props }),
}))

// ==================== next-intl Mocks ====================

/**
 * Mock next-intl
 * 使用中文翻译作为默认翻译，并支持 NextIntlClientProvider
 */
vi.mock('next-intl', async () => {
  const React = await import('react')
  
  // 创建一个 Context 来存储翻译消息
  const MessagesContext = React.createContext<Record<string, unknown>>({})
  
  return {
    // NextIntlClientProvider: 存储消息到 context 并渲染子组件
    NextIntlClientProvider: ({ 
      children, 
      messages,
      locale = 'zh-CN' 
    }: { 
      children: React.ReactNode
      messages?: Record<string, unknown>
      locale?: string 
    }) => {
      return React.createElement(
        MessagesContext.Provider,
        { value: messages || {} },
        children
      )
    },
    
    // useTranslations: 从 context 获取消息并返回翻译函数
    useTranslations: (namespace: string) => {
      // 使用 useContext 获取消息
      // 注意：这里不能直接调用 hooks，需要在组件内部使用
      // 所以我们返回一个包装函数，在运行时获取上下文
      
      // 为了简化，我们创建一个可以在组件中使用的 hook 包装器
      const translateFn = (key: string, values?: Record<string, unknown>): string => {
        // 尝试从全局获取当前的消息（通过 hack 方式）
        // 在实际测试中，我们会在 renderWithProviders 中设置这些值
        
        // 默认的中文翻译映射（fallback）
        const defaultTranslations: Record<string, Record<string, string>> = {
          topbar: {
            connection: "连接状态",
            connected: "已连接",
            connecting: "连接中...",
            disconnected: "已断开",
            reconnecting: "重连中...",
            version: "版本",
            updateAvailable: "有可用更新",
            cliCommands: "CLI 指令",
            clickToReconnect: "点击重新连接"
          },
          agent: {
            title: "Agents",
            noAgent: "暂无 Agent",
            lastMessage: "最后消息",
            working: "工作中...",
            unread: "{count} 条未读",
            addAgent: "添加 Agent",
            deleteConfirm: "确定要删除 Agent \"{name}\" 吗？此操作不可撤销。",
            export: "导出配置",
            exporting: "正在导出..."
          },
          session: {
            title: "会话",
            noSession: "暂无会话",
            deleteConfirm: "确定要删除该会话吗？",
            userMessage: "用户: ",
            agentReply: "助手: "
          },
          message: {
            copy: "复制",
            copied: "已复制",
            delete: "删除",
            deleteConfirm: "确定要删除这条消息吗？此操作不可撤销。",
            quote: "引用",
            speak: "朗读",
            stopSpeaking: "停止朗读",
            batchDelete: "删除所选 ({count} 条)",
            quoteFrom: "引用自 @{role} 于 {time}",
            thinking: "思考过程",
            streaming: "正在输入...",
            toolCall: "工具调用",
            expand: "展开",
            collapse: "折叠",
            inputParams: "输入参数"
          },
          input: {
            placeholder: "输入消息... (/ 触发命令面板)",
            send: "发送",
            stop: "停止",
            selectModel: "选择模型",
            defaultModel: "默认模型",
            modelNotAvailable: "所选模型不可用，将使用默认模型"
          },
          language: {
            auto: "自动检测",
            "zh-CN": "简体中文",
            "zh-TW": "繁體中文",
            en: "English",
            ja: "日本語",
            ko: "한국어"
          },
          common: {
            loading: "加载中...",
            error: "出错",
            retry: "重试",
            confirm: "确认",
            cancel: "取消",
            close: "关闭",
            save: "保存",
            delete: "删除",
            edit: "编辑",
            add: "添加",
            refresh: "刷新",
            more: "更多",
            settings: "设置",
            search: "搜索..."
          },
          "detailPanel.tabs": {
            config: "配置",
            history: "历史",
            skills: "技能",
            mcp: "MCP",
            subagent: "子代理",
            models: "模型",
            memory: "记忆",
            workspace: "工作区",
            cron: "定时任务",
            channels: "渠道",
            logs: "日志"
          },
          "detailPanel.logPanel": {
            title: "日志",
            searchPlaceholder: "搜索日志...",
            filter: "过滤",
            loading: "加载日志中...",
            empty: "暂无日志记录",
            clearFilters: "清除过滤",
            newLogs: "条新日志",
            scrollToBottom: "回到底部",
            level: {
              debug: "调试",
              info: "信息",
              warn: "警告",
              error: "错误",
              fatal: "致命"
            },
            source: "来源",
            collaborate: "协作排查",
            expand: "展开",
            collapse: "折叠",
            matchCount: "{count} 条匹配"
          },
          "detailPanel.configEditor": {
            title: "配置编辑器",
            viewMode: "查看模式",
            editMode: "编辑模式",
            save: "保存",
            cancel: "取消",
            editing: "正在编辑...",
            saved: "已保存",
            saveError: "保存失败",
            original: "原始版本",
            modified: "修改版本"
          },
          "detailPanel.llmHistory": {
            title: "LLM 发送历史",
            empty: "暂无历史记录",
            loading: "加载中...",
            loadMore: "加载更多",
            scrollBehavior: {
              autoScroll: "自动滚动",
              pause: "暂停",
              scrollToBottom: "回到底部",
              newMessages: "条新消息"
            }
          },
          "detailPanel.skillManager": {
            title: "技能管理",
            empty: "暂无技能",
            skillMdTitle: "技能说明"
          },
          "detailPanel.modelManager": {
            title: "模型配置",
            empty: "暂无模型配置",
            jsonEditor: "JSON 编辑器"
          },
          "detailPanel.memoryManager": {
            title: "记忆管理",
            memoryMd: "MEMORY.md",
            memoryFiles: "记忆文件列表",
            indexStatus: "索引状态",
            indexed: "已索引",
            notIndexed: "未索引",
            empty: "暂无记忆文件"
          },
          "detailPanel.workspaceBrowser": {
            title: "工作区浏览器",
            empty: "工作区为空"
          },
          "detailPanel.cronManager": {
            title: "定时任务",
            empty: "暂无定时任务",
            jsonConfig: "JSON 配置"
          },
          "detailPanel.channelManager": {
            title: "通信渠道",
            empty: "暂无通信渠道"
          },
          "detailPanel.mcpManager": {
            title: "MCP 服务器管理",
            empty: "暂无 MCP 服务器",
            configEditor: "配置编辑器"
          },
          "detailPanel.subagentTab": {
            title: "子代理配置",
            empty: "暂无子代理配置"
          },
          slashCommand: {
            title: "命令面板",
            pressEsc: "按 ESC 关闭",
            searchPlaceholder: "搜索命令...",
            noResults: "无匹配命令",
            selectAgent: "选择命令查看详情",
            argument: "参数",
            example: "示例",
            agents: "可用 Agent",
            skills: "可用技能",
            models: "可用模型"
          },
          chat: {
            emptyTitle: "开始一段对话",
            emptyState: "欢迎使用 OpenClaw IDE",
            newChat: "新建对话",
            startNewChatDesc: "发送消息开始新的对话",
            recentSession: "最近会话",
            openRecentSessionDesc: "继续之前的对话",
            browseExamples: "浏览示例",
            browseExamplesDesc: "探索常用命令和用法",
            viewDocs: "查看文档",
            viewDocsDesc: "阅读完整的使用文档"
          }
        }
        
        // 先尝试从 namespace 翻译中查找
        const nsTranslations = defaultTranslations[namespace]
        if (nsTranslations && key in nsTranslations) {
          let result = (nsTranslations as Record<string, string>)[key]
          
          // 处理参数替换
          if (values) {
            for (const [k, v] of Object.entries(values)) {
              result = result.replace(`{${k}}`, String(v))
            }
          }
          
          return result
        }
        
        // Fallback: 返回 key 本身
        return `${namespace}.${key}`
      }
      
      return translateFn
    },
    
    useLocale: () => 'zh-CN',
    useMessages: () => ({}),
    useNow: () => new Date(),
    useTimeZone: () => 'Asia/Shanghai',
  }
})

// ==================== Global Fetch Mock ====================

/**
 * Mock global fetch
 * 默认返回 404 响应
 */
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ error: 'Not Found' }),
    text: async () => 'Not Found',
  } as Response)
) as typeof fetch

// ==================== Global WebSocket Mock ====================

/**
 * Mock WebSocket
 * 提供基本的 WebSocket 功能 mock
 */
class MockWebSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  protocol: string

  constructor(url: string, protocols?: string | string[]) {
    super()
    this.url = url
    this.protocol = Array.isArray(protocols) ? protocols[0] ?? '' : protocols ?? ''

    // 模拟连接过程
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.dispatchEvent(new Event('open'))
    }, 0)
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.dispatchEvent(new CloseEvent('close', { code, reason }))
    }, 0)
  }
}

global.WebSocket = MockWebSocket as any

// ==================== Global localStorage Mock ====================

if (typeof localStorage === 'undefined') {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}

    return {
      getItem: (key: string): string | null => store[key] ?? null,
      setItem: (key: string, value: string): void => {
        store[key] = String(value)
      },
      removeItem: (key: string): void => {
        delete store[key]
      },
      clear: (): void => {
        store = {}
      },
      get length(): number {
        return Object.keys(store).length
      },
      key: (index: number): string | null => {
        const keys = Object.keys(store)
        return keys[index] ?? null
      },
    }
  })()

  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
}

// ==================== Clipboard API Mock ====================

/**
 * Mock Clipboard API (用于代码块复制功能)
 * 注意：happy-dom 中 navigator.clipboard 是只读属性，需用 defineProperty
 */
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
})

/**
 * Mock SpeechSynthesis API (用于 AssistantMessage 的朗读功能)
 * 注意：需要同时设置 global 和 window 上的属性（happy-dom 环境中两者可能不同）
 */
const mockSpeechSynthesisUtterance = vi.fn()
const mockSpeechSynthesisSpeak = vi.fn()
const mockSpeechSynthesisCancel = vi.fn()

const mockSpeechSynthesis = {
  speak: mockSpeechSynthesisSpeak,
  cancel: mockSpeechSynthesisCancel,
  paused: false,
  pending: false,
  speaking: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}

// 增强 speak mock：自动触发 utterance 的 onstart 回调
// 这样组件内的 setIsSpeaking(true) 才会被调用，stop-speak-button 才会渲染
const originalSpeak = mockSpeechSynthesisSpeak.mockImplementation((utterance: any) => {
  // 模拟浏览器行为：speak 调用后触发 onstart
  if (utterance && typeof utterance.onstart === 'function') {
    utterance.onstart()
  }
})

global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance as any
global.SpeechSynthesis = mockSpeechSynthesis as any

// 同时设置到 window 对象（happy-dom 中组件通过 window.speechSynthesis 访问）
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: mockSpeechSynthesisUtterance,
  writable: true,
  configurable: true,
})

// ==================== Test Helpers ====================

export function clearAllMocks() {
  vi.clearAllMocks()
}

export function resetAllMocks() {
  vi.resetAllMocks()
}

export function clearAllTimers() {
  vi.clearAllTimers()
}

export function useFakeTimers() {
  vi.useFakeTimers()
}

export function useRealTimers() {
  vi.useRealTimers()
}
