// ─── Core message types ─────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface UiMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  /** 助手消息附加元数据 */
  meta?: AssistantMessageMeta;
  /** 工具调用卡片（助手消息可含多张） */
  toolCards?: ToolCard[];
  /** 图片附件 */
  attachments?: UiAttachment[];
}

export interface UiAttachment {
  type: "image";
  mimeType: string;
  /** base64 content */
  content: string;
  /** optional alt text */
  alt?: string;
}

// ─── Tool card ─────────────────────────────────────────────────────────────

export interface ToolCard {
  id: string;
  name: string;
  input: unknown;
  output?: string;
  status: "pending" | "success" | "error";
}

// ─── Assistant meta ─────────────────────────────────────────────────────────

export interface AssistantMessageMeta {
  runId?: string;
  model?: string;
  modelProvider?: string;
  durationMs?: number;
  sessionKey?: string;
  agentId?: string;
}

// ─── Session ───────────────────────────────────────────────────────────────

export interface GatewaySessionRow {
  key: string;
  agentId: string;
  label?: string;
  title?: string;
  preview?: string;
  updatedAt: string;
  createdAt: string;
  hasUnread?: boolean;
  /** 会话级模型覆盖（可为 null） */
  model?: string | null;
  modelProvider?: string;
  spawnedBy?: string;
  subagentRole?: string;
}

// ─── Gateway types ──────────────────────────────────────────────────────────

export interface GatewayConfig {
  gatewayUrl: string;
  token?: string;
  password?: string;
}

export interface GatewayAuthConfig {
  gatewayUrl: string;
  token?: string;
  password?: string;
}
