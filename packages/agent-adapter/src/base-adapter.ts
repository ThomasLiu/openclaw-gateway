import { AgentAdapter, AgentConfig, Message, ToolDefinition, ToolResult, SessionInfo, MemoryEntry, SkillInfo } from './types';

export abstract class BaseAdapter implements AgentAdapter {
  protected config: AgentConfig;
  protected sessionId: string;
  protected messages: Message[] = [];
  protected startTime: Date = new Date();

  constructor(config: AgentConfig) {
    this.config = config;
    try {
      this.startTime = new Date();
      console.log('BaseAdapter constructor - startTime:', this.startTime, 'typeof:', typeof this.startTime);
      // 检查是否是有效的Date对象
      if (isNaN(this.startTime.getTime())) {
        console.error('BaseAdapter constructor - Invalid Date object:', this.startTime);
        // 确保startTime始终是一个有效的Date对象
        this.startTime = new Date(Date.now());
        console.log('BaseAdapter constructor - Fallback startTime:', this.startTime, 'typeof:', typeof this.startTime);
      }
    } catch (error) {
      console.error('BaseAdapter constructor - Error creating Date object:', error);
      // 确保startTime始终是一个有效的Date对象
      this.startTime = new Date(Date.now());
      console.log('BaseAdapter constructor - Fallback startTime:', this.startTime, 'typeof:', typeof this.startTime);
    }
    this.sessionId = config.sessionId || this.generateSessionId();
  }

  /**
   * 初始化 agent 适配器
   */
  async initialize(config: AgentConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    if (config.sessionId) {
      this.sessionId = config.sessionId;
    }
  }

  /**
   * 运行对话
   */
  abstract runConversation(userMessage: string, conversationHistory?: Message[]): Promise<Message[]>;

  /**
   * 获取可用工具
   */
  abstract getTools(): Promise<ToolDefinition[]>;

  /**
   * 执行工具
   */
  abstract executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult>;

  /**
   * 切换模型
   */
  abstract switchModel(model: string, provider: string, apiKey?: string, baseUrl?: string): Promise<void>;

  /**
   * 获取会话信息
   */
  async getSessionInfo(): Promise<SessionInfo> {
    // 确保startTime始终是一个有效的Date对象
    const safeStartTime = this.startTime instanceof Date && !isNaN(this.startTime.getTime()) ? this.startTime : new Date();
    return {
      sessionId: this.sessionId,
      model: this.config.model,
      platform: this.config.platform || 'cli',
      startTime: safeStartTime,
      messages: this.messages
    };
  }

  /**
   * 保存会话
   */
  async saveSession(): Promise<void> {
    // 默认实现，子类可以覆盖
  }

  /**
   * 加载会话
   */
  async loadSession(sessionId: string): Promise<Message[]> {
    // 默认实现，子类可以覆盖
    return [];
  }

  /**
   * 管理内存
   */
  async addMemory(content: string, category: 'memory' | 'user' = 'memory'): Promise<MemoryEntry> {
    // 默认实现，子类可以覆盖
    return {
      id: this.generateId(),
      content,
      createdAt: new Date(),
      category
    };
  }

  async getMemory(): Promise<MemoryEntry[]> {
    // 默认实现，子类可以覆盖
    return [];
  }

  async deleteMemory(id: string): Promise<boolean> {
    // 默认实现，子类可以覆盖
    return false;
  }

  /**
   * 管理技能
   */
  async createSkill(name: string, description: string, content: string): Promise<SkillInfo> {
    // 默认实现，子类可以覆盖
    const now = new Date();
    return {
      id: this.generateId(),
      name,
      description,
      content,
      createdAt: now,
      updatedAt: now
    };
  }

  async getSkills(): Promise<SkillInfo[]> {
    // 默认实现，子类可以覆盖
    return [];
  }

  async updateSkill(id: string, updates: Partial<SkillInfo>): Promise<SkillInfo> {
    // 默认实现，子类可以覆盖
    const skill = await this.getSkills().then(skills => skills.find(s => s.id === id));
    if (!skill) {
      throw new Error(`Skill with id "${id}" not found`);
    }
    return {
      ...skill,
      ...updates,
      updatedAt: new Date()
    };
  }

  async deleteSkill(id: string): Promise<boolean> {
    // 默认实现，子类可以覆盖
    return false;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 默认实现，子类可以覆盖
  }

  /**
   * 生成会话 ID
   */
  protected generateSessionId(): string {
    try {
      // 直接使用当前时间，避免依赖this.startTime
      const now = new Date();
      console.log('generateSessionId - using current time:', now);
      
      if (now && typeof now.toISOString === 'function') {
        const timestamp = now.toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const random = Math.random().toString(36).substr(2, 6);
        return `${timestamp}_${random}`;
      } else {
        console.error('generateSessionId - now is not a valid Date object:', now);
        // 回退到使用时间戳
        const timestamp = Date.now().toString().slice(0, 13);
        const random = Math.random().toString(36).substr(2, 6);
        return `${timestamp}_${random}`;
      }
    } catch (error) {
      console.error('generateSessionId - error:', error);
      // 回退到使用时间戳
      const timestamp = Date.now().toString().slice(0, 13);
      const random = Math.random().toString(36).substr(2, 6);
      return `${timestamp}_${random}`;
    }
  }

  /**
   * 生成 ID
   */
  protected generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * 添加消息到会话
   */
  protected addMessage(message: Message): void {
    this.messages.push(message);
  }

  /**
   * 获取会话消息
   */
  protected getMessages(): Message[] {
    return this.messages;
  }

  /**
   * 清空会话消息
   */
  protected clearMessages(): void {
    this.messages = [];
  }

  /**
   * 自定义序列化方法，避免序列化startTime属性
   */
  toJSON() {
    return {
      config: this.config,
      sessionId: this.sessionId,
      messages: this.messages
      // 不序列化startTime属性，避免toISOString错误
    };
  }
}
