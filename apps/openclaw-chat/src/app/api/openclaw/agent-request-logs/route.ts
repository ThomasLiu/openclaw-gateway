/**
 * GET /api/openclaw/agent-request-logs
 *
 * Agent 请求日志列表/内容接口
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveAgentDir } from "@/lib/openclaw/workspace-path";
import {
  extractJsonlEntries,
  parseJsonlSummary,
} from "@/lib/openclaw/agent-request-jsonl-summary";

/** Agent 日志目录（从 agentDir 的 logs 子目录） */
async function getAgentLogsDir(agentId: string): Promise<string> {
  const agentDir = await resolveAgentDir(agentId);
  return path.join(agentDir, "logs");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const agentId = req.nextUrl.searchParams.get("agentId") ?? "";
  const logName = req.nextUrl.searchParams.get("log") ?? "";
  const summaryOnly = req.nextUrl.searchParams.get("summary") === "true";

  if (!agentId) {
    return NextResponse.json(
      { error: "Missing 'agentId' query parameter" },
      { status: 400 }
    );
  }

  try {
    // 尝试列出日志文件
    const logsDir = await getAgentLogsDir(agentId);
    let logFiles: string[] = [];

    try {
      const entries = await fs.readdir(logsDir);
      logFiles = entries
        .filter((e) => e.endsWith(".jsonl") || e.endsWith(".log"))
        .sort()
        .reverse(); // 最新在前
    } catch {
      // 目录不存在
    }

    if (logName) {
      // 返回指定日志文件内容
      const logPath = path.join(logsDir, logName);
      let content: string;

      try {
        content = await fs.readFile(logPath, "utf-8");
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "ENOENT") {
          return NextResponse.json({ error: "Log file not found" }, { status: 404 });
        }
        throw err;
      }

      if (summaryOnly) {
        const summary = parseJsonlSummary(content);
        return NextResponse.json({ agentId, logName, summary });
      }

      const entries = extractJsonlEntries(content);
      return NextResponse.json({
        agentId,
        logName,
        entries,
        count: entries.length,
      });
    }

    // 返回日志文件列表
    return NextResponse.json({
      agentId,
      logsDir,
      logFiles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
