'use client';

// ============================================================
// OpenClaw Chat - Zustand IDE Store
// 统一的状态管理，包含 Gateway 连接、选择、布局、日志、输入等状态
// ============================================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ConnectionState,
  AgentMetadata,
  SessionMetadata,
  SessionMessage,
  ModelInfo,
} from '../types';
import { agentAdapterService } from '../services/agent-adapter-service';
import {
  DEFAULT_UI_STATE,
  getAllUIState,
  setUIState,
  pushInputHistory as persistencePushInputHistory,
  getInputHistory as persistenceGetInputHistory,
} from '../lib/persistence';

// ==================== 类型定义 ====================

/** 右侧面板可用的 Tab */
export type RightSidebarTab = 
  | 'config' 
  | 'history' 
  | 'skill' 
  | 'mcp' 
  | 'subagent' 
  | 'model' 
  | 'memory' 
  | 'workspace' 
  | 'cron' 
  | 'channel' 
  | 'log';

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** 支持的语言 */
export type PreferredLanguage = 'auto' | 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko';

/** Gateway 连接状态 */
interface GatewayState {
  status: ConnectionState;
  url: string;
  lastError?: string;
  reconnectCount: number;
}

/** Agent & Session 选择状态 */
interface SelectionState {
  agentId: string | null;
  sessionId: string | null;
}

/** UI 布局状态 */
interface LayoutState {
  leftSidebarVisible: boolean;
  leftSidebarWidth: number;
  rightSidebarVisible: boolean;
  rightSidebarWidth: number;
  rightSidebarActiveTab: RightSidebarTab;
  logPanelExpanded: boolean;
}

/** 日志过滤状态 */
interface LogFiltersState {
  levels: LogLevel[];
  sources: string[];
  searchQuery: string;
}

/** 输入框状态 */
interface InputState {
  modelOverride: Record<string, string>;
  preferredLanguage: PreferredLanguage;
  history: Record<string, string[]>;
}

/** 实时数据状态 */
interface DataState {
  agents: AgentMetadata[];
  sessions: SessionMetadata[];
  messages: SessionMessage[];
  models: ModelInfo[];
  agentsLoading: boolean;
  sessionsLoading: boolean;
  messagesLoading: boolean;
  version: string;
}

/** 完整的 IDE 状态接口 */
export interface IDEState {
  // === 状态切片 ===
  gateway: GatewayState;
  selection: SelectionState;
  layout: LayoutState;
  logFilters: LogFiltersState;
  input: InputState;
  data: DataState;

  // === Gateway Actions ===
  setGatewayStatus: (status: ConnectionState, url?: string, error?: string) => void;
  incrementReconnectCount: () => void;
  resetReconnectCount: () => void;

  // === Selection Actions ===
  selectAgent: (id: string | null) => void;
  selectSession: (id: string | null) => void;
  clearSelection: () => void;

  // === Layout Actions ===
  toggleLeftSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  toggleRightSidebar: () => void;
  setRightSidebarWidth: (width: number) => void;
  setRightSidebarTab: (tab: RightSidebarTab) => void;
  toggleLogPanel: () => void;
  resetLayout: () => void;

  // === Log Filter Actions ===
  setLogLevels: (levels: LogLevel[]) => void;
  toggleLogLevel: (level: LogLevel) => void;
  setLogSources: (sources: string[]) => void;
  addLogSource: (source: string) => void;
  removeLogSource: (source: string) => void;
  setLogSearchQuery: (query: string) => void;
  resetLogFilters: () => void;

  // === Input Actions ===
  setSessionModel: (sessionId: string, model: string) => void;
  clearSessionModel: (sessionId: string) => void;
  setPreferredLanguage: (language: PreferredLanguage) => void;
  pushInputHistory: (sessionId: string, message: string) => void;
  getInputHistoryForSession: (sessionId: string) => string[];
  clearInputHistory: (sessionId: string) => void;

  // === Persistence Actions ===
  loadPersistedState: () => void;
  resetAllToDefaults: () => void;

