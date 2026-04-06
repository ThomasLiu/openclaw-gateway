/**
 * GET/POST/DELETE /api/openclaw/cron
 *
 * 定时任务管理
 *
 * GET: 获取定时任务列表（cron.list）
 * POST: 创建定时任务
 * DELETE: 删除定时任务（Query: id）
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import type { CronJob } from "@/lib/openclaw/types";

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();
    const jobs = await client.cronList();

    return NextResponse.json({ jobs } satisfies { jobs: CronJob[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, jobs: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  // 校验必填字段
  if (typeof obj.agentId !== "string" || obj.agentId.trim() === "") {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  if (typeof obj.schedule !== "string" || obj.schedule.trim() === "") {
    return NextResponse.json({ error: "schedule is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();

    // 使用 cronList 配合请求
    // 注意：网关可能支持 cron.create RPC，这里使用 request 泛型调用
    const newJob = (await client.request("cron.create", {
      agentId: (obj.agentId as string).trim(),
      schedule: (obj.schedule as string).trim(),
      enabled: obj.enabled !== false,
      label: typeof obj.label === "string" ? obj.label.trim() : undefined,
    })) as CronJob;

    return NextResponse.json({ ok: true, job: newJob }, { status: 201 });
  } catch (err) {
    // 如果 cron.create 不存在，尝试通过 session 间接创建
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("not found") || message.includes("method")) {
      return NextResponse.json(
        { error: "cron.create not supported by gateway", message },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id") ?? "";

  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();
    await client.cronRemove(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
