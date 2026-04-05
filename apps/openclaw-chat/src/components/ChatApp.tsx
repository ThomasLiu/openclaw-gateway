"use client";

/**
 * ChatApp - 主客户端组件
 * 三栏布局：左侧 Agent 侧栏 | 中间会话区域 | 右侧日志面板（可折叠）
 *
 * 动态导入 ChatPanel 和 OpenClawLogsPanel（ssr: false）避免 hydration mismatch
 * - Turbopack 热更新场景需要避免服务端/客户端渲染不一致
 */
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  AgentInfo,
  ChatPanelProps,
  GatewayStatus,
  MessageItem,
  SessionInfo_,
} from "./chat-types";

import GatewayAlertDialog from "./GatewayAlertDialog";
import ExecApprovalOverlay from "./ExecApprovalOverlay";
import UpdateDialog from "./UpdateDialog";
import AgentConfigModal from "./AgentConfigModal";
import ToastContainer, { showError } from "./Toast";
import { getAgentsStore } from "@/lib/agents-store";
import { getSessionCache, setSessionCache } from "@/lib/session-cache";

// ============================================================================
// 子组件 import（避免循环依赖，统一在这里 import）
// ============================================================================

// ============================================================================
// ChatPanel - 动态导入（ssr: false），避免 hydration mismatch
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPanel = dynamic<ChatPanelProps & any>(
  () => import("./ChatPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        加载聊天面板...
      </div>
    ),
  }
);

// ============================================================================
// OpenClawLogsPanel - 动态导入（ssr: false）
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OpenClawLogsPanel = dynamic<{ onClose: () => void } & any>(
  () => import("./OpenClawLogsPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs">
        加载日志面板...
      </div>
    ),
  }
);

// ============================================================================
// 常量
// ============================================================================
import { sessionKeyStorageKey } from "./chat-utils";

/** Architect Agent ID（特殊样式标记） */
const OPENCLAW_AGENT_ARCHITECT_ID = "agent-architect";

// ============================================================================
// ChatApp 主组件
// ============================================================================

