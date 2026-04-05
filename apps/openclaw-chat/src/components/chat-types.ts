/**
 * UI 层 TypeScript 类型定义
 */

/** 用户/助手/系统消息 */
export type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  /** 流式追加时的 delta 内容（仅 assistant 角色） */
  delta?: string;
  /** 是否正在流式传输 */
  streaming?: boolean;
  /** 元数据（如模型名称） */
  meta?: {
    model?: string;
    durationMs?: number;
  };
};

/** Agent 信息 */
export type AgentInfo = {
  id: string;
  label: string;
  description?: string;
  /** Architect agent 特殊标记 */
  isArchitect?: boolean;
  /** 该 Agent 的最后会话摘要 */
  lastSession?: {
    preview: string;
    updatedAt: string;
    relativeTime: string;
  };
  /** 该 Agent 是否有正在运行的 session */
  isWorking: boolean;
  /** 该 Agent 的未读消息数 */
  unreadCount: number;
};

/** 会话信息 */
export type SessionInfo_ = {
  key: string;
  label: string;
  /** 相对时间描述 */
  relativeTime?: string;
  /** 最新消息预览 */
  preview?: string;
  updatedAt?: Date;
  createdAt?: Date;
  /** 是否为定时任务会话 */
  isCronSession?: boolean;
  /** 用户最后一条消息 */
  userLastMessage?: string;
  /** Agent 最后一条消息 */
  agentLastMessage?: string;
};

/** 连接状态 */
export type GatewayStatus = "connected" | "disconnected" | "connecting";

/** ChatApp 根组件 Props */
export type ChatAppProps = Record<string, never>;

/** AppTitleBar Props */
export type AppTitleBarProps = {
  gatewayStatus: GatewayStatus;
  currentAgentLabel?: string;
  onOpenSettings?: () => void;
};

/** AgentSidebar Props */
export type AgentSidebarProps = {
  agents: AgentInfo[];
  currentAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  sessions: Record<string, SessionInfo_[]>;
  currentSessionKey?: string;
  onSelectSession: (sessionKey: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionKey: string) => void;
};

/** SessionSidebar Props */
export type SessionSidebarProps = {
  sessions: SessionInfo_[];
  currentSessionKey?: string;
  onSelectSession: (sessionKey: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionKey: string) => void;
};

/** ChatPanel Props */
export type ChatPanelProps = {
  agentId: string;
  sessionKey: string;
  messages: MessageItem[];
  streaming: boolean;
  onSendMessage: (content: string) => void;
  onAbort: () => void;
};

/** Composer Props */
export type ComposerProps = {
  disabled?: boolean;
  streaming?: boolean;
  onSend: (content: string) => void;
  onAbort?: () => void;
};

/** MessageList Props */
export type MessageListProps = {
  messages: MessageItem[];
  streamingMessageId?: string;
  streamingDelta?: string;
};

/** StreamingWaveBar Props */
export type StreamingWaveBarProps = Record<string, never>;
