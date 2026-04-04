/**
 * gateway-session-normalize.ts
 * 网关 sessions.list 返回结果的规范化与 enrich。
 */

export type GatewaySessionRow = {
  key: string;
  id?: string;
  sessionId?: string;
  agentId?: string;
  label?: string;
  title?: string;
  preview?: string;
  updatedAt?: string;
  createdAt?: string;
  lastMessage?: string;
  // 额外字段（来自 spec-04）
  model?: string | null;
  modelProvider?: string;
  spawnedBy?: string;
  subagentRole?: string;
  kind?: string;
  channel?: string;
  subject?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  runtimeMs?: number;
};

/**
 * normalizeGatewaySessionRow — 对网关返回的原始会话行进行规范化，
 * 补充 UI 所需字段（preview、title 等）。
 */
export function normalizeGatewaySessionRow(
  row: GatewaySessionRow
): GatewaySessionRow {
  return {
    ...row,
    // 确保 key 存在
    key: row.key ?? "",
    // label 优先级高于 title
    label: row.label ?? row.title,
  };
}
