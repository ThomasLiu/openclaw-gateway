/**
 * AgentsStore - Agent 列表数据存储（订阅者模式）
 *
 * 所有需要 Agent 数据的组件订阅此 store，而不是各自拉取数据。
 * 只有一个地方定时刷新，避免重复请求。
 *
 * 使用方法：
 * ```ts
 * const store = getAgentsStore();
 * const unsubscribe = store.subscribe((agents) => {
 *   console.log('agents updated:', agents);
 * });
 * // 取消订阅
 * unsubscribe();
 * ```
 */

import type { AgentInfo } from "@/components/chat-types";
import { readUnreadSnapshot } from "./session-unread-snapshot";

export type AgentsStoreState = {
  agents: AgentInfo[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

type Subscriber = (state: AgentsStoreState) => void;

const REFRESH_INTERVAL_MS = 10_000; // 10 秒刷新一次

class AgentsStore {
  private state: AgentsStoreState = {
    agents: [],
    loading: true,
    error: null,
    lastUpdated: null,
  };

  private subscribers = new Set<Subscriber>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    // 延迟初始化，等 React 挂载后再开始刷新
    if (typeof window !== "undefined") {
      setTimeout(() => this.startAutoRefresh(), 1000);
    }
  }

  /** 获取当前状态 */
  getState(): AgentsStoreState {
    return this.state;
  }

  /** 订阅状态变化，返回取消订阅函数 */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    // 立即调用一次，传入当前状态
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /** 通知所有订阅者 */
  private notify(): void {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }

  /** 开始自动刷新 */
  startAutoRefresh(): void {
    if (this.refreshTimer !== null) return;
    this.refreshTimer = setInterval(() => {
      this.refresh().catch(() => {
        // 静默忽略刷新错误
      });
    }, REFRESH_INTERVAL_MS);
  }

  /** 停止自动刷新 */
  stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /** 手动刷新数据 */
  async refresh(): Promise<void> {
    // 如果已经在刷新中，等待上一个完成
    if (this.refreshPromise !== null) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** 格式化相对时间 */
  private formatRelativeTime(dateStr: string | undefined): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return "刚刚";
  }

  /** 执行实际刷新逻辑 */
  private async doRefresh(): Promise<void> {
    const wasFirstLoad = this.state.loading;

    // 设置 loading 状态（首次加载时才显示 loading）
    if (wasFirstLoad) {
      this.state = { ...this.state, loading: true, error: null };
      this.notify();
    }

    try {
      const resp = await fetch("/api/agents");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const basicAgents: Array<{ id: string; name?: string; label?: string; description?: string }> = data.agents ?? [];

      // 读取未读快照
      const unreadSnapshot = readUnreadSnapshot();

      // 为每个 agent 并行获取 sessions 信息
      const agentInfos = await Promise.all(
        basicAgents.map(async (a) => {
          const baseInfo: AgentInfo = {
            id: a.id,
            label: a.label ?? a.name ?? a.id,
            description: a.description,
            isArchitect: a.id === "agent-architect",
            isWorking: false,
            unreadCount: 0,
          };

          try {
            // 获取该 agent 的 sessions
            const sessionsResp = await fetch(`/api/gateway/sessions?agentId=${encodeURIComponent(a.id)}&limit=100`);
            if (sessionsResp.ok) {
              const sessionsData = await sessionsResp.json();
              const sessions: Array<{
                key: string;
                lastMessage?: string;
                preview?: string;
                updatedAt?: string;
                status?: string;
              }> = sessionsData.sessions ?? [];

              // 统计未读消息数
              let unreadCount = 0;
              for (const session of sessions) {
                unreadCount += unreadSnapshot[session.key] ?? 0;
              }

              // 找出最新的 session（用于显示最后消息）
              const sortedSessions = [...sessions].sort((x, y) => {
                const xTime = x.updatedAt ? new Date(x.updatedAt).getTime() : 0;
                const yTime = y.updatedAt ? new Date(y.updatedAt).getTime() : 0;
                return yTime - xTime;
              });

              const latestSession = sortedSessions[0];

              // 检查是否有正在运行的 session
              const isWorking = sessions.some((s) => s.status === "running");

              return {
                ...baseInfo,
                lastSession: latestSession
                  ? {
                      preview: latestSession.preview ?? latestSession.lastMessage ?? "暂无消息",
                      updatedAt: latestSession.updatedAt ?? "",
                      relativeTime: this.formatRelativeTime(latestSession.updatedAt),
                    }
                  : undefined,
                isWorking,
                unreadCount,
              };
            }
          } catch {
            // 获取 sessions 失败，返回基础信息
          }

          return baseInfo;
        })
      );

      this.state = {
        agents: agentInfos,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      // 刷新失败时保留旧数据，只更新 error
      this.state = {
        ...this.state,
        loading: false,
        error,
      };
    }

    this.notify();
  }
}

/** 全局单例 store */
let storeInstance: AgentsStore | null = null;

export function getAgentsStore(): AgentsStore {
  if (storeInstance === null) {
    storeInstance = new AgentsStore();
  }
  return storeInstance;
}

export type { AgentInfo };
