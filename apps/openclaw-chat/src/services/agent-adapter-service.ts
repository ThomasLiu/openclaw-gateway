// ============================================================// OpenClaw Chat - Agent Adapter Service// 统一管理不同的 agent 管理工具适配器// ============================================================

import { agentManager, AgentAdapter, AgentConfig, Message, ToolDefinition, ToolResult, SessionInfo, MemoryEntry, SkillInfo } from '@openclaw/agent-adapter';

/**
 * Agent 适配器服务
 * 负责管理不同的 agent 管理工具适配器
 */
export class AgentAdapterService {
  private static instance: AgentAdapterService;
  private adapters: Map<string, AgentAdapter> = new Map();
  private activeAdapter: AgentAdapter | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): AgentAdapterService {
    if (!AgentAdapterService.instance) {
      AgentAdapterService.instance = new AgentAdapterService();
    }
    return AgentAdapterService.instance;
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    // 获取所有可用的适配器
    const availableAdapters = await agentManager.getAvailableAdapters();
    console.log('Available adapters:', availableAdapters);

    // 创建默认适配器
    this.activeAdapter = await agentManager.getDefaultAdapter();
    console.log('Active adapter:', this.activeAdapter);
  }

  /**
   * 获取所有可用的适配器
   */
  public async getAvailableAdapters(): Promise<Array<{ name: string; version: string }>> {
    return agentManager.getAvailableAdapters();
  }

  /**
   * 切换适配器
   */
  public async switchAdapter(adapterName: string, config: AgentConfig): Promise<AgentAdapter> {
    let adapter = this.adapters.get(adapterName);
    
    if (!adapter) {
      adapter = await agentManager.createAdapter(adapterName, config);
      this.adapters.set(adapterName, adapter);
    }
    
    this.activeAdapter = adapter;
    return adapter;
  }

  /**
   * 获取当前活跃的适配器
   */
  public getActiveAdapter(): AgentAdapter {
    if (!this.activeAdapter) {
      throw new Error('No active adapter');
    }
    return this.activeAdapter;
  }

  /**
   * 运行对话
   */
  public async runConversation(userMessage: string, conversationHistory?: Message[]): Promise<Message[]> {
    return this.getActiveAdapter().runConversation(userMessage, conversationHistory);
  }

  /**
   * 获取可用工具
   */
  public async getTools(): Promise<ToolDefinition[]> {
    return this.getActiveAdapter().getTools();
  }

  /**
   * 执行工具
   */
  public async executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    return this.getActiveAdapter().executeTool(toolName, args);
  }

  /**
   * 切换模型
   */
  public async switchModel(model: string, provider: string, apiKey?: string, baseUrl?: string): Promise<void> {
    return this.getActiveAdapter().switchModel(model, provider, apiKey, baseUrl);
  }

  /**
   * 获取会话信息
   */
  public async getSessionInfo(): Promise<SessionInfo> {
    return this.getActiveAdapter().getSessionInfo();
  }

  /**
   * 保存会话
   */
  public async saveSession(): Promise<void> {
    return this.getActiveAdapter().saveSession();
  }

  /**
   * 加载会话
   */
  public async loadSession(sessionId: string): Promise<Message[]> {
    return this.getActiveAdapter().loadSession(sessionId);
  }

  /**
   * 管理内存
   */
  public async addMemory(content: string, category?: 'memory' | 'user'): Promise<MemoryEntry> {
    return this.getActiveAdapter().addMemory(content, category);
  }

  public async getMemory(): Promise<MemoryEntry[]> {
    return this.getActiveAdapter().getMemory();
  }

  public async deleteMemory(id: string): Promise<boolean> {
    return this.getActiveAdapter().deleteMemory(id);
  }

  /**
   * 管理技能
   */
  public async createSkill(name: string, description: string, content: string): Promise<SkillInfo> {
    return this.getActiveAdapter().createSkill(name, description, content);
  }

  public async getSkills(): Promise<SkillInfo[]> {
    return this.getActiveAdapter().getSkills();
  }

  public async updateSkill(id: string, updates: Partial<SkillInfo>): Promise<SkillInfo> {
    return this.getActiveAdapter().updateSkill(id, updates);
  }

  public async deleteSkill(id: string): Promise<boolean> {
    return this.getActiveAdapter().deleteSkill(id);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.cleanup();
    }
    this.adapters.clear();
    this.activeAdapter = null;
  }
}

// 导出单例实例
export const agentAdapterService = AgentAdapterService.getInstance();
