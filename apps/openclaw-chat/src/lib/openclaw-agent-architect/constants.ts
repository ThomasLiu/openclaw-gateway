/**
 * Agent 设计专家（Architect）相关常量
 * @module openclaw-agent-architect/constants
 */

import "server-only";

/** Architect Agent 的唯一标识符 */
export const OPENCLAW_AGENT_ARCHITECT_ID = "agent-architect";

/**
 * 获取 Architect Agent 在 UI 中显示的中文标签
 * 用于 /api/agents 返回时替换默认 name
 */
export function getArchitectLabel(): string {
  return "Agent 设计专家";
}

/**
 * 判断给定 agentId 是否为 Architect
 */
export function isArchitectAgent(agentId: string): boolean {
  return agentId === OPENCLAW_AGENT_ARCHITECT_ID;
}
