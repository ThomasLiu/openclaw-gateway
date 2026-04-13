/**
 * ============================================================
 * OpenClaw Chat - 定时器管理 Hook
 * 
 * 提供在 React 组件中使用定时器注册表的能力
 * 自动处理组件挂载/卸载时的定时器生命周期
 * ============================================================
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  timerRegistry,
  createGatewayHealthTimerConfig,
  createAgentsRefreshTimerConfig,
  createSessionsRefreshTimerConfig,
  createMessagesRefreshTimerConfig,
  POLLING_INTERVALS,
  type TimerConfig,
} from '@/lib/timer-registry';

// ==================== 类型定义 ====================

interface UseTimerOptions {
  /** 是否立即启动 */
  autoStart?: boolean;
  /** 依赖项变化时重新注册 */
  deps?: React.DependencyList;
}

// ==================== 基础 Hook ====================

/**
 * 使用单个定时器
 * @param config 定时器配置
 * @param options 选项
 */
export function useTimer(
  config: TimerConfig | null,
  options: UseTimerOptions = {}
): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const { autoStart = true, deps = [] } = options;
  const configRef = useRef(config);

  // 更新配置引用
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // 注册和启动定时器
  useEffect(() => {
    if (!config) return;

    // 注册定时器
    timerRegistry.register(config);

    // 如果不自动启动，则停止
    if (!autoStart) {
      timerRegistry.stop(config.id);
    }

    // 清理函数
    return () => {
      timerRegistry.unregister(config.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, autoStart, ...deps]);

  const start = useCallback(() => {
    if (config?.id) {
      timerRegistry.start(config.id);
    }
  }, [config?.id]);

  const stop = useCallback(() => {
    if (config?.id) {
      timerRegistry.stop(config.id);
    }
  }, [config?.id]);

  const isRunning = config?.id ? timerRegistry.isRunning(config.id) : false;

  return { start, stop, isRunning };
}

// ==================== 预置 Hook ====================

/**
 * Gateway 健康检查定时器
 * 自动轮询 Gateway 状态
 */
export function useGatewayHealthTimer(
  options: UseTimerOptions = {}
): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const config = createGatewayHealthTimerConfig();
  return useTimer(config, { autoStart: true, ...options });
}

/**
 * Agent 列表刷新定时器
 */
export function useAgentsRefreshTimer(
  options: UseTimerOptions = {}
): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const config = createAgentsRefreshTimerConfig();
  return useTimer(config, { autoStart: true, ...options });
}

/**
 * Session 列表刷新定时器
 * 根据当前选中的 Agent 动态注册
 */
export function useSessionsRefreshTimer(
  agentId: string | null,
  options: UseTimerOptions = {}
): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const config = agentId ? createSessionsRefreshTimerConfig(agentId) : null;
  return useTimer(config, { 
    autoStart: true, 
    deps: [agentId],
    ...options 
  });
}

/**
 * 消息刷新定时器
 * 根据当前选中的 Session 动态注册
 */
export function useMessagesRefreshTimer(
  sessionPath: string | null,
  options: UseTimerOptions = {}
): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const config = sessionPath ? createMessagesRefreshTimerConfig(sessionPath) : null;
  return useTimer(config, { 
    autoStart: true, 
    deps: [sessionPath],
    ...options 
  });
}

// ==================== 组合 Hook ====================

/**
 * 应用级定时器管理
 * 在应用根组件中使用，管理所有全局定时器
 */
export function useAppTimers(): {
  startAll: () => void;
  stopAll: () => void;
  getStatus: () => Array<{ id: string; isRunning: boolean; lastRun?: number }>;
} {
  // 应用挂载时初始化全局定时器
  useEffect(() => {
    // 注册 Gateway 健康检查
    const gatewayConfig = createGatewayHealthTimerConfig();
    timerRegistry.register(gatewayConfig);

    // 注册 Agent 列表刷新
    const agentsConfig = createAgentsRefreshTimerConfig();
    timerRegistry.register(agentsConfig);

    console.log('[useAppTimers] Global timers initialized');

    // 应用卸载时清理
    return () => {
      // 注意：这里只停止不清除，因为其他组件可能还在使用
      timerRegistry.stopAll();
      console.log('[useAppTimers] Global timers stopped');
    };
  }, []);

  const startAll = useCallback(() => {
    timerRegistry.startAll();
  }, []);

  const stopAll = useCallback(() => {
    timerRegistry.stopAll();
  }, []);

  const getStatus = useCallback(() => {
    return timerRegistry.getAllStatus();
  }, []);

  return { startAll, stopAll, getStatus };
}

/**
 * 选择相关的动态定时器
 * 根据当前选中的 Agent 和 Session 自动管理定时器
 */
export function useSelectionTimers(
  agentId: string | null,
  sessionPath: string | null
): {
  sessionsTimer: { start: () => void; stop: () => void; isRunning: boolean };
  messagesTimer: { start: () => void; stop: () => void; isRunning: boolean };
} {
  const sessionsTimer = useSessionsRefreshTimer(agentId);
  const messagesTimer = useMessagesRefreshTimer(sessionPath);

  return { sessionsTimer, messagesTimer };
}

// ==================== 导出工具 ====================

export { timerRegistry, POLLING_INTERVALS };
export type { TimerConfig };
