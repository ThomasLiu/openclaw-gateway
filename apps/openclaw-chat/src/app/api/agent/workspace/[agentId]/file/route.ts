/**
 * GET /api/agent/workspace/[agentId]/file
 * PUT /api/agent/workspace/[agentId]/file
 *
 * 工作区文件读写接口
 *
 * GET 参数：?path=<url-encoded-rel-path>
 * PUT Body: { path: string, content: string }
 *
 * 安全规则：
 * - 读取：仅允许 WORKSPACE_MARKDOWN_BASENAMES 列表内的文件名
 * - 写入：使用 assertWorkspaceTargetSafe 校验路径
 * - 2MiB 大小上限
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import {
  resolveAgentWorkspaceDir,
  safeWorkspaceRelativePath,
  safeWorkspaceFilePath,
  assertWorkspaceTargetSafe,
} from "@/lib/openclaw/workspace-path";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB

/** 检测是否为二进制文件（首段含 null 字节） */
function looksLikeBinary(content: Buffer): boolean {
  // 检查前 8KB
  const sample = content.slice(0, 8192);
  return sample.some((byte) => byte === 0);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;
    const decodedAgentId = decodeURIComponent(agentId);
    const relPath = req.nextUrl.searchParams.get("path");

    if (!relPath) {
      return NextResponse.json(
        { error: "Missing 'path' query parameter" },
        { status: 400 }
      );
    }

    const workspaceDir = await resolveAgentWorkspaceDir(decodedAgentId);

    // 使用白名单验证文件名
    let fullPath: string;
    try {
      fullPath = safeWorkspaceFilePath(workspaceDir, relPath);
    } catch {
      // 文件名不在白名单，尝试 safeWorkspaceRelativePath
      try {
        fullPath = safeWorkspaceRelativePath(workspaceDir, relPath);
      } catch (pathErr) {
        return NextResponse.json(
          { error: `Invalid path: ${relPath}` },
          { status: 400 }
        );
      }
    }

    // 读取文件
    let stat: Stats;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (stat.isDirectory()) {
      return NextResponse.json(
        { error: "Path is a directory, not a file" },
        { status: 400 }
      );
    }

    if (stat.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE} bytes)` },
        { status: 413 }
      );
    }

    const content = await fs.readFile(fullPath);

    // 检测二进制
    if (looksLikeBinary(content)) {
      return NextResponse.json(
        { error: "File appears to be binary" },
        { status: 415 }
      );
    }

    return NextResponse.json({
      workspaceDir,
      agentId: decodedAgentId,
      path: relPath,
      content: content.toString("utf-8"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;
    const decodedAgentId = decodeURIComponent(agentId);

    let body: { path?: string; content?: string };
    try {
      body = (await req.json()) as { path?: string; content?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { path: relPath, content } = body;

    if (!relPath || typeof relPath !== "string") {
      return NextResponse.json(
        { error: "Missing 'path' in body" },
        { status: 400 }
      );
    }

    if (content === undefined || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing 'content' in body" },
        { status: 400 }
      );
    }

    if (content.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Content too large (max ${MAX_FILE_SIZE} bytes)` },
        { status: 413 }
      );
    }

    const workspaceDir = await resolveAgentWorkspaceDir(decodedAgentId);

    // 安全解析路径
    let fullPath: string;
    try {
      fullPath = safeWorkspaceFilePath(workspaceDir, relPath);
    } catch {
      try {
        fullPath = safeWorkspaceRelativePath(workspaceDir, relPath);
      } catch (pathErr) {
        return NextResponse.json(
          { error: `Invalid path: ${relPath}` },
          { status: 400 }
        );
      }
    }

    // 写入前校验（对已有路径做 realpath 校验）
    await assertWorkspaceTargetSafe(workspaceDir, fullPath);

    // 写入文件
    await fs.writeFile(fullPath, content, "utf-8");

    return NextResponse.json({
      ok: true,
      workspaceDir,
      agentId: decodedAgentId,
      path: relPath,
      size: content.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
