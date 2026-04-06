/**
 * POST /api/openclaw/cli-exec
 *
 * 通过白名单限制的子进程执行 openclaw CLI
 *
 * Body: { action: string, args?: string[] }
 *
 * 返回 SSE 流式输出
 *
 * OPENCLAW_CLI_EXEC_DISABLED=1 → 503
 * maxDuration = 600
 * dynamic = "force-dynamic"
 * runtime = "nodejs"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js App Router maxDuration for server actions (秒)
export const maxDuration = 600;

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import {
  isOpenClawCliExecAction,
  getOpenClawCliExecArgv,
} from "@/config/openclaw-cli-actions";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 检查是否禁用
  if (process.env.OPENCLAW_CLI_EXEC_DISABLED === "1") {
    return NextResponse.json(
      { error: "CLI exec is disabled via OPENCLAW_CLI_EXEC_DISABLED" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.action !== "string" || obj.action.trim() === "") {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const action = (obj.action as string).trim().toLowerCase();

  // 白名单校验
  if (!isOpenClawCliExecAction(action)) {
    return NextResponse.json(
      {
        error: `Action '${action}' is not in the allowed list`,
        allowed: ["agents", "agents list", "agents show", "status", "version", "health", "logs", "logs tail", "config", "config get", "config show", "models", "models list", "skills", "skills list", "skills status", "sessions", "sessions list", "sessions show"],
      },
      { status: 403 }
    );
  }

  const args = Array.isArray(obj.args) ? (obj.args as string[]) : [];

  // 构造 argv
  const argv = getOpenClawCliExecArgv(action, args);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let killed = false;

      const proc = spawn(argv[0], argv.slice(1), {
        timeout: 580_000, // 略小于 maxDuration
      });

      function sendLine(type: "stdout" | "stderr", text: string) {
        if (killed) return;
        try {
          const data = JSON.stringify({ type, text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      }

      proc.stdout.on("data", (data) => {
        sendLine("stdout", data.toString());
      });

      proc.stderr.on("data", (data) => {
        sendLine("stderr", data.toString());
      });

      proc.on("error", (err) => {
        if (killed) return;
        killed = true;
        try {
          const data = JSON.stringify({ type: "error", text: err.message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: -1 })}\n\n`));
          controller.close();
        } catch {
          // Stream already closed
        }
      });

      proc.on("close", (code) => {
        if (killed) return;
        killed = true;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: code })}\n\n`));
          controller.close();
        } catch {
          // Stream already closed
        }
      });

      // 超时保护
      setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
          try {
            const data = JSON.stringify({ type: "error", text: "Command timed out" });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: 124 })}\n\n`));
            controller.close();
          } catch {
            // Stream already closed
          }
        }
      }, 580_000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
