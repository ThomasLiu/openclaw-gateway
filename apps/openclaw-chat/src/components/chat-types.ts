/**
 * UI 层 TypeScript 类型定义
 */

// ============================================================================
// 工具调用类型
// ============================================================================

/** 工具调用 */
export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

/** 工具结果 */
export type ToolResult = {
  tool_use_id: string;
  content: string;
};

/** 工具卡片（用于渲染） */
export type ToolCard = {
  kind: "call" | "result";
  name: string;
  args?: unknown;
  text?: string;
};

/** 消息分组（用于 Slack 风格布局） */
export type MessageGroup = {
  role: "user" | "assistant" | "tool" | "system";
  messages: Array<{ message: MessageItem }>;
  timestamp: number;
  isStreaming?: boolean;
  senderLabel?: string;
};

// ============================================================================
// 消息使用量类型
// ============================================================================

/** 消息使用量信息 */
export type MessageUsage = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
};

/** 消息成本信息 */
export type MessageCost = {
  total?: number;
};

// ============================================================================
// 图片消息类型
// ============================================================================

/** 消息中的图片 */
export type MessageImage = {
  url: string;
  alt?: string;
};

// ============================================================================
// 用户/助手/系统消息
// ============================================================================

/** 用户/助手/系统/工具消息 */
export type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
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
  /** 使用量信息 */
  usage?: MessageUsage;
  /** 成本信息 */
  cost?: MessageCost;
  /** 上下文窗口使用百分比 */
  contextPercent?: number;
  /** 消息中的图片 */
  images?: MessageImage[];
  /** 工具调用列表 */
  toolCalls?: ToolCall[];
  /** 工具结果列表 */
  toolResults?: ToolResult[];
  /** 思考内容（reasoning） */
  thinking?: string;
  /** 是否已删除 */
  isDeleted?: boolean;
  /** 是否已固定 */
  isPinned?: boolean;
  /** 发送者标签（如多用户场景） */
  senderLabel?: string;
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
  /** 删除消息回调 */
  onDeleteMessage?: (messageId: string) => void;
  /** 固定消息回调 */
  onPinMessage?: (messageId: string) => void;
};

/** Composer Props */
export type ComposerProps = {
  disabled?: boolean;
  streaming?: boolean;
  /** 排队中的消息数量 */
  queueLength?: number;
  /** 当前模型名称 */
  modelName?: string;
  /** 可用模型列表 */
  availableModels?: string[];
  /** 选择模型回调 */
  onModelChange?: (model: string) => void;
  /** 附件列表 */
  attachments?: ChatAttachment[];
  /** 附件变化回调 */
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  onSend: (content: string) => void;
  onAbort?: () => void;
  /** 新建会话回调 */
  onNewSession?: () => void;
};

/** 聊天附件 */
export type ChatAttachment = {
  id: string;
  dataUrl: string;
  mimeType: string;
};

/** MessageList Props */
export type MessageListProps = {
  messages: MessageItem[];
  streamingMessageId?: string;
  streamingDelta?: string;
};

/** StreamingWaveBar Props */
export type StreamingWaveBarProps = Record<string, never>;
