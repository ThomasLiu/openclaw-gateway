// ============================================================
// OpenClaw Chat - GatewayClient Mock
// 完整 Mock GatewayClient（WS/RPC）
// 可注入自定义响应
// ============================================================

import { vi } from 'vitest'
import type { ConnectionState } from '@/types'

/** Mock 响应配置 */
interface MockResponseConfig<T = unknown> {
  data?: T
  error?: Error
  delay?: number
}

/** Mock 订阅数据 */
interface MockSubscriptionConfig<T = unknown> {
  dataGenerator?: () => AsyncIterable<T>
  items?: T[]
  interval?: number
}

/**
 * GatewayClient Mock 类
 * 模拟完整的 GatewayClient 接口
 */
export class MockGatewayClient implements import('@/types').IGatewayClient {
  private _connectionState: ConnectionState = 'disconnected'
  private _url = ''
  private _lastError?: string
  private _reconnectCount = 0

  /** 存储所有方法调用的历史记录 */
  callHistory: Array<{ method: string; params: unknown; timestamp: number }> = []

  /** 存储事件监听器 */
  eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  /** 存储订阅 */
  subscriptions: Map<string, AsyncIterable<unknown>> = new Map()

  /** 自定义响应映射 */
  responseMap = new Map<string, MockResponseConfig>()

  /** 自定义订阅映射 */
  subscriptionMap = new Map<string, MockSubscriptionConfig>()

  /**
   * 设置方法的模拟响应
   * @param method 方法名
   * @param config 响应配置
   */
  setMockResponse<T>(method: string, config: MockResponseConfig<T>) {
    this.responseMap.set(method, config as MockResponseConfig<unknown>)
  }

  /**
   * 设置方法的模拟订阅
   * @param method 方法名
   * @param config 订阅配置
   */
  setMockSubscription<T>(method: string, config: MockSubscriptionConfig<T>) {
    this.subscriptionMap.set(method, config as MockSubscriptionConfig<unknown>)
  }

  /**
   * 清除所有 mocks
   */
  clearMocks() {
    this.callHistory = []
    this.eventListeners.clear()
    this.subscriptions.clear()
    this.responseMap.clear()
    this.subscriptionMap.clear()
  }

  // ==================== IGatewayClient 实现 ====================

  async connect(): Promise<void> {
    this._connectionState = 'connecting'
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 10))
    
    this._connectionState = 'connected'
    this._lastError = undefined
    
    // 触发连接成功事件
    this.emit('connected')
  }

  disconnect(): void {
    this._connectionState = 'disconnected'
    this.emit('disconnected')
  }

  getConnectionState(): ConnectionState {
    return this._connectionState
  }

  async call<T>(method: string, params?: unknown): Promise<T> {
    // 记录调用历史
    this.callHistory.push({
      method,
      params,
      timestamp: Date.now(),
    })

    const config = this.responseMap.get(method)

    if (!config) {
      throw new Error(`No mock configured for method: ${method}`)
    }

    if (config.error) {
      throw config.error
    }

    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay))
    }

    return config.data as T
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(handler)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(handler)
    }
  }

  subscribe(method: string, params?: unknown): AsyncIterable<unknown> {
    const config = this.subscriptionMap.get(method)

    if (config?.dataGenerator) {
      return config.dataGenerator()
    }

    if (config?.items) {
      const interval = config.interval ?? 1000
      
      return {
        [Symbol.asyncIterator]() {
          let index = 0
          const items = config.items!
          
          return {
            async next() {
              if (index >= items.length) {
                return { done: true, value: undefined }
              }
              
              await new Promise(resolve => setTimeout(resolve, interval))
              
              return { done: false, value: items[index++] }
            },
          }
        },
      } as AsyncIterable<unknown>
    }

    // 默认返回空的可迭代对象
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            return { done: true, value: undefined }
          },
        }
      },
    } as AsyncIterable<unknown>
  }

  // ==================== 辅助方法 ====================

  /**
   * 触发事件
   */
  emit(event: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(handler => handler(...args))
    }
  }

  /**
   * 设置连接状态（用于测试）
   */
  setConnectionState(state: ConnectionState) {
    this._connectionState = state
  }

  /**
   * 获取重连计数
   */
  getReconnectCount() {
    return this._reconnectCount
  }

  /**
   * 增加重连计数
   */
  incrementReconnectCount() {
    this._reconnectCount++
  }

  /**
   * 重置重连计数
   */
  resetReconnectCount() {
    this._reconnectCount = 0
  }

  /**
   * 获取最后错误信息
   */
  getLastError() {
    return this._lastError
  }

  /**
   * 获取 URL
   */
  getUrl() {
    return this._url
  }

  /**
   * 设置 URL（用于测试）
   */
  setUrl(url: string) {
    this._url = url
  }
}

/**
 * 创建一个预配置的 MockGatewayClient 实例
 * @param options 初始配置选项
 * @returns 配置好的 MockGatewayClient 实例
 */
export function createMockGatewayClient(options?: {
  initialState?: ConnectionState
  url?: string
  responses?: Record<string, MockResponseConfig>
}) {
  const client = new MockGatewayClient()

  if (options?.initialState) {
    client.setConnectionState(options.initialState)
  }

  if (options?.url) {
    client.setUrl(options.url)
  }

  if (options?.responses) {
    Object.entries(options.responses).forEach(([method, config]) => {
      client.setMockResponse(method, config)
    })
  }

  return client
}