  // === Data Fetch Actions ===
  setAgents: (agents: AgentMetadata[]) => void;
  setSessions: (sessions: SessionMetadata[]) => void;
  setMessages: (messages: SessionMessage[]) => void;
  setVersion: (version: string) => void;
  fetchAgents: () => Promise<void>;
  fetchSessions: (agentId: string) => Promise<void>;
  fetchMessages: (sessionPath: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  initGateway: () => Promise<void>;
  sendMessage: (agentId: string, message: string, sessionId?: string) => Promise<void>;
  abortSession: (sessionId: string) => Promise<void>;
}

// ==================== 默认值定义 ====================

/** 防止 fetchMessages 重复调用的模块级 ref */
const fetchingRef: { current: string | null } = { current: null };

const DEFAULT_GATEWAY_STATE: GatewayState = {
  status: 'disconnected',
  url: '',
  reconnectCount: 0,
};

const DEFAULT_SELECTION_STATE: SelectionState = {
  agentId: null,
  sessionId: null,
};

const DEFAULT_LAYOUT_STATE: LayoutState = {
  leftSidebarVisible: DEFAULT_UI_STATE.leftSidebarVisible,
  leftSidebarWidth: DEFAULT_UI_STATE.leftSidebarWidth,
  rightSidebarVisible: DEFAULT_UI_STATE.rightSidebarVisible,
  rightSidebarWidth: DEFAULT_UI_STATE.rightSidebarWidth,
  rightSidebarActiveTab: DEFAULT_UI_STATE.rightSidebarActiveTab,
  logPanelExpanded: DEFAULT_UI_STATE.logPanelExpanded,
};

const DEFAULT_LOG_FILTERS_STATE: LogFiltersState = {
  levels: DEFAULT_UI_STATE.logFilters.levels as LogLevel[],
  sources: DEFAULT_UI_STATE.logFilters.sources,
  searchQuery: DEFAULT_UI_STATE.logFilters.searchQuery,
};

const DEFAULT_INPUT_STATE: InputState = {
  modelOverride: {},
  preferredLanguage: DEFAULT_UI_STATE.preferredLanguage,
  history: {},
};

const DEFAULT_DATA_STATE: DataState = {
  agents: [],
  sessions: [],
  messages: [],
  models: [],
  agentsLoading: false,
  sessionsLoading: false,
  messagesLoading: false,
  version: '0.0.0',
};

// ==================== Store 创建 ====================

/**
 * IDE 主 Store
 * 
 * 特性：
 * - 使用 subscribeWithSelector 支持精确订阅，避免不必要的重渲染
 * - 使用 persist 中间件自动持久化部分状态到 localStorage
 * - Gateway 状态和输入历史不持久化（运行时状态）
 */
export const useIDEStore = create<IDEState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ====== 初始状态 ======
        gateway: { ...DEFAULT_GATEWAY_STATE },
        selection: { ...DEFAULT_SELECTION_STATE },
        layout: { ...DEFAULT_LAYOUT_STATE },
        logFilters: { ...DEFAULT_LOG_FILTERS_STATE },
        input: { ...DEFAULT_INPUT_STATE },
        data: { ...DEFAULT_DATA_STATE },

        // ====== Gateway Actions ======
        
        /**
         * 设置 Gateway 连接状态
         */
        setGatewayStatus: (status: ConnectionState, url?: string, error?: string) => {
          set((state) => ({
            gateway: {
              ...state.gateway,
              status,
              ...(url !== undefined && { url }),
              ...(error !== undefined && { lastError: error }),
              // 连接成功时重置错误
              ...(status === 'connected' && { lastError: undefined }),
            },
          }));
        },

        /**
         * 增加重连计数
         */
        incrementReconnectCount: () => {
          set((state) => ({
            gateway: {
              ...state.gateway,
              reconnectCount: state.gateway.reconnectCount + 1,
            },
          }));
        },

        /**
         * 重置重连计数
         */
        resetReconnectCount: () => {
          set((state) => ({
            gateway: {
              ...state.gateway,
              reconnectCount: 0,
            },
          }));
        },

        // ====== Selection Actions ======

