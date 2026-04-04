/**
 * POST /api/agent-architect/ensure
 * 确保 Agent 设计专家（Architect）存在（幂等操作）
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  OPENCLAW_AGENT_ARCHITECT_ID,
  getArchitectLabel,
} from "@/lib/openclaw-agent-architect/index";
import { resolveAgentWorkspaceDir } from "@/lib/openclaw/workspace-path";
import { listAgentsFromOpenClawJson } from "@/lib/openclaw/config";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function POST(
  _req: NextRequest
): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();

    // 检查 architect 是否已在 agents.list 中
    const agents = listAgentsFromOpenClawJson();
    const existingArchitect = agents.find(
      (a) => a.id === OPENCLAW_AGENT_ARCHITECT_ID
    );

    if (existingArchitect) {
      // 幂等：已存在，返回现有信息
      const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
      return NextResponse.json({
        alreadyExists: true,
        agentId: OPENCLAW_AGENT_ARCHITECT_ID,
        label: getArchitectLabel(),
        workspaceDir,
      });
    }

    // 不存在，调用 agents.create 创建
    // 注意：不能使用 reserved id "main"，使用特殊 architect id
    const createParams = {
      name: OPENCLAW_AGENT_ARCHITECT_ID,
      workspace: await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID),
      emoji: "🏗️",
    };

    try {
      await client.request("agents.create", createParams);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 如果是 already exists（网关可能已创建），仍然返回成功
      if (msg.includes("already exists") || msg.includes("ALREADY_EXISTS")) {
        const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
        return NextResponse.json({
          alreadyExists: true,
          agentId: OPENCLAW_AGENT_ARCHITECT_ID,
          label: getArchitectLabel(),
          workspaceDir,
        });
      }
      throw err;
    }

    const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
    return NextResponse.json({
      alreadyExists: false,
      agentId: OPENCLAW_AGENT_ARCHITECT_ID,
      label: getArchitectLabel(),
      workspaceDir,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
