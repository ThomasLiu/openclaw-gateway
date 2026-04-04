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

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();

    // 调用网关 agents.list
    const rawAgents = await client.request<
      Array<{ id: string; label?: string }>
    >("agents.list");

    const agents = (rawAgents as Array<{ id: string; label?: string }>).map(
      (agent) => ({
        id: agent.id,
        // Architect Agent 使用特殊中文标签
        label:
          agent.id === OPENCLAW_AGENT_ARCHITECT_ID
            ? "Agent 设计专家"
            : agent.label ?? agent.id,
      })
    );

    return NextResponse.json({ agents });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