        /**
         * 选择 Agent
         * @param id Agent ID，传 null 取消选择
         */
        selectAgent: (id: string | null) => {
          const { selection } = get();
          
          set({
            selection: {
              ...selection,
              agentId: id,
              // 切换 Agent 时清除 Session 选择
              ...(id !== selection.agentId && { sessionId: null }),
            },
          });
        },

        /**
         * 选择 Session
         * @param id Session ID，传 null 取消选择
         */
        selectSession: (id: string | null) => {
          set((state) => ({
            selection: {
              ...state.selection,
              sessionId: id,
            },
          }));
        },

        /**
         * 清除所有选择
         */
        clearSelection: () => {
          set({
            selection: { ...DEFAULT_SELECTION_STATE },
          });
        },

        // ====== Layout Actions ======

        /**
         * 切换左侧栏可见性
         */
        toggleLeftSidebar: () => {
          set((state) => ({
            layout: {
              ...state.layout,
              leftSidebarVisible: !state.layout.leftSidebarVisible,
            },
          }));
        },

        /**
         * 设置左侧栏宽度
         * @param width 宽度（px），范围 200-500
         */
        setLeftSidebarWidth: (width: number) => {
          const clampedWidth = Math.max(200, Math.min(500, width));
          set((state) => ({
            layout: {
              ...state.layout,
              leftSidebarWidth: clampedWidth,
            },
          }));
        },

        /**
         * 切换右侧栏可见性
         */
        toggleRightSidebar: () => {
          set((state) => ({
            layout: {
              ...state.layout,
              rightSidebarVisible: !state.layout.rightSidebarVisible,
            },
          }));
        },

        /**
         * 设置右侧栏宽度
         * @param width 宽度（px），范围 280-600
         */
        setRightSidebarWidth: (width: number) => {
          const clampedWidth = Math.max(280, Math.min(600, width));
          set((state) => ({
            layout: {
              ...state.layout,
              rightSidebarWidth: clampedWidth,
            },
          }));
        },

        /**
         * 设置右侧面板当前激活的 Tab
         */
        setRightSidebarTab: (tab: RightSidebarTab) => {
          set((state) => ({
            layout: {
              ...state.layout,
              rightSidebarActiveTab: tab,
            },
          }));
        },

        /**
         * 切换日志面板展开/收起
         */
        toggleLogPanel: () => {
          set((state) => ({
            layout: {
              ...state.layout,
              logPanelExpanded: !state.layout.logPanelExpanded,
            },
          }));
        },

        /**
         * 重置布局为默认值
         */
        resetLayout: () => {
          set({
            layout: { ...DEFAULT_LAYOUT_STATE },
          });
        },

        // ====== Log Filter Actions ======

        /**
         * 设置日志级别过滤
         */
        setLogLevels: (levels: LogLevel[]) => {
          set((state) => ({
            logFilters: {
              ...state.logFilters,
              levels,
            },
          }));
        },

        /**
         * 切换单个日志级别的选中状态
         */
        toggleLogLevel: (level: LogLevel) => {
          set((state) => {
            const { levels } = state.logFilters;
            const newLevels = levels.includes(level)
              ? levels.filter((l) => l !== level)
              : [...levels, level];
            
            return {
              logFilters: {
                ...state.logFilters,
                levels: newLevels,
              },
            };
          });
        },

        /**
         * 设置来源过滤列表
         */
        setLogSources: (sources: string[]) => {
          set((state) => ({
            logFilters: {
              ...state.logFilters,
              sources,
            },
          }));
        },

        /**
         * 添加一个来源过滤器
         */
        addLogSource: (source: string) => {
          set((state) => {
            const { sources } = state.logFilters;
            
            if (sources.includes(source)) {
              return state; // 已存在，不做修改
            }
            
            return {
              logFilters: {
                ...state.logFilters,
                sources: [...sources, source],
              },
            };
          });
        },

        /**
         * 移除一个来源过滤器
         */
        removeLogSource: (source: string) => {
          set((state) => ({
            logFilters: {
              ...state.logFilters,
              sources: state.logFilters.sources.filter((s) => s !== source),
            },
          }));
        },

