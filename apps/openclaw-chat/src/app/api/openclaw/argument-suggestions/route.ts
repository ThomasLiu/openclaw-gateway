/**
 * GET /api/openclaw/argument-suggestions?key=<key>
 *
 * 获取斜杠命令参数的动态建议值
 *
 * supported keys:
 *   - "running-agents": 运行中的 agent IDs
 *   - "sessions": 会话列表
 *
 * dynamic = "force-dynamic"
 * runtime = "nodejs"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

type SuggestionResult = {
  agents?: Array<{ id: string; label?: string }>;
  sessions?: Array<{ key: string; label?: string }>;
  models?: Array<{ id: string; name?: string; provider?: string }>;
  skills?: Array<{ id: string; name?: string }>;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();

    switch (key) {
      case "running-agents": {
        // 获取 agents.list 作为运行中的 agents（实际是配置的 agents）
        const response = await client.request<{ agents: Array<{ id: string; name?: string }> }>("agents.list");
        const agents = response.agents.map((agent) => ({
          id: agent.id,
          label: agent.name ?? agent.id,
        }));
        return NextResponse.json({ agents });
      }

      case "sessions": {
        // 获取 sessions.list
        const response = await client.request<{ sessions: Array<{ key: string; label?: string; title?: string }> }>("sessions.list");
        const sessions = response.sessions.map((session) => ({
          key: session.key,
          label: session.label ?? session.title ?? session.key,
        }));
        return NextResponse.json({ sessions });
      }

      case "models": {
        // 获取 models.list
        const response = await client.request<Array<{ id: string; name?: string; provider?: string }>>("models.list");
        const models = response.map((model) => ({
          id: model.id,
          name: model.name ?? model.id,
          provider: model.provider,
        }));
        return NextResponse.json({ models });
      }

      case "providers": {
        // 获取 models.list 并提取唯一的 provider 列表
        const response = await client.request<Array<{ id: string; name?: string; provider?: string }>>("models.list");
        const uniqueProviders = [...new Set(response.map((m) => m.provider).filter(Boolean))] as string[];
        const providers = uniqueProviders.map((p) => ({ id: p, label: p }));
        return NextResponse.json({ providers });
      }

      case "skills": {
        // 获取 skills.status
        const response = await client.request<Array<{ id: string; name?: string }>>("skills.status");
        const skills = response.map((skill) => ({
          id: skill.id,
          name: skill.name ?? skill.id,
        }));
        return NextResponse.json({ skills });
      }

      default:
        return NextResponse.json({ error: `Unknown key: ${key}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
