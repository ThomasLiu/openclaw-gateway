/**
 * GET /api/agents — 列出所有 Agent
 *
 * 特殊处理：OPENCLAW_AGENT_ARCHITECT_ID → 标签「Agent 设计专家」
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

/** Agent 设计专家的常量 ID（来自 spec-04） */
export const OPENCLAW_AGENT_ARCHITECT_ID = "agent-architect";

/** agents.list 返回的网关响应格式 */
interface AgentsListResponse {
  defaultId: string;
  mainKey: string;
  scope: string;
  agents: Array<{ id: string; name?: string }>;
}

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();

    // 调用网关 agents.list（返回 { defaultId, mainKey, scope, agents }）
    const response = await client.request<AgentsListResponse>("agents.list");

    const agents = response.agents.map((agent) => ({
      id: agent.id,
      // Architect Agent 使用特殊中文标签
      label:
        agent.id === OPENCLAW_AGENT_ARCHITECT_ID
          ? "Agent 设计专家"
          : agent.name ?? agent.id,
    }));

    return NextResponse.json({ agents });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
