import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB

function safeWorkspaceFilePath(workspaceDir: string, fileName: string): string {
  // Only allow safe basenames (no path traversal)
  const safe = path.basename(fileName);
  if (safe !== fileName || safe.includes("..")) {
    throw new Error("Unsafe path");
  }
  return path.join(workspaceDir, safe);
}

function assertWorkspaceTargetSafe(workspaceDir: string, target: string): void {
  const resolved = path.resolve(workspaceDir, target);
  if (!resolved.startsWith(path.resolve(workspaceDir))) {
    throw new Error("Path escape attempt detected");
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { searchParams } = req.nextUrl;
  const filePath = searchParams.get("path");

  if (!filePath) return NextResponse.json({ error: "path required" }, { status: 400 });

  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "agents");
  const workspaceDir = path.join(stateDir, decodeURIComponent(agentId), "workspace");

  try {
    const safePath = safeWorkspaceFilePath(workspaceDir, filePath);
    assertWorkspaceTargetSafe(workspaceDir, safePath);

    const stat = fs.statSync(safePath);
    if (stat.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // Binary detection: check first 512 bytes for null bytes
    const fd = fs.openSync(safePath, "r");
    const buf = Buffer.alloc(512);
    fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);

    if (buf.includes(0)) {
      return NextResponse.json({ error: "Binary file not supported" }, { status: 415 });
    }

    const content = fs.readFileSync(safePath, "utf-8");
    return NextResponse.json({ workspaceDir, agentId, path: filePath, content });
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.path !== "string" || typeof body.content !== "string") {
    return NextResponse.json({ error: "Invalid JSON: { path, content } required" }, { status: 400 });
  }

  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "agents");
  const workspaceDir = path.join(stateDir, decodeURIComponent(agentId), "workspace");

  try {
    const safePath = safeWorkspaceFilePath(workspaceDir, body.path);
    assertWorkspaceTargetSafe(workspaceDir, safePath);

    if (body.content.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Content too large" }, { status: 413 });
    }

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, body.content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
