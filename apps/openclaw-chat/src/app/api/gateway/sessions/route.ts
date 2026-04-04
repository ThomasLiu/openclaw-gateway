/**
 * /api/gateway/sessions — 会话管理 API
 *
 * GET  - sessions.list + normalize + enrich
 * POST - sessions.create
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

// ─── inline normalize helpers（避免 Turbopack @/ 别名解析问题）───────────────

type GatewaySessionRow = {
  key: string;
  id?: string;
  sessionId?: string;
  agentId?: string;
  label?: string;
  title?: string;
  preview?: string;
  updatedAt?: string;
  createdAt?: string;
  lastMessage?: string;
  model?: string | null;
  modelProvider?: string;
  spawnedBy?: string;
  subagentRole?: string;
};

function normalizeGatewaySessionRow(
  row: GatewaySessionRow
): GatewaySessionRow {
  return {
    ...row,
    key: row.key ?? "",
    label: row.label ?? row.title,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10))
    );
    const activeMinutesStr = searchParams.get("activeMinutes");
    const search = searchParams.get("search") ?? undefined;
    const spawnedBy = searchParams.get("spawnedBy") ?? undefined;
    const agentId = searchParams.get("agentId") ?? undefined;

    const activeMinutes = activeMinutesStr
      ? parseInt(activeMinutesStr, 10)
      : undefined;

    const client = await getOpenClawClient();

    const result = await client.listSessions({
      includeGlobal: true,
      includeUnknown: true,
      includeDerivedTitles: true,
      includeLastMessage: true,
      limit,
      activeMinutes,
      search,
      spawnedBy,
      agentId,
    });

    // 规范化每条会话
    let sessions: GatewaySessionRow[] = (result.sessions ?? []).map(
      normalizeGatewaySessionRow
    );

    // enrich：对缺 preview 的项批量调用 sessions.preview（每批最多 64 keys）
    const missingPreview = sessions
      .filter((s) => !s.preview)
      .map((s) => s.key);

    if (missingPreview.length > 0) {
      // 简化 enrich：直接调用 sessions.preview（分批 64）
      const BATCH_SIZE = 64;
      for (let i = 0; i < missingPreview.length; i += BATCH_SIZE) {
        const batch = missingPreview.slice(i, i + BATCH_SIZE);
        try {
          const previews = await client.request<{
            previews: Array<{
              key: string;
              status: string;
              items: Array<{ text: string }>;
            }>;
          }>("sessions.preview", {
            keys: batch,
            limit: 1,
            maxChars: 240,
          });

          const previewMap = new Map<string, string>();
          for (const p of (previews as { previews: Array<{ key: string; status: string; items: Array<{ text: string }> }> }).previews ?? []) {
            if (p.status === "ok" && p.items.length > 0) {
              previewMap.set(p.key, p.items[0].text);
            }
          }

          for (const s of sessions) {
            if (!s.preview && previewMap.has(s.key)) {
              (s as Record<string, unknown>).preview = previewMap.get(s.key);
            }
          }
        } catch {
          // enrich 失败不影响主流程
        }
      }
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 }
    );
  }

  const agentId = (body.agentId as string | undefined)?.trim();
  const label = (body.label as string | undefined)?.trim();

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId required" },
      { status: 400 }
    );
  }

  try {
    const client = await getOpenClawClient();
    const result = await client.sessionsCreate(agentId, label);
    return NextResponse.json({ ok: true, key: result.key });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
