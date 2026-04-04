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

/** Architect Agent ID（特殊样式标记） */
export const OPENCLAW_AGENT_ARCHITECT_ID = "agent-architect";

/** localStorage key 生成器：sessionKeyStorageKey(agentId) */
export function sessionKeyStorageKey(agentId: string): string {
  return `openclaw-chat.sessionKey.${agentId}`;
}

/** localStorage key 生成器：sessionKeyBelongsToAgent 校验用 */
export function sessionKeyBelongsToAgent(sessionKey: string, agentId: string): boolean {
  return sessionKey.startsWith(`${agentId}:`);
}

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

  /** 所有 agent 的会话列表：Record<agentId, SessionInfo_[]> */
  const [sessionsMap, setSessionsMap] = useState<Record<string, SessionInfo_[]>>({});

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

  /** 右侧日志面板是否展开 */
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  /** 左侧 Agent 侧栏是否收起 */
  const [agentSidebarCollapsed, setAgentSidebarCollapsed] = useState(false);

  /** 加载状态 */
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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
  // 网关连接状态
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function checkConnection() {
      try {
        // 动态 import 避免 server-side 问题
        const { getOpenClawClient } = await import("@/lib/openclaw");
        const client = await getOpenClawClient();
        setGatewayStatus(client.connected ? "connected" : "disconnected");
      } catch {
        setGatewayStatus("disconnected");
      }
    }

    setGatewayStatus("connecting");
    checkConnection();
    // 每 5 秒检查一次连接状态
    interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // 加载 agents
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadAgents() {
      try {
        const resp = await fetch("/api/agents");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const agentList: AgentInfo[] = (data.agents ?? []).map(
          (a: { id: string; name?: string; label?: string; description?: string }) => ({
            id: a.id,
            label: a.label ?? a.name ?? a.id,
            description: a.description,
            isArchitect: a.id === OPENCLAW_AGENT_ARCHITECT_ID,
          })
        );
        setAgents(agentList);

        // 如果已有 currentAgentId，检查是否仍有效
        if (currentAgentId && !agentList.find((a) => a.id === currentAgentId)) {
          setCurrentAgentId(agentList[0]?.id);
        } else if (!currentAgentId && agentList.length > 0) {
          setCurrentAgentId(agentList[0].id);
        }
      } catch {
        setAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    }
    loadAgents();
  }, [currentAgentId]);

  // ---------------------------------------------------------------------------
  // 加载 sessions（当 agent 变化时）
  // ---------------------------------------------------------------------------

  const loadSessions = useCallback(
    async (agentId: string) => {
      setLoadingSessions(true);
      try {
        const resp = await fetch(`/api/gateway/sessions?agentId=${encodeURIComponent(agentId)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const sessions: SessionInfo_[] = (data.sessions ?? []).map(
          (s: { key: string; label?: string; title?: string; updatedAt?: string; lastMessage?: string }) => ({
            key: s.key,
            label: s.label ?? s.title ?? "未命名会话",
            preview: s.lastMessage ?? "暂无消息",
            relativeTime: formatRelativeTime(s.updatedAt),
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
          })
        );
        setSessionsMap((prev) => ({ ...prev, [agentId]: sessions }));
      } catch {
        setSessionsMap((prev) => ({ ...prev, [agentId]: [] }));
      } finally {
        setLoadingSessions(false);
      }
    },
    []
  );

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
      loadSessions(agentId);
      loadMessages(agentId, savedKey);
    } else {
      setCurrentSessionKey(undefined);
      setMessages([]);
      loadSessions(agentId);
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
      setSessionsMap((prev) => ({
        ...prev,
        [currentAgentId]: [newSession, ...(prev[currentAgentId] ?? [])],
      }));
      handleSelectSession(newSession.key);
    } catch {
      // 创建失败，静默忽略
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
      setSessionsMap((prev) => ({ ...prev, [currentAgentId]: updated }));

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
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        rightPanelOpen={rightPanelOpen}
        onToggleAgentSidebar={() => setAgentSidebarCollapsed((v) => !v)}
        agentSidebarCollapsed={agentSidebarCollapsed}
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
            loadingAgents={loadingAgents}
            loadingSessions={loadingSessions}
            openclawAgentArchitectId={OPENCLAW_AGENT_ARCHITECT_ID}
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
        />

        {/* 右侧日志面板 */}
        {rightPanelOpen && <OpenClawLogsPanel onClose={() => setRightPanelOpen(false)} />}
      </div>
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
}: {
  gatewayStatus: GatewayStatus;
  currentAgentLabel?: string;
  onToggleRightPanel: () => void;
  rightPanelOpen: boolean;
  onToggleAgentSidebar: () => void;
  agentSidebarCollapsed: boolean;
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            {agentSidebarCollapsed ? (
              <path d="M2 3h12v2H2V3zm0 4h9v2H2V7zm0 4h12v2H2v-2z" />
            ) : (
              <path d="M2 3h12v2H2V3zm0 4h9v2H2V7zm0 4h12v2H2v-2z" />
            )}
          </svg>
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

        {/* 当前 Agent */}
        {currentAgentLabel && (
          <span className="text-sm text-zinc-300 truncate ml-1">
            {currentAgentLabel}
          </span>
        )}
      </div>

      {/* 中间：标题 */}
      <div className="flex-1 flex justify-center">
        <span className="text-sm font-medium text-zinc-400">OpenClaw Gateway</span>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleRightPanel}
          className={`p-1.5 rounded transition-colors ${
            rightPanelOpen
              ? "bg-zinc-700 text-zinc-200"
              : "hover:bg-zinc-800 text-zinc-400"
          }`}
          title={rightPanelOpen ? "收起日志" : "打开日志"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 14V2h12v12H2z" />
            <path d="M4 4h2v8H4V4zm6 0h2v8h-2V4z" />
          </svg>
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
  loadingAgents,
  loadingSessions,
  openclawAgentArchitectId,
}: {
  agents: AgentInfo[];
  currentAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  sessions: Record<string, SessionInfo_[]>;
  currentSessionKey?: string;
  onSelectSession: (sessionKey: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionKey: string) => void;
  loadingAgents: boolean;
  loadingSessions: boolean;
  openclawAgentArchitectId: string;
}) {
  const currentSessions = (currentAgentId ? sessions[currentAgentId] ?? [] : []) as SessionInfo_[];

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900 overflow-hidden">
      {/* Agent 列表 */}
      <div className="flex-shrink-0 px-2 py-2 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
          Agent
        </div>
        {loadingAgents ? (
          <div className="text-xs text-zinc-500 px-1 py-2">加载中...</div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors mb-0.5 truncate ${
                currentAgentId === agent.id
                  ? "bg-zinc-700 text-zinc-100 selected-item"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title={agent.label}
            >
              <span className="truncate block">{agent.label}</span>
              {agent.id === openclawAgentArchitectId && (
                <span className="text-[10px] text-zinc-500 ml-1">Architect</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* 会话列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-2 py-2 flex-shrink-0">
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

        {loadingSessions ? (
          <div className="text-xs text-zinc-500 px-2 py-2">加载中...</div>
        ) : (
          currentSessions.map((session) => (
            <SessionRow
              key={session.key}
              session={session}
              selected={currentSessionKey === session.key}
              onSelect={() => onSelectSession(session.key)}
              onDelete={() => onDeleteSession(session.key)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

// ============================================================================
// SessionRow 子组件
// ============================================================================

function SessionRow({
  session,
  selected,
  onSelect,
  onDelete,
}: {
  session: SessionInfo_;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={`group px-2 py-1.5 mx-1 rounded cursor-pointer transition-colors mb-0.5 ${
        selected ? "bg-zinc-700 text-zinc-100" : "hover:bg-zinc-800 text-zinc-400"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs truncate flex-1">{session.label}</span>
        {hovering && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            title="删除会话"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        )}
      </div>
      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{session.preview}</div>
    </div>
  );
}
