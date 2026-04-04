/**
 * GET /api/agent-architect/status
 * 查询 Agent 设计专家（Architect）是否就绪
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { OPENCLAW_AGENT_ARCHITECT_ID } from "@/lib/openclaw-agent-architect/index";
import { resolveAgentWorkspaceDir } from "@/lib/openclaw/workspace-path";
import { listAgentsFromOpenClawJson } from "@/lib/openclaw/config";

export async function GET(): Promise<NextResponse> {
  try {
    // 从配置文件检查 architect 是否在 agents.list 中
    const agents = listAgentsFromOpenClawJson();
    const architectEntry = agents.find(
      (a) => a.id === OPENCLAW_AGENT_ARCHITECT_ID
    );

    if (!architectEntry) {
      return NextResponse.json({
        ready: false,
        agentId: OPENCLAW_AGENT_ARCHITECT_ID,
        workspaceDir: null,
        reason: "not_in_config",
      });
    }

    // 检查 workspace 路径是否存在
    let workspaceDir: string | null = null;
    try {
      workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
    } catch {
      workspaceDir = null;
    }

    return NextResponse.json({
      ready: true,
      agentId: OPENCLAW_AGENT_ARCHITECT_ID,
      workspaceDir,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