        /**
         * 设置搜索关键词
         */
        setLogSearchQuery: (query: string) => {
          set((state) => ({
            logFilters: {
              ...state.logFilters,
              searchQuery: query,
            },
          }));
        },

        /**
         * 重置日志过滤器为默认值
         */
        resetLogFilters: () => {
          set({
            logFilters: { ...DEFAULT_LOG_FILTERS_STATE },
          });
        },

        // ====== Input Actions ======

        /**
         * 为指定 session 设置模型覆盖
         */
        setSessionModel: (sessionId: string, model: string) => {
          set((state) => ({
            input: {
              ...state.input,
              modelOverride: {
                ...state.input.modelOverride,
                [sessionId]: model,
              },
            },
          }));
        },

        /**
         * 清除指定 session 的模型覆盖
         */
        clearSessionModel: (sessionId: string) => {
          set((state) => {
            const { [sessionId]: _, ...rest } = state.input.modelOverride;
            
            return {
              input: {
                ...state.input,
                modelOverride: rest,
              },
            };
          });
        },

        /**
         * 设置偏好语言
         */
        setPreferredLanguage: (language: PreferredLanguage) => {
          set((state) => ({
            input: {
              ...state.input,
              preferredLanguage: language,
            },
          }));
        },

        /**
         * 向指定 session 的历史追加一条消息
         */
        pushInputHistory: (sessionId: string, message: string) => {
          const updatedHistory = persistencePushInputHistory(sessionId, message);
          
          set((state) => ({
            input: {
              ...state.input,
              history: {
                ...state.input.history,
                [sessionId]: updatedHistory,
              },
            },
          }));
        },

        /**
         * 获取指定 session 的输入历史（优先从内存获取）
         */
        getInputHistoryForSession: (sessionId: string): string[] => {
          const { input } = get();
          
          // 先从内存中查找
          if (input.history[sessionId]) {
            return input.history[sessionId];
          }
          
          // 内存中没有则从 localStorage 加载
          const persistedHistory = persistenceGetInputHistory(sessionId);
          
          if (persistedHistory.length > 0) {
            // 加载到内存中
            set((state) => ({
              input: {
                ...state.input,
                history: {
                  ...state.input.history,
                  [sessionId]: persistedHistory,
                },
              },
            }));
          }
          
          return persistedHistory;
        },

        /**
         * 清除指定 session 的输入历史
         */
        clearInputHistory: (sessionId: string) => {
          set((state) => {
            const { [sessionId]: _, ...rest } = state.input.history;
            
            return {
              input: {
                ...state.input,
                history: rest,
              },
            };
          });
        },

        // ====== Persistence Actions ======

        /**
         * 从 localStorage 加载持久化的状态
         * 在 store 初始化时调用
         */
        loadPersistedState: () => {
          const persistedState = getAllUIState();
          
          if (Object.keys(persistedState).length > 0) {
            set({
              selection: {
                agentId: (persistedState.selectedAgentId as string | null) ?? DEFAULT_SELECTION_STATE.agentId,
                sessionId: (persistedState.selectedSessionId as string | null) ?? DEFAULT_SELECTION_STATE.sessionId,
              },
              layout: {
                leftSidebarVisible: (persistedState.leftSidebarVisible as boolean) ?? DEFAULT_LAYOUT_STATE.leftSidebarVisible,
                leftSidebarWidth: (persistedState.leftSidebarWidth as number) ?? DEFAULT_LAYOUT_STATE.leftSidebarWidth,
                rightSidebarVisible: (persistedState.rightSidebarVisible as boolean) ?? DEFAULT_LAYOUT_STATE.rightSidebarVisible,
                rightSidebarWidth: (persistedState.rightSidebarWidth as number) ?? DEFAULT_LAYOUT_STATE.rightSidebarWidth,
                rightSidebarActiveTab: ((persistedState.rightSidebarActiveTab as string) ?? DEFAULT_LAYOUT_STATE.rightSidebarActiveTab) as RightSidebarTab,
                logPanelExpanded: (persistedState.logPanelExpanded as boolean) ?? DEFAULT_LAYOUT_STATE.logPanelExpanded,
              },
              logFilters: {
                levels: (((persistedState.logFilters as Record<string, unknown>)?.levels) ?? DEFAULT_LOG_FILTERS_STATE.levels) as LogLevel[],
                sources: ((persistedState.logFilters as Record<string, unknown>)?.sources ?? DEFAULT_LOG_FILTERS_STATE.sources) as string[],
                searchQuery: ((persistedState.logFilters as Record<string, unknown>)?.searchQuery ?? DEFAULT_LOG_FILTERS_STATE.searchQuery) as string,
              },
              input: {
                modelOverride: (persistedState.inputModelOverride as Record<string, string>) ?? DEFAULT_INPUT_STATE.modelOverride,
                preferredLanguage: ((persistedState.preferredLanguage as string) ?? DEFAULT_INPUT_STATE.preferredLanguage) as PreferredLanguage,
                history: DEFAULT_INPUT_STATE.history, // 历史记录单独管理
              },
            });
          }
        },

