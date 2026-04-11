import { describe, it, expect, beforeEach } from 'vitest';
import { agentManager } from '../index';
import { AgentConfig } from '../types';

describe('Agent Adapter Integration', () => {
  const config: AgentConfig = {
    model: 'claude-opus-4-20250514',
    platform: 'cli'
  };

  beforeEach(async () => {
    // 确保 agentManager 已初始化
    const availableAdapters = await agentManager.getAvailableAdapters();
    expect(availableAdapters).toHaveLength(2);
  });

  it('should switch between different adapters', async () => {
    // 测试 openclaw 适配器
    const openclawAdapter = await agentManager.createAdapter('openclaw', config);
    const openclawTools = await openclawAdapter.getTools();
    expect(openclawTools).toHaveLength(2);
    expect(openclawTools[0].name).toBe('read_file');

    // 测试 hermes 适配器
    const hermesAdapter = await agentManager.createAdapter('hermes', config);
    const hermesTools = await hermesAdapter.getTools();
    expect(hermesTools).toHaveLength(2);
    expect(hermesTools[0].name).toBe('terminal');
  });

  it('should get default adapter', async () => {
    const defaultAdapter = await agentManager.getDefaultAdapter();
    expect(defaultAdapter).toBeDefined();
    
    // 测试默认适配器的基本功能
    const tools = await defaultAdapter.getTools();
    expect(tools).toBeDefined();
  });

  it('should handle adapter switching with different configurations', async () => {
    // 测试 openclaw 适配器 with custom config
    const openclawConfig: AgentConfig = {
      model: 'gpt-4o',
      platform: 'web',
      baseUrl: 'http://localhost:3000'
    };
    const openclawAdapter = await agentManager.createAdapter('openclaw', openclawConfig);
    await openclawAdapter.initialize(openclawConfig);
    const openclawSessionInfo = await openclawAdapter.getSessionInfo();
    expect(openclawSessionInfo.model).toBe('gpt-4o');

    // 测试 hermes 适配器 with custom config
    const hermesConfig: AgentConfig = {
      model: 'claude-3-opus',
      platform: 'cli',
      baseUrl: 'http://localhost:4000'
    };
    const hermesAdapter = await agentManager.createAdapter('hermes', hermesConfig);
    await hermesAdapter.initialize(hermesConfig);
    const hermesSessionInfo = await hermesAdapter.getSessionInfo();
    expect(hermesSessionInfo.model).toBe('claude-3-opus');
  });

  it('should handle conversation running on different adapters', async () => {
    // 测试 openclaw 适配器的对话功能
    const openclawAdapter = await agentManager.createAdapter('openclaw', config);
    const openclawMessages = await openclawAdapter.runConversation('Hello from openclaw');
    expect(openclawMessages).toHaveLength(2);
    expect(openclawMessages[1].content).toContain('Openclaw response');

    // 测试 hermes 适配器的对话功能
    const hermesAdapter = await agentManager.createAdapter('hermes', config);
    const hermesMessages = await hermesAdapter.runConversation('Hello from hermes');
    expect(hermesMessages).toHaveLength(2);
    expect(hermesMessages[1].content).toContain('Hermes response');
  });
});
