import { NextResponse } from "next/server";
import { listAgentsFromOpenClawJson } from "@/lib/openclaw/config";
import { OPENCLAW_AGENT_ARCHITECT_ID } from "@/lib/openclaw-agent-architect/constants";

export async function GET() {
  try {
    const rawAgents = listAgentsFromOpenClawJson();
    const agents = rawAgents.map((a) => ({
      id: a.id,
      label: a.id === OPENCLAW_AGENT_ARCHITECT_ID ? "Agent 设计专家" : a.label,
    }));
    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