export default function ChatApp() {
  // ---------------------------------------------------------------------------
  // 状态
  // ---------------------------------------------------------------------------

  /** 网关连接状态 */
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>("disconnected");

  /** Agent 列表 */
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  /** 当前选中的 agentId */
  const [currentAgentId, setCurrentAgentId] = useState<string | undefined>(undefined);

  /** 所有 agent 的会话列表：Record<agentId, SessionInfo_[]>（从 localStorage 缓存初始化） */
  const [sessionsMap, setSessionsMap] = useState<Record<string, SessionInfo_[]>>(() => {
    if (typeof window === "undefined") return {};
    return getSessionCache().sessionsMap;
  });

  /** 当前会话 key */
  const [currentSessionKey, setCurrentSessionKey] = useState<string | undefined>(
    undefined
  );

  /** 消息列表 */
  const [messages, setMessages] = useState<MessageItem[]>([]);

  /** 是否正在流式传输 */
  const [streaming, setStreaming] = useState(false);

  /** 当前流式消息 ID */
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>(
    undefined
  );

  /** 当前流式 delta 文本 */
  const [streamingDelta, setStreamingDelta] = useState<string | undefined>(undefined);

  /** 右侧日志面板是否展开（从 localStorage 恢复） */
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  /** 右侧日志面板宽度（px），默认 512（256 的两倍），从 localStorage 恢复 */
  const [rightPanelWidth, setRightPanelWidth] = useState(512);

  /** 是否正在拖动调整宽度 */
  const [isResizing, setIsResizing] = useState(false);

  // 从 localStorage 恢复 UI 状态（仅客户端，延迟初始化避免 hydration 不匹配）
  useEffect(() => {
    // 强制设置为 true，确保日志面板默认打开
    setRightPanelOpen(true);
    localStorage.setItem("openclaw-right-panel-open", "true");
    const savedWidth = localStorage.getItem("openclaw-right-panel-width");
    if (savedWidth) setRightPanelWidth(Number(savedWidth));
  }, []);

  /** 左侧 Agent 侧栏是否收起 */
  const [agentSidebarCollapsed, setAgentSidebarCollapsed] = useState(false);

  /** 网关告警弹窗是否显示 */
  const [showGatewayAlert, setShowGatewayAlert] = useState(false);

  /** 网关告警消息内容 */
  const [gatewayAlertMessage, setGatewayAlertMessage] = useState<string | undefined>(
    undefined
  );

  /** 加载状态 */
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  /** OpenClaw CLI 版本 */
  const [cliVersion, setCliVersion] = useState<string | undefined>(undefined);

  /** 是否有可用更新 */
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | undefined>(undefined);

  /** 更新弹窗状态 */
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cliOutput, setCliOutput] = useState("");

  /** Agent 配置弹窗状态 */
  const [showAgentConfig, setShowAgentConfig] = useState(false);

  /** 添加 Agent（Architect）状态 */
  const [addingAgent, setAddingAgent] = useState(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  /** SSE EventSource ref */
  const eventSourceRef = useRef<EventSource | null>(null);

  /** useNowTick interval ref */
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // 辅助函数
  // ---------------------------------------------------------------------------

  /** 从 localStorage 恢复 sessionKey */
  function loadSessionKeyFromStorage(agentId: string): string | undefined {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem(sessionKeyStorageKey(agentId)) ?? undefined;
  }

  /** 保存 sessionKey 到 localStorage */
  function saveSessionKeyToStorage(agentId: string, sessionKey: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(sessionKeyStorageKey(agentId), sessionKey);
  }

  /** 开始拖动调整右侧面板宽度 */
  function handleStartResize(e: React.MouseEvent) {
    e.preventDefault();
    setIsResizing(true);
  }

  /** 拖动中：实时更新宽度（限制范围 200px - 800px） */
  useEffect(() => {
    if (!isResizing) return;

    function onMouseMove(e: MouseEvent) {
      const newWidth = Math.min(800, Math.max(200, window.innerWidth - e.clientX));
      setRightPanelWidth(newWidth);
    }

    function onMouseUp() {
      setIsResizing(false);
      localStorage.setItem("openclaw-right-panel-width", String(rightPanelWidth));
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, rightPanelWidth]);

  /** 格式化相对时间 */
  function formatRelativeTime(date: Date | string | undefined): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
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

  /** useNowTick：每秒刷新相对时间 */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      // 触发一次重渲染以更新相对时间
      setMessages((prev) => [...prev]);
    }, 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 版本信息 & 更新检查
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchVersion() {
      try {
        const resp = await fetch("/api/openclaw/version");
        if (resp.ok) {
          const data = await resp.json();
          setCliVersion(data.cliVersion);
        }
      } catch {
        // 版本获取失败，静默忽略
      }
    }

    async function checkForUpdates() {
      try {
        const resp = await fetch("/api/openclaw/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setUpdateAvailable(data.available);
          setLatestVersion(data.latestVersion);
        }
      } catch {
        // 更新检查失败，静默忽略
      }
    }

    fetchVersion();
    checkForUpdates();

    // 每 5 分钟检查一次更新
    const updateInterval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(updateInterval);
  }, []);

  /** 开始更新流程 */
  function handleStartUpdate() {
    setShowUpdateDialog(true);
    setCliOutput("");
    setUpdating(false);
  }

  /** 确认更新 */
  async function handleConfirmUpdate() {
    setUpdating(true);
    setCliOutput("正在启动更新...\n");

    try {
      const resp = await fetch("/api/openclaw/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install" }),
      });

      if (!resp.ok || !resp.body) {
        setCliOutput((prev) => prev + `\n错误: ${resp.statusText}\n`);
        setUpdating(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "stdout" || data.type === "stderr") {
                setCliOutput((prev) => prev + data.text);
              } else if (data.type === "error") {
                setCliOutput((prev) => prev + `\n错误: ${data.text}\n`);
              } else if (data.type === "done") {
                setCliOutput((prev) => prev + `\n更新完成，退出码: ${data.exitCode}\n`);
                setUpdating(false);
              }
            } catch {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (err) {
      setCliOutput((prev) => prev + `\n错误: ${err instanceof Error ? err.message : String(err)}\n`);
      setUpdating(false);
    }
  }

  /** 关闭更新弹窗 */
  function handleCloseUpdateDialog() {
    if (!updating) {
      setShowUpdateDialog(false);
    }
  }

  // ---------------------------------------------------------------------------
  // 网关连接状态
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function checkConnection() {
      try {
        // 使用 /api/gateway/status API 检查连接（避免在浏览器中调用 Node.js 模块）
        const resp = await fetch("/api/gateway/status");
        if (resp.ok) {
          const data = await resp.json();
          if (data.connected) {
            setGatewayStatus("connected");
            setShowGatewayAlert(false);
            setGatewayAlertMessage(undefined);
          } else {
            setGatewayStatus("disconnected");
            setGatewayAlertMessage(
              data.error ?? "无法连接到 OpenClaw Gateway。请确认网关已在端口 18789 运行，并检查网络连接。"
            );
            setShowGatewayAlert(true);
          }
        } else {
          setGatewayStatus("disconnected");
          setGatewayAlertMessage(
            `网关状态检查失败（HTTP ${resp.status}）。请确认 OpenClaw Gateway 已启动。`
          );
          setShowGatewayAlert(true);
        }
      } catch (err) {
        setGatewayStatus("disconnected");
        const msg = err instanceof Error ? err.message : String(err);
        setGatewayAlertMessage(
          `连接错误: ${msg || "未知错误"}`
        );
        setShowGatewayAlert(true);
      }
    }

    setGatewayStatus("connecting");
    checkConnection();
    // 每 5 秒检查一次连接状态
    interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // 加载 agents（通过 AgentsStore 订阅，支持定时刷新）
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const store = getAgentsStore();
    const unsubscribe = store.subscribe((state) => {
      setAgents(state.agents);
      setLoadingAgents(state.loading);

      if (state.agents.length === 0) return;

      // 如果没有 currentAgentId 或已无效，使用第一个
      if (!currentAgentId || !state.agents.find((a) => a.id === currentAgentId)) {
        setCurrentAgentId(state.agents[0].id);
      }
    });
    return unsubscribe;
  }, [currentAgentId]);

  // ---------------------------------------------------------------------------
  // 加载 sessions（当 agentId 变化时自动触发）
  // ---------------------------------------------------------------------------

  const loadSessions = useCallback(
    async (agentId: string) => {
      // 忽略非当前 agent 的响应（防止竞态）
      if (agentId !== currentAgentId) return;

      setLoadingSessions(true);
      try {
        const resp = await fetch(`/api/gateway/sessions?agentId=${encodeURIComponent(agentId)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        // 再次检查：响应到达时 agentId 是否仍匹配
        if (agentId !== currentAgentId) return;

        const data = await resp.json();
        const sessions: SessionInfo_[] = (data.sessions ?? []).map(
          (s: { key: string; displayName?: string; derivedTitle?: string; updatedAt?: string | number; preview?: string; lastMessagePreview?: string; userLastMessage?: string; agentLastMessage?: string }) => ({
            key: s.key,
            label: s.displayName ?? s.derivedTitle ?? "未命名会话",
            preview: s.preview ?? s.lastMessagePreview ?? "暂无消息",
            relativeTime: formatRelativeTime(s.updatedAt ? new Date(s.updatedAt) : undefined),
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
            userLastMessage: s.userLastMessage,
            agentLastMessage: s.agentLastMessage,
          })
        );

        // 检查 API 返回的数据是否有效：如果所有 session 的 userLastMessage 都是空的，
        // 说明可能 enrichment 失败了，保留现有缓存数据
        const hasValidData = sessions.length === 0 || sessions.some((s) => s.userLastMessage);

        setSessionsMap((prev) => {
          // 如果 API 数据无效，保留现有数据
          if (!hasValidData && prev[agentId] !== undefined) {
            return prev;
          }
          const next = { ...prev, [agentId]: sessions };
          // 更新 localStorage 缓存
          setSessionCache(next);
          return next;
        });
      } catch {
        // API 失败时保留现有数据，不覆盖为空数组
        setSessionsMap((prev) => {
          if (prev[agentId] !== undefined) {
            return prev; // 保留现有数据
          }
          return { ...prev, [agentId]: [] };
        });
      } finally {
        if (agentId === currentAgentId) {
          setLoadingSessions(false);
        }
      }
    },
    [currentAgentId]
  );

  // 自动加载 sessions（当 currentAgentId 变化时触发，包括初始自动选择）
  useEffect(() => {
    if (!currentAgentId) return;

    // 保留旧会话数据（避免切换时闪烁），先显示已有的会话
    const existingSessions = sessionsMap[currentAgentId];
    if (!existingSessions) {
      // 首次加载该 Agent：先初始化空数组，避免 undefined 导致白屏
      setSessionsMap((prev) => ({ ...prev, [currentAgentId]: [] }));
    }

    loadSessions(currentAgentId);
  }, [currentAgentId, loadSessions]);

  // ---------------------------------------------------------------------------
  // 加载消息（当 sessionKey 变化时）
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(
    async (agentId: string, sessionKey: string) => {
      setLoadingMessages(true);
      setMessages([]);
      try {
        const resp = await fetch(
          `/api/chat?agentId=${encodeURIComponent(agentId)}&sessionKey=${encodeURIComponent(sessionKey)}`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const msgs: MessageItem[] = (data.messages ?? []).map(
          (
            m: { id?: string; role: string; content?: string; timestamp?: string; meta?: { model?: string; durationMs?: number } },
            idx: number
          ) => ({
            id: m.id ?? `msg-${idx}`,
            role: m.role as "user" | "assistant" | "system",
            content: m.content ?? "",
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            meta: m.meta,
          })
        );
        setMessages(msgs);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  // 当 sessions 加载完成后，如果没有 currentSessionKey，自动选中第一个 session
  useEffect(() => {
    if (!currentAgentId || loadingSessions) return;
    const sessions = sessionsMap[currentAgentId];
    if (!sessions || sessions.length === 0) return;
    // 如果已经有 currentSessionKey，不需要处理
    if (currentSessionKey) return;
    // 自动选中第一个 session
    const firstSession = sessions[0];
    if (firstSession) {
      setCurrentSessionKey(firstSession.key);
      loadMessages(currentAgentId, firstSession.key);
    }
  }, [currentAgentId, loadingSessions, sessionsMap, currentSessionKey, loadMessages]);

  // ---------------------------------------------------------------------------
  // 刷新消息
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    if (!currentAgentId || !currentSessionKey) return;

    // 重置流式状态
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
    setStreamingMessageId(undefined);
    setStreamingDelta(undefined);

    // 重新加载消息
    loadMessages(currentAgentId, currentSessionKey);
  }, [currentAgentId, currentSessionKey, loadMessages]);

  // ---------------------------------------------------------------------------
  // Agent 切换逻辑
  // ---------------------------------------------------------------------------

  function handleSelectAgent(agentId: string) {
    // 停止当前 SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
    setStreamingMessageId(undefined);
    setStreamingDelta(undefined);

    setCurrentAgentId(agentId);

    // 尝试从 localStorage 恢复 sessionKey
    const savedKey = loadSessionKeyFromStorage(agentId);
    if (savedKey) {
      setCurrentSessionKey(savedKey);
      loadMessages(agentId, savedKey);
    } else {
      // 不设置 currentSessionKey，让 useEffect 自动选中第一个
      setCurrentSessionKey(undefined);
      setMessages([]);
    }
  }

  // ---------------------------------------------------------------------------
  // 会话切换逻辑
  // ---------------------------------------------------------------------------

  function handleSelectSession(sessionKey: string) {
    if (!currentAgentId) return;

    // 停止当前 SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
    setStreamingMessageId(undefined);
    setStreamingDelta(undefined);

    setCurrentSessionKey(sessionKey);
    saveSessionKeyToStorage(currentAgentId, sessionKey);
    loadMessages(currentAgentId, sessionKey);
  }

  // ---------------------------------------------------------------------------
  // 新建会话
  // ---------------------------------------------------------------------------

  async function handleNewSession() {
    if (!currentAgentId) return;
    try {
      const resp = await fetch("/api/gateway/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: currentAgentId }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const newSession: SessionInfo_ = {
        key: data.key,
        label: data.label ?? data.title ?? "新会话",
        preview: "暂无消息",
        relativeTime: "刚刚",
      };
      setSessionsMap((prev) => {
        const next = {
          ...prev,
          [currentAgentId]: [newSession, ...(prev[currentAgentId] ?? [])],
        };
        // 更新 localStorage 缓存
        setSessionCache(next);
        return next;
      });
      handleSelectSession(newSession.key);
    } catch {
      // 创建失败，静默忽略
    }
  }

  // ---------------------------------------------------------------------------
  // 添加 Agent（由 Architect 引导）
  // ---------------------------------------------------------------------------

  /** Architect Agent 引导消息（用户视角，请求 Architect 帮助创建 Agent） */
  const ARCHITECT_GUIDING_MESSAGE = `你好！我想创建一个新的 Agent，请帮我设计和配置它。`;

  /**
   * 添加 Agent - 由 Architect 引导创建
   */
  async function handleAddAgent() {
    if (addingAgent) return;
    setAddingAgent(true);

    try {
      // Step 1: 确保 Architect agent 存在（幂等）
      const ensureResp = await fetch("/api/agent-architect/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!ensureResp.ok) {
        const data = await ensureResp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${ensureResp.status}`);
      }
      const { agentId } = (await ensureResp.json()) as { agentId: string };

      // Step 2: 刷新 agents 列表
      await getAgentsStore().refresh();

      // Step 3: 切换到 Architect agent
      handleSelectAgent(agentId);

      // Step 4: 等待 sessions 加载
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 5: 查找空 session 或创建新的
      const sessions = sessionsMap[agentId] ?? [];
      const emptySession = sessions.find(
        (s: SessionInfo_) => !s.userLastMessage && !s.agentLastMessage
      );

      if (emptySession) {
        handleSelectSession(emptySession.key);
      } else {
        // 创建新 session
        const createResp = await fetch("/api/gateway/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
        if (!createResp.ok) throw new Error("Failed to create session");
        const { key: newSessionKey } = (await createResp.json()) as { key: string };
        handleSelectSession(newSessionKey);
      }

      // Step 6: 等待 session 切换完成，然后发送引导消息
      await new Promise((resolve) => setTimeout(resolve, 300));
      handleSendMessage(ARCHITECT_GUIDING_MESSAGE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(`添加 Agent 失败: ${msg}`);
    } finally {
      setAddingAgent(false);
    }
  }

  // ---------------------------------------------------------------------------
  // 删除 Agent
  // ---------------------------------------------------------------------------

  async function handleDeleteAgent(agentId: string): Promise<boolean> {
    // 停止当前 SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const resp = await fetch(`/api/agents/${encodeURIComponent(agentId)}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }

      // 清除 client singleton（删除 agent 后 gateway 可能已断开连接）
      const { clearOpenClawClient } = await import("@/lib/openclaw/pool");
      clearOpenClawClient();

      // 刷新 agents 列表
      getAgentsStore().refresh();

      // 如果删除的是当前选中的 agent，切换到第一个
      if (currentAgentId === agentId) {
        const remaining = agents.filter((a) => a.id !== agentId);
        if (remaining.length > 0) {
          handleSelectAgent(remaining[0].id);
        } else {
          setCurrentAgentId(undefined);
        }
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(`删除 Agent 失败: ${msg}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // 删除会话
  // ---------------------------------------------------------------------------

  async function handleDeleteSession(sessionKey: string) {
    if (!currentAgentId) return;
    try {
      await fetch("/api/gateway/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sessionKey }),
      });
      const sessions = sessionsMap[currentAgentId] ?? [];
      const updated = sessions.filter((s) => s.key !== sessionKey);
      setSessionsMap((prev) => {
        const next = { ...prev, [currentAgentId]: updated };
        // 更新 localStorage 缓存
        setSessionCache(next);
        return next;
      });

      // 如果删除的是当前会话，切换到第一个
      if (currentSessionKey === sessionKey) {
        const first = updated[0];
        if (first) {
          handleSelectSession(first.key);
        } else {
          setCurrentSessionKey(undefined);
          setMessages([]);
        }
      }
    } catch {
      // 删除失败，静默忽略
    }
  }

  // ---------------------------------------------------------------------------
  // 发送消息（SSE 流式）
  // ---------------------------------------------------------------------------

  function handleSendMessage(content: string) {
    if (!content.trim() || !currentAgentId || !currentSessionKey) return;

    // 添加用户消息
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    // 创建空的 assistant 消息占位
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: MessageItem = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setStreamingMessageId(assistantMsgId);
    setStreamingDelta("");

    // 建立 SSE 连接
    const params = new URLSearchParams({
      agentId: currentAgentId,
      sessionKey: currentSessionKey,
    });
    const es = new EventSource(`/api/chat?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "delta") {
          setStreamingDelta((prev) => (prev ?? "") + (event.text ?? ""));
          // 追加到消息内容
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: (m.content ?? "") + (event.text ?? "") }
                : m
            )
          );
        } else if (event.type === "final") {
          setStreaming(false);
          setStreamingMessageId(undefined);
          setStreamingDelta(undefined);
          // 标记流式结束
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, streaming: false } : m
            )
          );
          es.close();
          eventSourceRef.current = null;
        } else if (event.type === "error") {
          setStreaming(false);
          setStreamingMessageId(undefined);
          setStreamingDelta(undefined);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: m.content + "\n[错误: " + (event.message ?? "未知错误") + "]",
                    streaming: false,
                  }
                : m
            )
          );
          es.close();
          eventSourceRef.current = null;
        }
      } catch {
        // 解析失败，忽略
      }
    };

    es.onerror = () => {
      setStreaming(false);
      setStreamingMessageId(undefined);
      setStreamingDelta(undefined);
      es.close();
      eventSourceRef.current = null;
    };
  }

  // ---------------------------------------------------------------------------
  // 中止流式
  // ---------------------------------------------------------------------------

  function handleAbort() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
    setStreamingMessageId(undefined);
    setStreamingDelta(undefined);

    // 标记当前流式消息为已中止
    if (streamingMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId ? { ...m, streaming: false } : m
        )
      );
    }

    // 调用 abort API
    if (currentAgentId && currentSessionKey) {
      fetch("/api/chat/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: currentAgentId, sessionKey: currentSessionKey }),
      }).catch(() => {
        // abort 失败静默忽略
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 清理 SSE（组件卸载时）
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  const currentAgent = agents.find((a) => a.id === currentAgentId);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 overflow-hidden">
      {/* 顶栏 */}
      <AppTitleBar
        gatewayStatus={gatewayStatus}
        currentAgentLabel={currentAgent?.label}
        onToggleRightPanel={() => {
          const newVal = !rightPanelOpen;
          setRightPanelOpen(newVal);
          localStorage.setItem("openclaw-right-panel-open", String(newVal));
        }}
        rightPanelOpen={rightPanelOpen}
        onToggleAgentSidebar={() => setAgentSidebarCollapsed((v) => !v)}
        agentSidebarCollapsed={agentSidebarCollapsed}
        cliVersion={cliVersion}
        updateAvailable={updateAvailable}
        onUpdateClick={handleStartUpdate}
      />

      {/* 主内容区：三栏 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧 Agent 侧栏 */}
        {!agentSidebarCollapsed && (
          <AgentSidebar
            agents={agents}
            currentAgentId={currentAgentId}
            onSelectAgent={handleSelectAgent}
            sessions={sessionsMap}
            currentSessionKey={currentSessionKey}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onDeleteAgent={handleDeleteAgent}
            loadingAgents={loadingAgents}
            loadingSessions={loadingSessions}
            openclawAgentArchitectId={OPENCLAW_AGENT_ARCHITECT_ID}
            onOpenConfig={() => setShowAgentConfig(true)}
            onAddAgent={handleAddAgent}
            addingAgent={addingAgent}
          />
        )}

        {/* 中间会话区域 */}
        <ChatPanel
          agentId={currentAgentId ?? ""}
          sessionKey={currentSessionKey ?? ""}
          messages={messages}
          streaming={streaming}
          onSendMessage={handleSendMessage}
          onAbort={handleAbort}
          streamingMessageId={streamingMessageId}
          streamingDelta={streamingDelta}
          loadingMessages={loadingMessages}
          onRefresh={handleRefresh}
        />

        {/* 右侧日志面板 */}
        {rightPanelOpen && (
          <>
            {/* 拖动调整宽度的把手 */}
            <div
              className="w-1 flex-shrink-0 bg-zinc-700 hover:bg-zinc-500 cursor-col-resize transition-colors select-none"
              onMouseDown={handleStartResize}
              title="拖动调整宽度"
            />
            <OpenClawLogsPanel
              width={rightPanelWidth}
              onClose={() => setRightPanelOpen(false)}
            />
          </>
        )}
      </div>

      {/* 网关告警弹窗 */}
      <GatewayAlertDialog
        open={showGatewayAlert}
        message={gatewayAlertMessage}
        onClose={() => setShowGatewayAlert(false)}
      />

      {/* 执行审批弹窗 */}
      <ExecApprovalOverlay />

      {/* 更新弹窗 */}
      <UpdateDialog
        open={showUpdateDialog}
        currentVersion={cliVersion}
        latestVersion={latestVersion}
        updating={updating}
        cliOutput={cliOutput}
        onConfirm={handleConfirmUpdate}
        onCancel={handleCloseUpdateDialog}
      />

      {/* Agent 配置弹窗 */}
      <AgentConfigModal
        open={showAgentConfig}
        onClose={() => setShowAgentConfig(false)}
        onSaved={() => {
          // 保存成功后刷新 agents 列表
          getAgentsStore().refresh();
        }}
      />

      {/* Toast 通知 */}
      <ToastContainer />
    </div>
  );
}

