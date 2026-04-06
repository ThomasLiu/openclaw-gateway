/**
 * GET /api/openclaw/agent-request-diagnostics
 * POST /api/openclaw/agent-request-diagnostics
 *
 * Agent 请求诊断数据接口
 *
 * GET: 获取诊断配置
 * POST: 更新诊断配置
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import {
  loadContextFilters,
  saveContextFilters,
  type ContextFiltersConfig,
} from "@/lib/openclaw/agent-request-context-filters-persist";
import { resolveAgentWorkspaceDir } from "@/lib/openclaw/workspace-path";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const agentId = req.nextUrl.searchParams.get("agentId") ?? "";

  if (!agentId) {
    return NextResponse.json(
      { error: "Missing 'agentId' query parameter" },
      { status: 400 }
    );
  }

  try {
    // 加载本地过滤器配置
    const filters = await loadContextFilters(agentId);

    // 尝试从网关获取诊断数据（脱敏：不泄露绝对路径）
    let gatewayDiagnostics: Record<string, unknown> = {};
    try {
      const client = await getOpenClawClient();
      const resp = await client.request<
        Record<string, unknown>
      >("agent.requestDiagnostics", { agentId });

      // 脱敏：移除绝对路径字段
      gatewayDiagnostics = sanitizeDiagnostics(resp);
    } catch {
      // 网关不支持该 RPC：静默跳过
    }

    return NextResponse.json({
      agentId,
      workspaceDir: await resolveAgentWorkspaceDir(agentId).catch(() => null),
      filters,
      diagnostics: gatewayDiagnostics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as {
      agentId?: string;
      filters?: ContextFiltersConfig;
    };

    const { agentId, filters } = body;

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { error: "Missing 'agentId' in body" },
        { status: 400 }
      );
    }

    if (!filters) {
      return NextResponse.json(
        { error: "Missing 'filters' in body" },
        { status: 400 }
      );
    }

    // 验证过滤器配置格式
    if (typeof filters.version !== "number" || !Array.isArray(filters.filters)) {
      return NextResponse.json(
        { error: "Invalid filters format" },
        { status: 400 }
      );
    }

    await saveContextFilters(agentId, filters);

    return NextResponse.json({ ok: true, agentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 脱敏诊断数据（移除绝对路径） */
function sanitizeDiagnostics(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // 跳过包含路径的键
    if (
      key.includes("path") ||
      key.includes("dir") ||
      key.includes("file") ||
      key.includes("root")
    ) {
      continue;
    }

    if (typeof value === "string" && /^\/[a-z]/.test(value)) {
      // 跳过看起来像绝对路径的字符串值
      continue;
    }

    result[key] = value;
  }

  return result;
}
