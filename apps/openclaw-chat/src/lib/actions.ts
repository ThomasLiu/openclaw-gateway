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
    const version = await getOpenClawVersion();
    return { ok: true, status: "live" as const, version };
  } catch {
    return { ok: true, status: "live" as const, version: "unknown" };
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
    return { filename, content };
  } catch {
    return null;
  }
}