// ============================================================================
// AppTitleBar 子组件
// ============================================================================

function AppTitleBar({
  gatewayStatus,
  currentAgentLabel,
  onToggleRightPanel,
  rightPanelOpen,
  onToggleAgentSidebar,
  agentSidebarCollapsed,
  cliVersion,
  updateAvailable,
  onUpdateClick,
}: {
  gatewayStatus: GatewayStatus;
  currentAgentLabel?: string;
  onToggleRightPanel: () => void;
  rightPanelOpen: boolean;
  onToggleAgentSidebar: () => void;
  agentSidebarCollapsed: boolean;
  cliVersion?: string;
  updateAvailable: boolean;
  onUpdateClick: () => void;
}) {
  return (
    <header className="flex items-center h-12 px-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 select-none">
      {/* 左侧：侧栏切换 + 网关状态 */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleAgentSidebar}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors"
          title={agentSidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        >
          {agentSidebarCollapsed ? (
            // 折叠状态 - 只有左边细线
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="2.5" y="3.5" width="1.5" height="9" rx="0.5" fill="currentColor" />
            </svg>
          ) : (
            // 展开状态 - 左边填充
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="2.5" y="3.5" width="5" height="9" rx="1" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* 连接状态指示灯 */}
        <span
          className={`status-indicator flex-shrink-0 ${
            gatewayStatus === "connected"
              ? "status-connected"
              : gatewayStatus === "connecting"
              ? "bg-yellow-400"
              : "status-disconnected"
          }`}
          title={
            gatewayStatus === "connected"
              ? "网关已连接"
              : gatewayStatus === "connecting"
              ? "连接中..."
              : "网关已断开"
          }
        />

        {/* 版本信息 / 更新提示（绿色点后面） */}
        {updateAvailable ? (
          <button
            onClick={onUpdateClick}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors text-xs ml-1"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-green-400">
              <path d="M6 1v4M6 1L4 3M6 1l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1.5 7.5v1a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>有新版本</span>
          </button>
        ) : cliVersion ? (
          <span className="text-xs text-zinc-500 ml-1" title="OpenClaw 版本">
            v{cliVersion.match(/(\d+\.\d+\.\d+)/)?.[1] ?? cliVersion.replace(/^v?OpenClaw\s*/i, "").trim()}
          </span>
        ) : null}
      </div>

      {/* 中间：当前 Agent */}
      <div className="flex-1 flex justify-center">
        {currentAgentLabel && (
          <span className="text-sm text-zinc-300 truncate">
            {currentAgentLabel}
          </span>
        )}
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleRightPanel}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors"
          title={rightPanelOpen ? "收起日志" : "打开日志"}
        >
          {rightPanelOpen ? (
            // 激活状态 - 右侧填充（类似图3）
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="8.5" y="3.5" width="5" height="9" rx="1" fill="currentColor" />
            </svg>
          ) : (
            // 非激活状态 - 左右分割，左边空白，右边细线（类似图2）
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="9.5" y="3.5" width="1.5" height="9" rx="0.5" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// AgentSidebar 子组件
// ============================================================================

function AgentSidebar({
  agents,
  currentAgentId,
  onSelectAgent,
  sessions,
  currentSessionKey,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onDeleteAgent,
  loadingAgents,
  loadingSessions,
  openclawAgentArchitectId,
  onOpenConfig,
  onAddAgent,
  addingAgent,
}: {
  agents: AgentInfo[];
  currentAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  sessions: Record<string, SessionInfo_[]>;
  currentSessionKey?: string;
  onSelectSession: (sessionKey: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionKey: string) => void;
  onDeleteAgent: (agentId: string) => Promise<boolean>;
  loadingAgents: boolean;
  loadingSessions: boolean;
  openclawAgentArchitectId: string;
  onOpenConfig: () => void;
  onAddAgent: () => void;
  addingAgent: boolean;
}) {
  const [agentHovering, setAgentHovering] = useState<string | null>(null);
  const [sessionHovering, setSessionHovering] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sessionDeleteConfirm, setSessionDeleteConfirm] = useState<string | null>(null);

  /** 导出 Agent */
  async function handleExportAgent(agentId: string, e: { stopPropagation: () => void }) {
    e.stopPropagation();
    try {
      const resp = await fetch(
        `/api/agents/${encodeURIComponent(agentId)}/export`
      );
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        alert(`导出失败: ${data.error ?? resp.statusText}`);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openclaw-agent-${agentId.replace(/[^a-zA-Z0-9_-]/g, "-")}-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("导出失败，请重试");
    }
  }

  /** 删除 Agent 确认 */
  async function handleDeleteAgentConfirm(agentId: string) {
    setDeleteConfirm(agentId);
  }

  /** 确认删除 Agent */
  async function handleConfirmDeleteAgent() {
    if (deleteConfirm) {
      await onDeleteAgent(deleteConfirm);
      setDeleteConfirm(null);
    }
  }

  /** 取消删除 */
  function handleCancelDelete() {
    setDeleteConfirm(null);
  }

  const currentSessions = (currentAgentId ? sessions[currentAgentId] ?? [] : []) as SessionInfo_[];

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900 overflow-hidden">
      {/* Agent 列表 */}
      <div className="flex-shrink-0 px-2 py-2 border-b border-zinc-800">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Agent</span>
          <div className="flex items-center gap-0.5">
            {/* 添加 Agent 按钮 */}
            <button
              onClick={onAddAgent}
              disabled={addingAgent}
              className={`p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors ${addingAgent ? "opacity-50 cursor-not-allowed" : ""}`}
              title="添加 Agent（由 Agent 设计专家引导）"
            >
              {addingAgent ? (
                <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin">
                  <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="12" strokeDashoffset="4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v10M1 6h10" strokeLinecap="round" />
                </svg>
              )}
            </button>
            {/* 配置按钮 */}
            <button
              onClick={onOpenConfig}
              className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
              title="Agent 配置"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10.5 5.25a1 1 0 01-.3.7l-.9.9a.5.5 0 01-.7 0l-.7-.7a.5.5 0 010-.7l.9-.9a1 1 0 010-1.4l.4-.4a.5.5 0 01.7 0l.4.4a.5.5 0 010 .7zM5.25 7.5l-.7-.7L3.4 8l.7.7-.7.7 1.15 1.15.7-.7.7.7 1.15-1.15-.7-.7.7-.7-1.15-1.15-.7.7-.7-.7-1.15 1.15.7.7-.7.7 1.15 1.15z"/>
              </svg>
            </button>
          </div>
        </div>
        {loadingAgents ? (
          <div className="text-xs text-zinc-500 px-1 py-2">加载中...</div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={currentAgentId === agent.id}
              isHovering={agentHovering === agent.id}
              isOpenclawArchitect={agent.id === openclawAgentArchitectId}
              onSelect={() => onSelectAgent(agent.id)}
              onHoverEnter={() => setAgentHovering(agent.id)}
              onHoverLeave={() => setAgentHovering(null)}
              onExport={(e) => handleExportAgent(agent.id, e)}
              onDelete={() => handleDeleteAgentConfirm(agent.id)}
            />
          ))
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={handleCancelDelete}>
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-zinc-200 mb-2">确认删除</h3>
            <p className="text-xs text-zinc-400 mb-4">
              确定要删除 Agent "{agents.find((a) => a.id === deleteConfirm)?.label}" 吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteAgent}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 会话列表 */}
      {/* 会话标题 - 固定不滚动 */}
      <div className="flex items-center justify-between px-2 py-2 flex-shrink-0 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">会话</span>
        <button
          onClick={onNewSession}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 transition-colors"
          title="新建会话"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </div>

      {/* 会话列表 - 可滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {loadingSessions ? (
          <div className="text-xs text-zinc-500 px-2 py-2">加载中...</div>
        ) : (
          currentSessions.map((session) => (
            <SessionRow
              key={session.key}
              session={session}
              selected={currentSessionKey === session.key}
              isHovering={sessionHovering === session.key}
              onSelect={() => onSelectSession(session.key)}
              onDelete={() => setSessionDeleteConfirm(session.key)}
              onHoverEnter={() => setSessionHovering(session.key)}
              onHoverLeave={() => setSessionHovering(null)}
            />
          ))
        )}
      </div>

      {/* 会话删除确认弹窗 */}
      {sessionDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setSessionDeleteConfirm(null)}>
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-zinc-200 mb-2">确认删除</h3>
            <p className="text-xs text-zinc-400 mb-4">
              确定要删除会话 "{currentSessions.find((s) => s.key === sessionDeleteConfirm)?.label}" 吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSessionDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteSession(sessionDeleteConfirm);
                  setSessionDeleteConfirm(null);
                  setSessionHovering(null);
                }}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ============================================================================
// SessionRow 子组件
// ============================================================================

function SessionRow({
  session,
  selected,
  isHovering,
  onSelect,
  onDelete,
  onHoverEnter,
  onHoverLeave,
}: {
  session: SessionInfo_;
  selected: boolean;
  isHovering: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}) {
  return (
    <div
      className={`group px-2 py-2 mx-1 rounded cursor-pointer transition-colors mb-0.5 ${
        selected ? "bg-zinc-700 text-zinc-100" : "hover:bg-zinc-800 text-zinc-400"
      }`}
      onClick={onSelect}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* 第一行：用户最后一条消息 */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] text-zinc-300 truncate flex-1" title={session.userLastMessage}>
          {session.userLastMessage || "暂无消息"}
        </span>
        {isHovering && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-600 transition-colors flex-shrink-0"
            title="删除会话"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        )}
      </div>
      {/* 第二行：Agent 最后一条消息 + 时间 */}
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className="text-[10px] text-zinc-500 truncate flex-1" title={session.agentLastMessage}>
          {session.agentLastMessage || ""}
        </span>
        <span className="text-[10px] text-zinc-600 flex-shrink-0">
          {session.relativeTime}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// AgentCard 子组件 - 新设计的 Agent 卡片
// ============================================================================

function AgentCard({
  agent,
  isSelected,
  isHovering,
  isOpenclawArchitect,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  onExport,
  onDelete,
}: {
  agent: AgentInfo;
  isSelected: boolean;
  isHovering: boolean;
  isOpenclawArchitect: boolean;
  onSelect: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onExport: (e: { stopPropagation: () => void }) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative px-2 py-2 rounded text-sm transition-all mb-1 cursor-pointer ${
        isSelected
          ? "bg-zinc-700 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
      onClick={onSelect}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* 未读消息徽标 */}
      {agent.unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-medium rounded-full z-10">
          {agent.unreadCount > 99 ? "99+" : agent.unreadCount}
        </span>
      )}

      {/* 第一行：Agent 名字 */}
      <div className="flex items-center gap-1">
        <span className="truncate flex-1 font-medium">{agent.label}</span>
        {isOpenclawArchitect && (
          <span className="text-[10px] text-zinc-500 flex-shrink-0">Architect</span>
        )}
      </div>

      {/* 第二行：最后消息预览和时间 */}
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className="text-[11px] text-zinc-500 truncate flex-1">
          {agent.lastSession?.preview ?? "暂无消息"}
        </span>
        <span className="text-[10px] text-zinc-600 flex-shrink-0">
          {agent.lastSession?.relativeTime ?? ""}
        </span>
      </div>

      {/* Hover 时显示操作按钮 */}
      {isHovering && (
        <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
          {/* 导出按钮 */}
          <button
            onClick={onExport}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-600 transition-colors"
            title="导出 Agent"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 8v2h8V8M6 1v6M3 5l3 3 3-3" />
            </svg>
          </button>
          {/* 删除按钮 */}
          {(
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-600 transition-colors"
              title="删除 Agent"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l8 8M10 2L2 10" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 工作状态动画 - 左侧渐变条 */}
      {agent.isWorking && (
        <div
          className="absolute inset-y-0 left-0 w-1 overflow-hidden rounded-l"
          style={{
            background: "linear-gradient(to right, #22c55e, #16a34a, #22c55e)",
            backgroundSize: "100% 200%",
            animation: "gradient-y-slide 1.5s linear infinite",
          }}
        />
      )}
    </div>
  );
}