        /**
         * 重置所有状态为默认值
         */
        resetAllToDefaults: () => {
          set({
            gateway: { ...DEFAULT_GATEWAY_STATE },
            selection: { ...DEFAULT_SELECTION_STATE },
            layout: { ...DEFAULT_LAYOUT_STATE },
            logFilters: { ...DEFAULT_LOG_FILTERS_STATE },
            input: { ...DEFAULT_INPUT_STATE },
            data: { ...DEFAULT_DATA_STATE },
          });
        },

        // ====== Data Setter Actions ======

        setAgents: (agents: AgentMetadata[]) => {
          set((s) => ({ data: { ...s.data, agents } }));
        },

        setSessions: (sessions: SessionMetadata[]) => {
          set((s) => ({ data: { ...s.data, sessions } }));
        },

        setMessages: (messages: SessionMessage[]) => {
          set((s) => ({ data: { ...s.data, messages } }));
        },

        setVersion: (version: string) => {
          set((s) => ({ data: { ...s.data, version } }));
        },

        // ====== Data Fetch Actions ======

        initGateway: async () => {
          try {
            get().setGatewayStatus('connecting');
            
            // 初始化 agent 适配器服务
            await agentAdapterService.initialize();
            
            const { getHealth } = await import('@/lib/actions');
            const data = await getHealth();
            if (data.ok) {
              get().setGatewayStatus('connected');
              if (data.version) {
                set((s) => ({ data: { ...s.data, version: data.version } }));
              }
            } else {
              get().setGatewayStatus('disconnected', undefined, 'OpenClaw gateway is not accessible');
            }
          } catch (err) {
            console.error('[Store] initGateway error:', err);
            get().setGatewayStatus('disconnected', undefined, err instanceof Error ? err.message : 'Unknown error');
          }
        },

        fetchAgents: async () => {
          set((s) => ({ data: { ...s.data, agentsLoading: true } }));
          try {
            const { getAgents } = await import('@/lib/actions');
            const agents = await getAgents();
            set((s) => ({ data: { ...s.data, agents, agentsLoading: false } }));
          } catch (err) {
            console.error('[Store] fetchAgents error:', err);
            set((s) => ({ data: { ...s.data, agentsLoading: false } }));
          }
        },

        fetchSessions: async (agentId: string) => {
          set((s) => ({ data: { ...s.data, sessionsLoading: true } }));
          try {
            const { getSessions } = await import('@/lib/actions');
            const sessions = await getSessions(agentId);
            console.log('[Store] fetchSessions got', sessions.length, 'sessions for', agentId);
            set((s) => ({ data: { ...s.data, sessions, sessionsLoading: false } }));
          } catch (err) {
            console.error('[Store] fetchSessions error:', err);
            set((s) => ({ data: { ...s.data, sessions: [], sessionsLoading: false } }));
          }
        },

