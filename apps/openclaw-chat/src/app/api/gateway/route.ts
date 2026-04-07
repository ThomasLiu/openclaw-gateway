import { NextRequest, NextResponse } from "next/server";
import {
  listAgents,
  getAgentMetadata,
  listSessions,
  readSessionMessages,
  readOpenClawConfig,
  listSkills,
  getOpenClawVersion,
  readLogFile,
  getCronStore,
  listWorkspaceFiles,
  readAgentMdFile,
  AGENT_MD_FILES,
} from "@/lib/data/fs-reader";

export async function GET(request: NextRequest) {
  const u = new URL(request.url);
  const segments = u.pathname.replace("/api/gateway", "").split("/").filter(Boolean);
  const action = segments[0] || "";

  try {
    switch (action) {
      case "health": {
        try {
          const version = await getOpenClawVersion();
          return NextResponse.json({ ok: true, status: "live", version });
        } catch {
          return NextResponse.json({ ok: true, status: "live" });
        }
      }
      case "agents": {
        const agentIds = await listAgents();
        const agents = [];
        for (const id of agentIds) {
          const meta = await getAgentMetadata(id).catch(() => null);
          if (meta) agents.push(meta);
        }
        return NextResponse.json({ success: true, data: agents });
      }
      case "sessions": {
        const agentId = u.searchParams.get("agentId");
        if (!agentId) return NextResponse.json({ success: false, error: "agentId required" }, { status: 400 });
        const sessions = await listSessions(agentId);
        return NextResponse.json({ success: true, data: sessions });
      }
      case "messages": {
        const sessionPath = u.searchParams.get("sessionPath");
        const offset = parseInt(u.searchParams.get("offset") || "0", 10);
        const limit = parseInt(u.searchParams.get("limit") || "200", 10);
        if (!sessionPath) return NextResponse.json({ success: false, error: "sessionPath required" }, { status: 400 });
        const messages = await readSessionMessages(sessionPath, offset, limit);
        return NextResponse.json({ success: true, data: messages });
      }
      case "config": {
        const config = await readOpenClawConfig();
        return NextResponse.json({ success: true, data: config });
      }
      case "skills": {
        const skills = await listSkills();
        return NextResponse.json({ success: true, data: skills });
      }
      case "logs": {
        const date = u.searchParams.get("date") || undefined;
        const logs = await readLogFile(date);
        return NextResponse.json({ success: true, data: logs });
      }
      case "cron": {
        const cronStore = await getCronStore();
        return NextResponse.json({ success: true, data: cronStore });
      }
      case "workspace": {
        const agentId = u.searchParams.get("agentId");
        if (!agentId) return NextResponse.json({ success: false, error: "agentId required" }, { status: 400 });
        const relativePath = u.searchParams.get("path") || undefined;
        const files = await listWorkspaceFiles(agentId, relativePath);
        return NextResponse.json({ success: true, data: files });
      }
      case "version": {
        const version = await getOpenClawVersion();
        return NextResponse.json({ success: true, data: { version } });
      }
      case "agent-md": {
        const agentId = u.searchParams.get("agentId");
        const filename = u.searchParams.get("file") as typeof AGENT_MD_FILES[number] | null;
        if (!agentId || !filename) return NextResponse.json({ success: false, error: "agentId and file required" }, { status: 400 });
        const content = await readAgentMdFile(agentId, filename);
        return NextResponse.json({ success: true, data: { filename, content } });
      }
      default:
        return NextResponse.json({ success: false, error: "not found" }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const u = new URL(request.url);
  const segments = u.pathname.replace("/api/gateway", "").split("/").filter(Boolean);
  const action = segments[0] || "";

  try {
    const body = await request.json().catch(() => ({}));
    switch (action) {
      case "send": {
        const { agentId, message, sessionId } = body;
        if (!agentId || !message) return NextResponse.json({ success: false, error: "agentId and message required" }, { status: 400 });
        return NextResponse.json({ success: true, data: { agentId, message: message.substring(0, 50), sessionId, status: "sent" } });
      }
      default:
        return NextResponse.json({ success: false, error: "not found" }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
