/**
 * Shared types for the OpenClaw gateway client.
 */

export type GatewayMessageContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string }
  | { type: "refusal"; text: string }
  | { type: "thinking"; thinking: string }
  | Record<string, unknown>;

export type GatewayMessage = {
  role: "assistant" | "user" | "system";
  content: GatewayMessageContent | GatewayMessageContent[];
  id?: string;
};

export type OpenClawClientMethods = {
  // Core connection
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  request: (method: string, params?: Record<string, unknown>) => Promise<unknown>;

  // Chat
  sendChatMessageStreaming: (
    sessionKey: string,
    message: string,
    agentId?: string
  ) => Promise<{ runId: string }>;
  abortChat: (sessionKey: string, runId?: string) => Promise<void>;
  fetchChatHistory: (sessionKey: string, limit?: number) => Promise<GatewayMessage[]>;

  // Sessions
  listSessions: (opts?: ListSessionsOpts) => Promise<SessionsListResult>;
  sessionsCreate: (agentId: string, label?: string) => Promise<SessionInfo>;
  sessionsDelete: (key: string) => Promise<void>;
  sessionsPatch: (key: string, patch: Record<string, unknown>) => Promise<void>;

  // Config & Models
  configGet: () => Promise<Record<string, unknown>>;
  configPatch: (patch: Record<string, unknown>, baseHash: string) => Promise<void>;
  modelsList: () => Promise<ModelInfo[]>;

  // Cron
  cronList: () => Promise<CronJob[]>;
  cronUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  cronRemove: (id: string) => Promise<void>;

  // Skills
  skillsStatus: () => Promise<SkillStatus[]>;
  skillsInstall: (skillId: string) => Promise<void>;

  // History
  fetchChatMessageHistory: (sessionKey: string, limit?: number) => Promise<GatewayMessage[]>;

  // Event listeners
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type ListSessionsOpts = {
  includeGlobal?: boolean;
  includeUnknown?: boolean;
  includeDerivedTitles?: boolean;
  includeLastMessage?: boolean;
  limit?: number;
  agentId?: string;
};

export type SessionsListResult = {
  sessions: SessionInfo[];
};

export type SessionInfo = {
  key: string;
  agentId?: string;
  label?: string;
  title?: string;
  updatedAt?: string;
  lastMessage?: string;
  createdAt?: string;
};

export type ModelInfo = {
  id: string;
  name?: string;
  provider?: string;
};

export type CronJob = {
  id: string;
  agentId?: string;
  label?: string;
  schedule?: string;
  enabled?: boolean;
};

export type SkillStatus = {
  id: string;
  name?: string;
  installed?: boolean;
  version?: string;
};
