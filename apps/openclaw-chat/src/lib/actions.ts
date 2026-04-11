"use server";

import {
  listAgents,
  getAgentMetadata,
  listSessions,
  readSessionMessages,
  readOpenClawConfig,
  listSkills,
  getOpenClawVersion,
  readLogFile,
  getCronStore,
  listWorkspaceFiles,
  readAgentMdFile,
  AGENT_MD_FILES,
} from "@/lib/data/fs-reader";
import type { AgentMetadata, SessionMetadata, SessionMessage, SkillInfo, WorkspaceFileInfo, CronJobConfig } from "@/types";

export async function getHealth() {
  try {
    // 检查本地 openclaw gateway 的可访问性
    // 尝试执行 openclaw 命令来检查服务状态
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    
    // 执行 openclaw status 命令来检查服务状态
    const { stdout } = await execFileAsync('openclaw', ['status'], {
      timeout: 5000,
    });
    
    // 获取版本号
    const version = await getOpenClawVersion();
    
    return { ok: true, status: "live" as const, version };
  } catch (error) {
    console.error('Failed to check openclaw gateway status:', error);
    return { ok: false, status: "down" as const, version: "unknown" };
  }
}

export async function getAgents(): Promise<AgentMetadata[]> {
  const agentIds = await listAgents();
  const agents: AgentMetadata[] = [];
  for (const id of agentIds) {
    const meta = await getAgentMetadata(id).catch(() => null);
    if (meta) agents.push(meta);
  }
  return agents;
}

export async function getSessions(agentId: string): Promise<SessionMetadata[]> {
  return listSessions(agentId);
}

export async function getMessages(sessionPath: string, offset = 0, limit = 200): Promise<SessionMessage[]> {
  return readSessionMessages(sessionPath, offset, limit);
}

export async function getConfig(): Promise<Record<string, unknown>> {
  return readOpenClawConfig();
}

export async function getSkills(): Promise<SkillInfo[]> {
  return listSkills();
}

export async function getLogs(date?: string): Promise<unknown[]> {
  return readLogFile(date);
}

export async function getCronJobs(): Promise<{ jobs: CronJobConfig[] }> {
  return getCronStore();
}

export async function getWorkspaceFiles(agentId: string, relativePath?: string): Promise<WorkspaceFileInfo[]> {
  return listWorkspaceFiles(agentId, relativePath);
}

export async function getAgentMdFile(agentId: string, filename: typeof AGENT_MD_FILES[number]): Promise<{ filename: string; content: string } | null> {
  try {
    const content = await readAgentMdFile(agentId, filename);
    return content ? { filename, content } : null;
  } catch {
    return null;
  }
}