        fetchMessages: async (sessionPath: string) => {
          if (fetchingRef.current === sessionPath) return;
          fetchingRef.current = sessionPath;
          set((s) => ({ data: { ...s.data, messagesLoading: true } }));
          try {
            console.log('[Store] fetchMessages called with path:', sessionPath);
            const { getMessages } = await import('@/lib/actions');
            const messages = await getMessages(sessionPath);
            console.log('[Store] fetchMessages got', messages.length, 'messages');
            set((s) => ({ data: { ...s.data, messages, messagesLoading: false } }));
          } catch (err) {
            console.error('[Store] fetchMessages error:', err);
            set((s) => ({ data: { ...s.data, messages: [], messagesLoading: false } }));
          } finally {
            fetchingRef.current = null;
          }
        },

        fetchModels: async () => {
          try {
            const { getConfig } = await import('@/lib/actions');
            const config = await getConfig();
            const models: ModelInfo[] = [];
            if (config?.models) {
              const modelConfig = config.models as Record<string, unknown>;
              for (const [id, val] of Object.entries(modelConfig)) {
                const m = val as Record<string, unknown>;
                models.push({
                  id,
                  name: (m.name as string) || id,
                  provider: (m.provider as string) || 'unknown',
                  contextWindow: (m.contextWindow as number) || 128000,
                });
              }
            }
            console.log('[Store] fetchModels got', models.length, 'models');
            set((s) => ({ data: { ...s.data, models } }));
          } catch (err) {
            console.error('[Store] fetchModels error:', err);
          }
        },

        sendMessage: async (agentId: string, message: string, sessionId?: string) => {
          console.log('[Store] Send message to', agentId, message.substring(0, 50));
          try {
            // 使用 agent 适配器服务发送消息
            const adapterMessages = await agentAdapterService.runConversation(message);
            console.log('[Store] Received messages:', adapterMessages);
            // 转换类型为 SessionMessage
            const messages = adapterMessages.map(msg => ({
              ...msg,
              toolCalls: msg.toolCalls?.map(tc => ({
                id: Math.random().toString(36).substr(2, 9),
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments || {})
                }
              }))
            } as any));
            
            
            
            // 更新消息状态
            set((s) => ({ data: { ...s.data, messages } }));
          } catch (err) {
            console.error('[Store] sendMessage error:', err);
          }
        },

        abortSession: async (sessionId: string) => {
          console.log('[Store] Abort session:', sessionId);
        },
      }),

      // ====== Persist 配置 ======
      {
        name: 'openclaw-ide-storage',
        
        storage: createJSONStorage(() => localStorage),
        
        // 需要持久化的状态路径
        partialize: (state) => ({
          selection: state.selection,
          layout: state.layout,
          logFilters: state.logFilters,
          input: {
            modelOverride: state.input.modelOverride,
            preferredLanguage: state.input.preferredLanguage,
            // 不持久化 history
          },
        }),
        
        // 版本控制，方便后续迁移
        version: 1,
        
        // 数据迁移函数
        migrate: (persistedState: unknown, version: number) => {
          const state = persistedState as Record<string, unknown>;
          
          // 版本 0 -> 1：添加新字段
          if (version < 1) {
            // 可以在这里添加迁移逻辑
          }
          
          return state as unknown as IDEState;
        },
        
        // 合并自定义策略（深度合并而非替换）
        merge: (persistedState: unknown, currentState: IDEState): IDEState => {
          const persisted = persistedState as Partial<IDEState>;
          
          return {
            ...currentState,
            ...(persisted.selection && { selection: { ...currentState.selection, ...persisted.selection } }),
            ...(persisted.layout && { layout: { ...currentState.layout, ...persisted.layout } }),
            ...(persisted.logFilters && { logFilters: { ...currentState.logFilters, ...persisted.logFilters } }),
            ...(persisted.input && {
              input: {
                ...currentState.input,
                ...persisted.input,
                modelOverride: {
                  ...currentState.input.modelOverride,
                  ...(persisted.input?.modelOverride || {}),
                },
                // 不从持久化数据恢复 history
                history: currentState.input.history,
              },
            }),
          };
        },
        
        // 自定义序列化时的过滤（可选）
        // serialize: (state) => JSON.stringify(state),
        // deserialize: (str) => JSON.parse(str),
      }
    )
  )
);

// ==================== 导出类型 ====================

export type {
  GatewayState,
  SelectionState,
  LayoutState,
  LogFiltersState,
  InputState,
};
