/**
 * Workspace path utilities — safe relative path validation and workspace dir resolution.
 */
import * as path from "path";
import * as os from "os";

/**
 * Resolve the workspace directory for a given agent.
 * Uses OPENCLAW_STATE_DIR or falls back to ~/.openclaw/agents/<agentId>/workspace
 */
export function resolveAgentWorkspaceDir(agentId: string): string {
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "agents");
  return path.join(stateDir, agentId, "workspace");
}

/**
 * Resolve the agent directory (contains skills/, config, etc.)
 */
export function resolveAgentDir(agentId: string): string {
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "agents");
  return path.join(stateDir, agentId);
}

/**
 * Resolve the openclaw state directory
 */
export function resolveOpenClawStateDir(): string {
  return process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw");
}

/**
 * Check if a relative path is safe (no .. or . segments).
 * Returns the normalized relative path or throws.
 */
export function safeWorkspaceRelativePath(workspaceDir: string, rel: string): string {
  // Split and validate no . or .. segments
  const segments = rel.split("/").filter(Boolean);
  if (segments.some((s) => s === "." || s === "..")) {
    throw new Error("Invalid relative path: . or .. segments not allowed");
  }
  // Verify the resolved path is still under workspaceDir
  const resolved = path.resolve(workspaceDir, rel);
  const wsResolved = path.resolve(workspaceDir);
  if (!resolved.startsWith(wsResolved + path.sep) && resolved !== wsResolved) {
    throw new Error("Path escape attempt detected");
  }
  return rel;
}

/**
 * Assert a workspace file target is safe (used before write operations).
 */
export function assertWorkspaceTargetSafe(workspaceDir: string, target: string): void {
  const resolved = path.resolve(workspaceDir, target);
  const wsResolved = path.resolve(workspaceDir);
  if (!resolved.startsWith(wsResolved + path.sep)) {
    throw new Error("Workspace path escape attempt");
  }
}
