/**
 * Parsing utilities for exec/plugin approval gateway events.
 *
 * These functions extract typed data from the raw SSE payload
 * received from the gateway via the /api/gateway/exec-approvals/stream route.
 *
 * Shapes are derived from the upstream OpenClaw gateway implementation
 * (ai-reference-sources/openclaw/src/gateway/server-methods/exec-approval.ts,
 *  plugin-approval.ts).
 */

export interface ExecApprovalRequested {
  id: string;
  sessionKey: string;
  command: string;
  expiresAtMs: number;
  kind: 'exec' | 'plugin';
  /** Optional: human-readable reason or policy context */
  reason?: string;
  /** Optional: agentId for context */
  agentId?: string;
  /** Optional: shell working directory */
  cwd?: string;
}

export interface ExecApprovalResolved {
  id: string;
  decision: 'allow-once' | 'allow-always' | 'deny';
  kind: 'exec' | 'plugin';
  /** Optional: sessionKey for context */
  sessionKey?: string;
}

export type ApprovalResolved = ExecApprovalResolved;

export function parseExecApprovalRequested(raw: unknown): ExecApprovalRequested | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const sessionKey = typeof r.sessionKey === 'string' ? r.sessionKey.trim() : '';
  const command = typeof r.command === 'string' ? r.command : '';
  const expiresAtMs =
    typeof r.expiresAtMs === 'number' ? r.expiresAtMs : Date.now() + 60_000;
  const kind: 'exec' | 'plugin' = r.kind === 'plugin' ? 'plugin' : 'exec';

  if (!id || !command) return null;

  return {
    id,
    sessionKey,
    command,
    expiresAtMs,
    kind,
    reason: typeof r.reason === 'string' ? r.reason : undefined,
    agentId: typeof r.agentId === 'string' ? r.agentId : undefined,
    cwd: typeof r.cwd === 'string' ? r.cwd : undefined,
  };
}

export function parsePluginApprovalRequested(raw: unknown): ExecApprovalRequested | null {
  // Plugin approval uses the same shape, just forced to kind='plugin'
  const result = parseExecApprovalRequested(raw);
  if (result) result.kind = 'plugin';
  return result;
}

export function parseExecApprovalResolved(raw: unknown): ApprovalResolved | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const decision = r.decision;
  const kind: 'exec' | 'plugin' = r.kind === 'plugin' ? 'plugin' : 'exec';

  if (!id) return null;
  if (decision !== 'allow-once' && decision !== 'allow-always' && decision !== 'deny') {
    return null;
  }

  return {
    id,
    decision,
    kind,
    sessionKey: typeof r.sessionKey === 'string' ? r.sessionKey : undefined,
  };
}

export function parsePluginApprovalResolved(raw: unknown): ApprovalResolved | null {
  const result = parseExecApprovalResolved(raw);
  if (result) result.kind = 'plugin';
  return result;
}

/**
 * Format a shell command for display, truncating very long commands.
 */
export function formatCommandForDisplay(command: string, maxLen = 120): string {
  if (command.length <= maxLen) return command;
  return command.slice(0, maxLen - 3) + '…';
}

/**
 * Format a timestamp for display (e.g. "in 30s", "in 2m").
 */
export function formatExpiresIn(expiresAtMs: number): string {
  const remainingMs = expiresAtMs - Date.now();
  if (remainingMs <= 0) return '已过期';
  const seconds = Math.floor(remainingMs / 1000);
  if (seconds < 60) return `剩余 ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `剩余 ${minutes}m`;
  return `剩余 ${Math.floor(minutes / 60)}h`;
}
