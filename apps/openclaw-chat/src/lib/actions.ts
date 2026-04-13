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

import { compareVersions, cleanVersion } from '@/lib/utils/version-utils';

// 获取远程版本号（从npm注册表获取）
export async function getRemoteVersion(): Promise<string> {
  try {
    // 从npm注册表获取最新版本
    console.log('[Version Check] Checking for latest version from npm registry');
    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://registry.npmjs.org/openclaw/latest', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const latestVersion = data.version as string;
    console.log('[Version Check] Remote version from npm:', latestVersion);
    return latestVersion;
  } catch (error) {
    console.error('[Version Check] Failed to get remote version:', error);
    return '0.0.0';
  }
}

export async function getHealth() {
  try {
    // 检查本地 openclaw gateway 的可访问性
    // 尝试执行 openclaw 命令来检查服务状态
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    
    console.log('[Health Check] Starting gateway health check');
    
    // 检查环境变量和PATH
    console.log('[Health Check] Checking environment variables:');
    console.log('[Health Check] PATH:', process.env.PATH);
    console.log('[Health Check] NODE_ENV:', process.env.NODE_ENV);
    
    // 执行 which openclaw 命令来检查openclaw是否在PATH中
    console.log('[Health Check] Executing: which openclaw');
    const { stdout: whichOutput } = await execFileAsync('which', ['openclaw'], {
      timeout: 2000,
    });
    console.log('[Health Check] which openclaw output:', whichOutput.trim());
    
    // 执行 openclaw gateway probe 命令来检查网关状态
    console.log('[Health Check] Executing: openclaw gateway probe --json --timeout 10000');
    const { stdout: gatewayProbeOutput, stderr: gatewayProbeStderr } = await execFileAsync('openclaw', ['gateway', 'probe', '--json', '--timeout', '10000'], {
      timeout: 15000,
      env: process.env,
    });
    console.log('[Health Check] Gateway probe stdout:', gatewayProbeOutput.substring(0, 500)); // 只显示前500个字符
    console.log('[Health Check] Gateway probe stderr:', gatewayProbeStderr);
    
    // 解析 JSON 输出检查网关是否可达
    let probeResult;
    try {
      probeResult = JSON.parse(gatewayProbeOutput);
    } catch {
      // 如果 JSON 解析失败，回退到字符串检查
      probeResult = null;
    }
    // JSON 格式中，ok 字段表示整体状态，targets 数组中的 connect.ok 表示连接状态
    const isReachable = probeResult?.ok === true || 
      (probeResult?.targets?.some((t: { connect?: { ok?: boolean } }) => t.connect?.ok === true)) ||
      gatewayProbeOutput.includes('Reachable: yes');
    if (isReachable) {
      // 获取版本号
      console.log('[Health Check] Executing: openclaw --version');
      const version = await getOpenClawVersion();
      console.log('[Health Check] Version:', version);
      
      // 检查版本更新
      const remoteVersion = await getRemoteVersion();
      console.log('[Version Check] Remote version:', remoteVersion);
      
      // 清理版本字符串格式
      const cleanedVersion = cleanVersion(version);
      const hasUpdate = compareVersions(remoteVersion, cleanedVersion) > 0;
      console.log('[Version Check] Has update:', hasUpdate);
      
      console.log('[Health Check] Gateway health check completed successfully');
      return { ok: true, status: "live" as const, version: cleanedVersion, hasUpdate, remoteVersion };
    } else {
      console.error('[Health Check] Gateway is not reachable');
      return { ok: false, status: "down" as const, version: "unknown", hasUpdate: false, remoteVersion: "unknown" };
    }
  } catch (error) {
    console.error('[Health Check] Failed to check openclaw gateway status:', error);
    if (error instanceof Error) {
      console.error('[Health Check] Error message:', error.message);
      console.error('[Health Check] Error stack:', error.stack);
    }
    
    // 尝试直接获取版本号，即使其他命令失败
    let version = "unknown";
    try {
      console.log('[Health Check] Trying to get version directly: openclaw --version');
      const { execFile } = require('child_process');
      const { promisify } = require('util');
      const execFileAsync = promisify(execFile);
      const { stdout } = await execFileAsync('openclaw', ['--version'], {
        timeout: 5000,
      });
      version = stdout.trim();
      console.log('[Health Check] Direct version check successful:', version);
    } catch (versionError) {
      console.error('[Health Check] Failed to get version directly:', versionError);
    }
    
    // 检查版本更新
    const remoteVersion = await getRemoteVersion();
    console.log('[Version Check] Remote version:', remoteVersion);
    
    // 清理版本字符串格式
    const cleanedVersion = cleanVersion(version);
    const hasUpdate = compareVersions(remoteVersion, cleanedVersion) > 0;
    console.log('[Version Check] Has update:', hasUpdate);
    
    // 由于命令执行失败，返回网关不可访问状态
    console.log('[Health Check] Returning ok: false because gateway probe failed');
    return { ok: false, status: "down" as const, version: cleanedVersion, hasUpdate, remoteVersion };
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
