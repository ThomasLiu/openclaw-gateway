import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentManager, getAgentManager } from '../agent-manager';
import { BaseAdapter } from '../base-adapter';
import { OpenclawAdapter, OpenclawAdapterFactory } from '../adapters/openclaw-adapter';
import { HermesAdapter, HermesAdapterFactory } from '../adapters/hermes-adapter';
import { AgentConfig, Message, ToolDefinition, ToolResult } from '../types';

// 模拟 BaseAdapter 的具体实现
class TestAdapter extends BaseAdapter {
  async runConversation(userMessage: string, conversationHistory?: Message[]): Promise<Message[]> {
    return [];
  }

  async getTools(): Promise<ToolDefinition[]> {
    return [];
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    return {
      success: true,
      message: 'Tool executed',
      data: args
    };
  }

  async switchModel(model: string, provider: string, apiKey?: string, baseUrl?: string): Promise<void> {
    // 空实现
  }
}

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    // 重置单例
    (global as any).agentManagerInstance = null;
    agentManager = getAgentManager();
  });

  it('should register adapter factories', async () => {
    const openclawFactory = new OpenclawAdapterFactory();
    agentManager.registerAdapterFactory(openclawFactory);

    const hermesFactory = new HermesAdapterFactory();
    agentManager.registerAdapterFactory(hermesFactory);

    const availableAdapters = await agentManager.getAvailableAdapters();
    expect(availableAdapters).toHaveLength(2);
    expect(availableAdapters.some(adapter => adapter.name === 'openclaw')).toBe(true);
    expect(availableAdapters.some(adapter => adapter.name === 'hermes')).toBe(true);
  });

  it('should create adapter instance', async () => {
    const openclawFactory = new OpenclawAdapterFactory();
    agentManager.registerAdapterFactory(openclawFactory);

    const config: AgentConfig = {
      model: 'claude-opus-4-20250514',
      platform: 'cli'
    };

    const adapter = await agentManager.createAdapter('openclaw', config);
    expect(adapter).toBeInstanceOf(OpenclawAdapter);
  });

  it('should get default adapter', async () => {
    const openclawFactory = new OpenclawAdapterFactory();
    agentManager.registerAdapterFactory(openclawFactory);

    const hermesFactory = new HermesAdapterFactory();
    agentManager.registerAdapterFactory(hermesFactory);

    const defaultAdapter = await agentManager.getDefaultAdapter();
    expect(defaultAdapter).toBeDefined();
  });

  it('should set default adapter', async () => {
    const openclawFactory = new OpenclawAdapterFactory();
    agentManager.registerAdapterFactory(openclawFactory);

    const hermesFactory = new HermesAdapterFactory();
    agentManager.registerAdapterFactory(hermesFactory);

    agentManager.setDefaultAdapter('hermes');
    const defaultAdapter = await agentManager.getDefaultAdapter();
    expect(defaultAdapter).toBeDefined();
  });
});

describe('BaseAdapter', () => {
  let adapter: TestAdapter;
  const config: AgentConfig = {
    model: 'claude-opus-4-20250514',
    platform: 'cli'
  };

  beforeEach(() => {
    adapter = new TestAdapter(config);
  });

  it('should initialize with config', async () => {
    const newConfig: AgentConfig = {
      model: 'gpt-4o',
      platform: 'web'
    };
    await adapter.initialize(newConfig);
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.model).toBe('gpt-4o');
    expect(sessionInfo.platform).toBe('web');
  });

  it('should get session info', async () => {
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.sessionId).toBeDefined();
    expect(sessionInfo.model).toBe(config.model);
    expect(sessionInfo.platform).toBe(config.platform);
    expect(sessionInfo.messages).toEqual([]);
  });

  it('should add memory', async () => {
    const memory = await adapter.addMemory('Test memory');
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe('Test memory');
    expect(memory.category).toBe('memory');
  });

  it('should get memory', async () => {
    const memories = await adapter.getMemory();
    expect(memories).toEqual([]);
  });

  it('should create skill', async () => {
    const skill = await adapter.createSkill('Test Skill', 'Test description', 'Test content');
    expect(skill.id).toBeDefined();
    expect(skill.name).toBe('Test Skill');
    expect(skill.description).toBe('Test description');
    expect(skill.content).toBe('Test content');
  });

  it('should get skills', async () => {
    const skills = await adapter.getSkills();
    expect(skills).toEqual([]);
  });
});

describe('OpenclawAdapter', () => {
  let adapter: OpenclawAdapter;
  const config: AgentConfig = {
    model: 'claude-opus-4-20250514',
    platform: 'cli'
  };

  beforeEach(() => {
    adapter = new OpenclawAdapter(config);
  });

  it('should initialize', async () => {
    await adapter.initialize(config);
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.model).toBe(config.model);
  });

  it('should run conversation', async () => {
    const messages = await adapter.runConversation('Hello');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].role).toBe('assistant');
  });

  it('should get tools', async () => {
    const tools = await adapter.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('read_file');
    expect(tools[1].name).toBe('write_file');
  });

  it('should execute tool', async () => {
    const result = await adapter.executeTool('read_file', { path: 'test.txt' });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Tool read_file executed successfully');
    expect(result.data).toEqual({ path: 'test.txt' });
  });

  it('should switch model', async () => {
    await adapter.switchModel('gpt-4o', 'openai');
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.model).toBe('gpt-4o');
  });
});

describe('HermesAdapter', () => {
  let adapter: HermesAdapter;
  const config: AgentConfig = {
    model: 'claude-opus-4-20250514',
    platform: 'cli'
  };

  beforeEach(() => {
    adapter = new HermesAdapter(config);
  });

  it('should initialize', async () => {
    await adapter.initialize(config);
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.model).toBe(config.model);
  });

  it('should run conversation', async () => {
    const messages = await adapter.runConversation('Hello');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].role).toBe('assistant');
  });

  it('should get tools', async () => {
    const tools = await adapter.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('terminal');
    expect(tools[1].name).toBe('browser');
  });

  it('should execute tool', async () => {
    const result = await adapter.executeTool('terminal', { command: 'ls -la' });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Tool terminal executed successfully');
    expect(result.data).toEqual({ command: 'ls -la' });
  });

  it('should switch model', async () => {
    await adapter.switchModel('gpt-4o', 'openai');
    const sessionInfo = await adapter.getSessionInfo();
    expect(sessionInfo.model).toBe('gpt-4o');
  });
});
