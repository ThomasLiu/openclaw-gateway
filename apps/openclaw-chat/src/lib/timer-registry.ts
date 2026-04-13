/**
 * ============================================================
 * OpenClaw Chat - 统一定时器注册表
 * 
 * 设计目标：
 * 1. 集中管理所有数据轮询定时器，确保一个定时器只有一个实例
 * 2. 通过 Store 进行数据同步，避免分散在各个组件中
 * 3. 支持动态注册/注销，根据应用状态智能启停
 * 4. 提供统一的错误处理和重试机制
 * ============================================================
 */

import { useIDEStore } from '@/store';

// ==================== 类型定义 ====================

/** 定时器回调函数类型 */
type TimerCallback = () => Promise<void> | void;

/** 定时器配置 */
export interface TimerConfig {
  /** 定时器唯一标识 */
  id: string;
  /** 轮询间隔（毫秒） */
  interval: number;
  /** 回调函数 */
  callback: TimerCallback;
  /** 是否立即执行一次 */
  immediate?: boolean;
  /** 错误重试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/** 定时器实例 */
interface TimerInstance {
  id: string;
  config: TimerConfig;
  timerId: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
  lastRun?: number;
  retryCount: number;
}

/** 定时器注册表状态 */
interface TimerRegistryState {
  timers: Map<string, TimerInstance>;
  isInitialized: boolean;
}

// ==================== 默认配置 ====================

/** 默认轮询间隔配置 */
export const POLLING_INTERVALS = {
  /** Gateway 健康检查 - 30秒 */
  GATEWAY_HEALTH: 30_000,
  /** Agent 列表刷新 - 60秒 */
  AGENTS_LIST: 60_000,
  /** Session 列表刷新 - 30秒 */
  SESSIONS_LIST: 30_000,
  /** 消息刷新 - 5秒（当会话激活时） */
  MESSAGES: 5_000,
  /** 日志刷新 - 10秒 */
  LOGS: 10_000,
  /** 模型列表刷新 - 5分钟 */
  MODELS: 5 * 60_000,
} as const;

/** 默认重试配置 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryInterval: 5_000,
};

// ==================== 定时器注册表 ====================

class TimerRegistry {
  private state: TimerRegistryState = {
    timers: new Map(),
    isInitialized: false,
  };

  // ==================== 核心方法 ====================

  /**
   * 注册一个定时器
   * @param config 定时器配置
   * @returns 是否注册成功
   */
  register(config: TimerConfig): boolean {
    const { id } = config;

    // 如果已存在，先停止并移除
    if (this.state.timers.has(id)) {
      console.warn(`[TimerRegistry] Timer "${id}" already exists, stopping previous instance`);
      this.stop(id);
      this.state.timers.delete(id);
    }

    // 创建定时器实例
    const instance: TimerInstance = {
      id,
      config: {
        ...DEFAULT_RETRY_CONFIG,
        immediate: false,
        enabled: true,
        ...config,
      },
      timerId: null,
      isRunning: false,
      retryCount: 0,
    };

    this.state.timers.set(id, instance);
    console.log(`[TimerRegistry] Timer "${id}" registered with interval ${config.interval}ms`);

    // 如果启用，立即启动
    if (instance.config.enabled) {
      this.start(id);
    }

    return true;
  }

  /**
   * 启动指定定时器
   * @param id 定时器ID
   */
  start(id: string): void {
    const instance = this.state.timers.get(id);
    if (!instance) {
      console.warn(`[TimerRegistry] Timer "${id}" not found`);
      return;
    }

    if (instance.isRunning) {
      console.warn(`[TimerRegistry] Timer "${id}" is already running`);
      return;
    }

    const { config } = instance;

    // 立即执行一次（如果配置）
    if (config.immediate) {
      this.execute(id);
    }

    // 启动定时器
    instance.timerId = setInterval(() => {
      this.execute(id);
    }, config.interval);

    instance.isRunning = true;
    console.log(`[TimerRegistry] Timer "${id}" started`);
  }

  /**
   * 停止指定定时器
   * @param id 定时器ID
   */
  stop(id: string): void {
    const instance = this.state.timers.get(id);
    if (!instance) return;

    if (instance.timerId) {
      clearInterval(instance.timerId);
      instance.timerId = null;
    }

    instance.isRunning = false;
    console.log(`[TimerRegistry] Timer "${id}" stopped`);
  }

  /**
   * 注销指定定时器
   * @param id 定时器ID
   */
  unregister(id: string): void {
    this.stop(id);
    this.state.timers.delete(id);
    console.log(`[TimerRegistry] Timer "${id}" unregistered`);
  }

