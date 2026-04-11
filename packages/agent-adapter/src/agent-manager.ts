import { AgentAdapterFactory, AgentAdapter, AgentConfig, AgentManager as IAgentManager } from './types';

export class AgentManager implements IAgentManager {
  private adapterFactories: Map<string, AgentAdapterFactory> = new Map();
  private defaultAdapterName: string | null = null;

  /**
   * 注册适配器工厂
   */
  registerAdapterFactory(factory: AgentAdapterFactory): void {
    const name = factory.getName();
    this.adapterFactories.set(name, factory);
    
    // 如果是第一个适配器，设为默认
    if (this.defaultAdapterName === null) {
      this.defaultAdapterName = name;
    }
  }

  /**
   * 获取所有可用的适配器
   */
  async getAvailableAdapters(): Promise<Array<{ name: string; version: string }>> {
    const available: Array<{ name: string; version: string }> = [];
    
    for (const [name, factory] of this.adapterFactories.entries()) {
      const isAvailable = await factory.isAvailable();
      if (isAvailable) {
        available.push({
          name,
          version: factory.getVersion()
        });
      }
    }
    
    return available;
  }

  /**
   * 创建适配器实例
   */
  async createAdapter(adapterName: string, config: AgentConfig): Promise<AgentAdapter> {
    const factory = this.adapterFactories.get(adapterName);
    
    if (!factory) {
      throw new Error(`Adapter "${adapterName}" not found`);
    }
    
    const isAvailable = await factory.isAvailable();
    if (!isAvailable) {
      throw new Error(`Adapter "${adapterName}" is not available`);
    }
    
    const adapter = await factory.createAdapter(config);
    await adapter.initialize(config);
    
    return adapter;
  }

  /**
   * 获取默认适配器
   */
  async getDefaultAdapter(): Promise<AgentAdapter> {
    if (this.defaultAdapterName === null) {
      throw new Error('No adapter registered');
    }
    
    const availableAdapters = await this.getAvailableAdapters();
    if (availableAdapters.length === 0) {
      throw new Error('No adapter available');
    }
    
    // 优先使用默认适配器，如果不可用则使用第一个可用的
    let adapterName = this.defaultAdapterName;
    if (!availableAdapters.some(adapter => adapter.name === adapterName)) {
      adapterName = availableAdapters[0].name;
    }
    
    // 使用默认配置
    const defaultConfig: AgentConfig = {
      model: 'claude-opus-4-20250514',
      platform: 'cli'
    };
    
    return this.createAdapter(adapterName, defaultConfig);
  }

  /**
   * 设置默认适配器
   */
  setDefaultAdapter(adapterName: string): void {
    if (!this.adapterFactories.has(adapterName)) {
      throw new Error(`Adapter "${adapterName}" not registered`);
    }
    
    this.defaultAdapterName = adapterName;
  }

  /**
   * 获取已注册的适配器工厂
   */
  getAdapterFactories(): Map<string, AgentAdapterFactory> {
    return this.adapterFactories;
  }
}

// 全局单例
let agentManagerInstance: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!agentManagerInstance) {
    agentManagerInstance = new AgentManager();
  }
  return agentManagerInstance;
}
