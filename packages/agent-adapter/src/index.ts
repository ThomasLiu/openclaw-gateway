export * from './base-adapter';
export * from './adapters/openclaw-adapter';
export * from './adapters/hermes-adapter';

// 显式导出 types 中的内容，避免与 agent-manager 冲突
export {
  AgentConfig,
  Message,
  ToolCall,
  ToolResult,
  ToolDefinition,
  SessionInfo,
  MemoryEntry,
  SkillInfo,
  AgentAdapter,
  AgentAdapterFactory
} from './types';

// 导出 agent-manager 中的内容
export { AgentManager, getAgentManager } from './agent-manager';

// 注册默认适配器
import { getAgentManager } from './agent-manager';
import { OpenclawAdapterFactory } from './adapters/openclaw-adapter';
import { HermesAdapterFactory } from './adapters/hermes-adapter';

const agentManager = getAgentManager();

// 注册 openclaw 适配器
const openclawFactory = new OpenclawAdapterFactory();
agentManager.registerAdapterFactory(openclawFactory);

// 注册 hermes 适配器
const hermesFactory = new HermesAdapterFactory();
agentManager.registerAdapterFactory(hermesFactory);

// 设置默认适配器为 openclaw
agentManager.setDefaultAdapter('openclaw');

export { agentManager };
