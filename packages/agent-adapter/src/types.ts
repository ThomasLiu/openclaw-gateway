export interface AgentConfig {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  provider?: string;
  maxIterations?: number;
  toolDelay?: number;
  enabledToolsets?: string[];
  disabledToolsets?: string[];
  saveTrajectories?: boolean;
  verboseLogging?: boolean;
  quietMode?: boolean;
  platform?: string;
  sessionId?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  finishReason?: string;
  reasoning?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  target?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required?: string[];
}

export interface SessionInfo {
  sessionId: string;
  model: string;
  platform: string;
  startTime: Date;
  messages: Message[];
}

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt: Date;
  category: 'memory' | 'user' | 'skill';
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentAdapter {
  /**
   * 初始化 agent 适配器
   */
  initialize(config: AgentConfig): Promise<void>;

  /**
   * 运行对话
   */
  runConversation(userMessage: string, conversationHistory?: Message[]): Promise<Message[]>;

  /**
   * 获取可用工具
   */
  getTools(): Promise<ToolDefinition[]>;

  /**
   * 执行工具
   */
  executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult>;

  /**
   * 切换模型
   */
  switchModel(model: string, provider: string, apiKey?: string, baseUrl?: string): Promise<void>;

  /**
   * 获取会话信息
   */
  getSessionInfo(): Promise<SessionInfo>;

  /**
   * 保存会话
   */
  saveSession(): Promise<void>;

  /**
   * 加载会话
   */
  loadSession(sessionId: string): Promise<Message[]>;

  /**
   * 管理内存
   */
  addMemory(content: string, category?: 'memory' | 'user'): Promise<MemoryEntry>;
  getMemory(): Promise<MemoryEntry[]>;
  deleteMemory(id: string): Promise<boolean>;

  /**
   * 管理技能
   */
  createSkill(name: string, description: string, content: string): Promise<SkillInfo>;
  getSkills(): Promise<SkillInfo[]>;
  updateSkill(id: string, updates: Partial<SkillInfo>): Promise<SkillInfo>;
  deleteSkill(id: string): Promise<boolean>;

  /**
   * 清理资源
   */
  cleanup(): Promise<void>;
}

export interface AgentAdapterFactory {
  /**
   * 创建 agent 适配器实例
   */
  createAdapter(config: AgentConfig): Promise<AgentAdapter>;

  /**
   * 检查适配器是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取适配器名称
   */
  getName(): string;

  /**
   * 获取适配器版本
   */
  getVersion(): string;
}

export interface AgentManager {
  /**
   * 注册适配器工厂
   */
  registerAdapterFactory(factory: AgentAdapterFactory): void;

  /**
   * 获取所有可用的适配器
   */
  getAvailableAdapters(): Promise<Array<{ name: string; version: string }>>;

  /**
   * 创建适配器实例
   */
  createAdapter(adapterName: string, config: AgentConfig): Promise<AgentAdapter>;

  /**
   * 获取默认适配器
   */
  getDefaultAdapter(): Promise<AgentAdapter>;
}