  /**
   * 执行定时器回调
   * @param id 定时器ID
   */
  private async execute(id: string): Promise<void> {
    const instance = this.state.timers.get(id);
    if (!instance) return;

    const { config } = instance;

    try {
      instance.lastRun = Date.now();
      await config.callback();
      instance.retryCount = 0; // 成功后重置重试计数
    } catch (error) {
      console.error(`[TimerRegistry] Timer "${id}" execution failed:`, error);
      
      // 重试逻辑
      if (instance.retryCount < (config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries)) {
        instance.retryCount++;
        console.log(`[TimerRegistry] Timer "${id}" will retry (${instance.retryCount}/${config.maxRetries})`);
        
        setTimeout(() => {
          this.execute(id);
        }, config.retryInterval ?? DEFAULT_RETRY_CONFIG.retryInterval);
      } else {
        console.error(`[TimerRegistry] Timer "${id}" max retries exceeded`);
        instance.retryCount = 0;
      }
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 启动所有定时器
   */
  startAll(): void {
    for (const [id] of this.state.timers) {
      this.start(id);
    }
    console.log('[TimerRegistry] All timers started');
  }

  /**
   * 停止所有定时器
   */
  stopAll(): void {
    for (const [id] of this.state.timers) {
      this.stop(id);
    }
    console.log('[TimerRegistry] All timers stopped');
  }

  /**
   * 清空所有定时器
   */
  clearAll(): void {
    this.stopAll();
    this.state.timers.clear();
    console.log('[TimerRegistry] All timers cleared');
  }

  // ==================== 查询方法 ====================

  /**
   * 获取定时器状态
   * @param id 定时器ID
   */
  getStatus(id: string): { isRunning: boolean; lastRun?: number } | null {
    const instance = this.state.timers.get(id);
    if (!instance) return null;

    return {
      isRunning: instance.isRunning,
      lastRun: instance.lastRun,
    };
  }

  /**
   * 获取所有定时器状态
   */
  getAllStatus(): Array<{ id: string; isRunning: boolean; lastRun?: number }> {
    return Array.from(this.state.timers.entries()).map(([id, instance]) => ({
      id,
      isRunning: instance.isRunning,
      lastRun: instance.lastRun,
    }));
  }

  /**
   * 检查定时器是否存在
   * @param id 定时器ID
   */
  has(id: string): boolean {
    return this.state.timers.has(id);
  }

  /**
   * 检查定时器是否运行中
   * @param id 定时器ID
   */
  isRunning(id: string): boolean {
    const instance = this.state.timers.get(id);
    return instance?.isRunning ?? false;
  }
}

// ==================== 单例导出 ====================

export const timerRegistry = new TimerRegistry();

// ==================== 预设定时器配置 ====================

/**
 * 创建 Gateway 健康检查定时器配置
 */
export function createGatewayHealthTimerConfig(): TimerConfig {
  return {
    id: 'gateway-health',
    interval: POLLING_INTERVALS.GATEWAY_HEALTH,
    immediate: true,
    callback: async () => {
      const store = useIDEStore.getState();
      await store.initGateway();
    },
  };
}

/**
 * 创建 Agent 列表刷新定时器配置
 */
export function createAgentsRefreshTimerConfig(): TimerConfig {
  return {
    id: 'agents-refresh',
    interval: POLLING_INTERVALS.AGENTS_LIST,
    immediate: false,
    callback: async () => {
      const store = useIDEStore.getState();
      await store.fetchAgents();
    },
  };
}

/**
 * 创建 Session 列表刷新定时器配置
 */
export function createSessionsRefreshTimerConfig(agentId: string | null): TimerConfig | null {
  if (!agentId) return null;

  return {
    id: `sessions-refresh-${agentId}`,
    interval: POLLING_INTERVALS.SESSIONS_LIST,
    immediate: false,
    callback: async () => {
      const store = useIDEStore.getState();
      await store.fetchSessions(agentId);
    },
  };
}

/**
 * 创建消息刷新定时器配置
 */
export function createMessagesRefreshTimerConfig(sessionPath: string | null): TimerConfig | null {
  if (!sessionPath) return null;

  return {
    id: `messages-refresh-${sessionPath}`,
    interval: POLLING_INTERVALS.MESSAGES,
    immediate: false,
    callback: async () => {
      const store = useIDEStore.getState();
      await store.fetchMessages(sessionPath);
    },
  };
}

// ==================== 便捷 Hook ====================

/**
 * 初始化应用定时器
 * 在应用启动时调用一次
 */
export function initializeAppTimers(): void {
  // 注册 Gateway 健康检查
  timerRegistry.register(createGatewayHealthTimerConfig());
  
  // 注册 Agent 列表刷新
  timerRegistry.register(createAgentsRefreshTimerConfig());
  
  console.log('[TimerRegistry] App timers initialized');
}

/**
 * 清理应用定时器
 * 在应用卸载时调用
 */
export function cleanupAppTimers(): void {
  timerRegistry.clearAll();
  console.log('[TimerRegistry] App timers cleaned up');
}
