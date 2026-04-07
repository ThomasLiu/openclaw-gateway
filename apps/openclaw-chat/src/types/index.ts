// ============================================================
// OpenClaw Chat - 四层混合数据访问系统 类型定义
// ============================================================

// ==================== Layer 1: 文件系统类型 ====================

/** OpenClaw 配置结构 */
export interface OpenClawConfig {
  gateway?: GatewayConfig;
  agents?: Record<string, AgentConfig>;
  models?: ModelConfig;
  [key: string]: unknown;
}

export interface GatewayConfig {
  host?: string;
  port?: number;
  token?: string;
  password?: string;
}

/** Agent 配置 */
export interface AgentConfig {
  id: string;
  name?: string;
  model?: string;
  systemPrompt?: string;
  workspace?: string;
  status?: 'idle' | 'running' | 'error' | 'disabled';
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

/** Agent 元数据（从文件系统读取） */
export interface AgentMetadata {
  id: string;
  config: AgentConfig;
  hasAgentsMd: boolean;
  hasSoulMd: boolean;
  hasToolsMd: boolean;
  sessionCount: number;
  lastSessionTime?: number;
}

/** Session 文件元数据 */
export interface SessionMetadata {
  id: string;
  agentId: string;
  filePath: string;
  startTime: number;
  endTime: number;
  messageCount: number;
  size: number;
}

/** 消息类型 */
export interface SessionMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | MessageContent[];
  model?: string;
  timestamp?: number;
  tokensInput?: number;
  tokensOutput?: number;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface MessageContent {
  type: 'text' | 'image_url' | 'thinking';
  text?: string;
  imageUrl?: { url: string };
  thinking?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/** 日志条目 */
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  raw?: string;
}

/** 技能信息 */
export interface SkillInfo {
  name: string;
  type?: string;
  version?: string;
  description?: string;
  enabled?: boolean;
}

/** Cron 任务配置 */
export interface CronJobConfig {
  agentId: string;
  schedule: string; // cron 表达式
  command: string;
  enabled?: boolean;
  jobId?: string;
  lastRun?: number;
  nextRun?: number;
}

/** Cron Store 结构 */
export interface CronStore {
  jobs: CronJobConfig[];
}

/** Workspace 文件信息 */
export interface WorkspaceFileInfo {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
}

// ==================== Layer 2: CLI 命令类型 ====================

/** CLI 执行结果 */
export interface CliResult<T = string> {
  stdout: T;
  stderr: string;
  exitCode: number;
  command: string;
  durationMs: number;
}

/** CLI 执行选项 */
export interface CliOptions {
  timeout?: number;
  stream?: boolean;
  env?: Record<string, string>;
}

/** Streaming 回调 */
export interface StreamCallbacks {
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onComplete: (result: CliResult) => void;
  onError: (error: Error) => void;
}

// ==================== Layer 3: WebSocket 客户端类型 ====================

/** 连接状态 */
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

/** JSON-RPC 请求 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: number | string;
}

/** JSON-RPC 响应 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: JsonRpcError;
  id?: number | string;
}

/** JSON-RPC 错误 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** 认证方式 */
export interface AuthConfig {
  token?: string;
  password?: string;
  tailscale?: boolean;
}

/** Gateway 客户端接口 */
export interface IGatewayClient {
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionState(): ConnectionState;
  call<T>(method: string, params?: unknown): Promise<T>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  subscribe(method: string, params?: unknown): AsyncIterable<unknown>;
}

/** 聊天发送参数 */
export interface ChatSendParams {
  agentId: string;
  message: string;
  sessionId?: string;
  stream?: boolean;
}

/** 聊天历史参数 */
export interface ChatHistoryParams {
  sessionId: string;
  limit?: number;
  offset?: number;
}

/** Sessions 列表参数 */
export interface SessionsListParams {
  agentId?: string;
  limit?: number;
  offset?: number;
}

/** 配置获取参数 */
export interface ConfigGetParams {
  path?: string;
}

/** 配置设置参数 */
export interface ConfigSetParams {
  path: string;
  value: unknown;
}

/** 日志流参数 */
export interface LogsTailParams {
  lines?: number;
  follow?: boolean;
  level?: string;
}

/** Cron 列表参数 */
export interface CronListParams {
  agentId?: string;
}

/** Cron 运行参数 */
export interface CronRunParams {
  jobId: string;
}

/** Cron 运行历史参数 */
export interface CronRunsParams {
  jobId: string;
  limit?: number;
}

/** 健康检查响应 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  connections?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/** 模型信息 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  maxTokens?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

/** 技能状态 */
export interface SkillStatus {
  name: string;
  installed: boolean;
  enabled: boolean;
  version?: string;
  description?: string;
}

/** 更新运行结果 */
export interface UpdateRunResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changelog?: string;
}

// ==================== Layer 4: SQLite 缓存类型 ====================

/** 缓存条目 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

/** 缓存查询结果（带缓存状态） */
export interface CachedResult<T> {
  data: T;
  hit: boolean;
  age: number; // 缓存年龄（毫秒）
  source: 'cache' | 'fresh';
}

/** Session 缓存记录 */
export interface SessionCacheRecord {
  id?: number;
  sessionId: string;
  agentId: string;
  role: string;
  content: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  timestamp: number;
  createdAt: number;
}

/** 配置快照记录 */
export interface ConfigSnapshotRecord {
  key: string;
  value: string;
  updatedAt: number;
}

/** Agent 状态缓存记录 */
export interface AgentStateCacheRecord {
  agentId: string;
  name?: string;
  status?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  updatedAt: number;
}

/** 用户偏好记录 */
export interface UserPreferenceRecord {
  key: string;
  value: string;
  updatedAt: number;
}

/** CLI 命令历史记录 */
export interface CliCommandHistoryRecord {
  id?: number;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  executedAt: number;
}

/** 日志搜索过滤器 */
export interface LogSearchFilters {
  level?: string[];
  source?: string[];
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

/** 日志搜索结果 */
export interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  queryTime: number;
}

// ==================== API Route 类型 ====================

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ResponseMeta {
  timestamp: number;
  source: 'fs' | 'cli' | 'ws' | 'cache';
  cacheHit?: boolean;
  durationMs: number;
}

/** API 路由处理器上下文 */
export interface ApiRouteContext {
  request: NextRequest;
  params?: Record<string, string>;
}

// ==================== 工具类型 ====================

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/** 分页结果 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}
