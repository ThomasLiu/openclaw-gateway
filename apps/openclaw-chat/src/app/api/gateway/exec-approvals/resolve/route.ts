/**
 * POST /api/gateway/exec-approvals/resolve
 * 解析审批决策
 *
 * Body: { id: string, decision: "allow-once" | "allow-always" | "deny", kind?: "exec" | "plugin" }
 * 默认 kind: "exec"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: string; decision?: string; kind?: string };
  try {
    body = (await req.json()) as { id?: string; decision?: string; kind?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, decision, kind = "exec" } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'id'" }, { status: 400 });
  }

  if (
    decision !== "allow-once" &&
    decision !== "allow-always" &&
    decision !== "deny"
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid decision. Must be one of: allow-once, allow-always, deny",
      },
      { status: 400 }
    );
  }

  if (kind !== "exec" && kind !== "plugin") {
    return NextResponse.json(
      { error: "Invalid kind. Must be 'exec' or 'plugin'" },
      { status: 400 }
    );
  }

  try {
    const client = await getOpenClawClient();

    if (kind === "exec") {
      await client.execApprovalResolve(
        id,
        decision as "allow-once" | "allow-always" | "deny"
      );
    } else {
      await client.pluginApprovalResolve(
        id,
        decision as "allow-once" | "allow-always" | "deny"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
