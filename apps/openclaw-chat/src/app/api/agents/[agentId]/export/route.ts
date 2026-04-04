/**
 * GET /api/agents/[agentId]/export
 * 导出 Agent 配置与文件为 ZIP
 *
 * 返回：application/zip
 * Content-Disposition: attachment; filename="openclaw-agent-<id>-export.zip"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import path from "node:path";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import { Readable } from "node:stream";
import os from "node:os";
import { readOpenClawJson } from "@/lib/openclaw/config";
import { resolveAgentWorkspaceDir, resolveAgentDir } from "@/lib/openclaw/workspace-path";
import { redactWithSecretsList } from "@/lib/openclaw/agent-export/redact-secrets-for-export";
import { mergeObjectArraysById } from "@/lib/openclaw/agent-export/merge-object-arrays-by-id";
import { listEffectiveSkillDirsForExport } from "@/lib/openclaw/agent-export/enumerate-effective-skills-for-export";

/** 读取配置（已脱敏） */
async function loadAgentConfig(agentId: string): Promise<{
  agentEntry: Record<string, unknown>;
  fullConfig: Record<string, unknown>;
  secrets: Array<{ id: string; jsonPath: string; label: string; kind: string; required: boolean }>;
}> {
  const config = readOpenClawJson();
  if (!config) {
    throw new Error("Cannot read openclaw.json configuration");
  }

  const agentsList = (config.agents as { list?: Array<Record<string, unknown>> } | undefined)?.list ?? [];
  const agentEntry = agentsList.find((a) => {
    const id = (a.id as string | undefined)?.trim().toLowerCase();
    return id === agentId.trim().toLowerCase();
  });

  if (!agentEntry) {
    throw new Error(`Agent '${agentId}' not found in configuration`);
  }

  // 脱敏完整配置
  const { redacted, secrets } = redactWithSecretsList(config);

  return {
    agentEntry: redactWithSecretsList(agentEntry).redacted as Record<string, unknown>,
    fullConfig: redacted as Record<string, unknown>,
    secrets,
  };
}

/** 递归添加目录到 ZIP */
async function addDirToZip(
  archive: archiver.Archiver,
  sourceDir: string,
  zipBasePath: string
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return; // 目录不存在
  }

  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const zipPath = path.join(zipBasePath, entry.name);

    if (entry.isDirectory()) {
      // 跳过特定目录
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".next"
      ) {
        continue;
      }
      archive.directory(srcPath, zipPath);
    } else if (entry.isFile()) {
      try {
        const stat = await fs.stat(srcPath);
        if (stat.size > 5 * 1024 * 1024) continue; // 跳过 > 5MB 文件
        archive.file(srcPath, { name: zipPath });
      } catch {
        // 忽略
      }
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<Response> {
  try {
    const { agentId } = await params;
    const decodedAgentId = decodeURIComponent(agentId);
    const normalizedId = decodedAgentId.trim().toLowerCase();

    // 加载并脱敏配置
    let agentConfig: Record<string, unknown>;
    let fullConfig: Record<string, unknown>;
    let secrets: Array<{ id: string; jsonPath: string; label: string; kind: string; required: boolean }>;
    try {
      ({ agentEntry: agentConfig, fullConfig, secrets } = await loadAgentConfig(normalizedId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    // 解析路径
    const workspaceDir = await resolveAgentWorkspaceDir(normalizedId);
    const agentDir = await resolveAgentDir(normalizedId);

    // 收集技能目录
    const skillDirs = await listEffectiveSkillDirsForExport(
      { skills: agentConfig.skills as string[] | null | undefined },
      workspaceDir
    );

    // 构建 manifest.json
    const manifest = {
      formatVersion: "1.0.0",
      agentId: normalizedId,
      exportedAt: new Date().toISOString(),
      workspaceStrategy: "exclude-skills-subfolder",
      exportedSkills: Object.fromEntries(
        skillDirs.map((s) => [s.name, s.source])
      ),
      pluginPackagedSkillsIncluded: false,
    };

    // 构建 secrets-required.json
    const secretsRequired = secrets.map((s) => ({
      id: s.id,
      jsonPath: s.jsonPath,
      label: s.label,
      kind: s.kind,
      required: s.required,
    }));

    // 提取该 agent 的配置切片
    const agentsDefaults = (fullConfig.agents as { defaults?: Record<string, unknown> } | undefined)?.defaults ?? {};
    const bindings = (fullConfig.bindings as Array<Record<string, unknown>> | undefined)?.filter(
      (b) => {
        const aid = (b.agentId as string | undefined)?.trim().toLowerCase();
        return aid === normalizedId;
      }
    ) ?? [];
    const hooksMappings = (fullConfig.hooks as { mappings?: Array<Record<string, unknown>> } | undefined)?.mappings?.filter(
      (h) => {
        const aid = (h.agentId as string | undefined)?.trim().toLowerCase();
        return aid === normalizedId;
      }
    ) ?? [];

    // 创建 ZIP
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", (err) => {
      throw err;
    });

    // manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    // secrets-required.json
    archive.append(JSON.stringify(secretsRequired, null, 2), { name: "secrets-required.json" });

    // config/agent-list-entry.json
    archive.append(
      JSON.stringify(agentConfig, null, 2),
      { name: "config/agent-list-entry.json" }
    );

    // config/agents-defaults.json
    archive.append(
      JSON.stringify(agentsDefaults, null, 2),
      { name: "config/agents-defaults.json" }
    );

    // config/bindings.json
    archive.append(
      JSON.stringify(bindings, null, 2),
      { name: "config/bindings.json" }
    );

    // config/hooks-mappings.json
    archive.append(
      JSON.stringify(hooksMappings, null, 2),
      { name: "config/hooks-mappings.json" }
    );

    // config/mcp.json（全量，已脱敏）
    if (fullConfig.mcp) {
      archive.append(
        JSON.stringify(fullConfig.mcp, null, 2),
        { name: "config/mcp.json" }
      );
    }

    // config/skills-root.json
    if (fullConfig.skills) {
      archive.append(
        JSON.stringify(fullConfig.skills, null, 2),
        { name: "config/skills-root.json" }
      );
    }

    // config/tools-root.json
    if (fullConfig.tools) {
      archive.append(
        JSON.stringify(fullConfig.tools, null, 2),
        { name: "config/tools-root.json" }
      );
    }

    // config/models.json
    if (fullConfig.models) {
      archive.append(
        JSON.stringify(fullConfig.models, null, 2),
        { name: "config/models.json" }
      );
    }

    // workspace/ 目录（除 skills/）
    await addDirToZip(archive, workspaceDir, "workspace");

    // skills/<name>/（白名单过滤后的 workspace 技能）
    for (const skill of skillDirs) {
      if (skill.source === "openclaw-workspace" || skill.source === "agents-skills-project") {
        await addDirToZip(archive, skill.dirPath, `skills/${skill.name}`);
      }
    }

    // agent-dir/ 目录
    await addDirToZip(archive, agentDir, "agent-dir");

    // docs/ 说明文档
    const docsContent = `# OpenClaw Agent Export

## 导入说明

此 ZIP 包包含 Agent "${normalizedId}" 的配置和文件。

### 包含内容

- \`manifest.json\` — 导出元数据
- \`secrets-required.json\` — 需要填写的密钥（已用占位符替换）
- \`config/\` — Agent 配置切片
- \`workspace/\` — Agent 工作区文件
- \`skills/\` — Agent 技能目录
- \`agent-dir/\` — Agent 私有目录

### 导入方式

\`\`\`bash
node import.mjs --force --secrets-file secrets.json
\`\`\`

或使用 \`./import.sh\` 交互式导入。

### 密钥说明

运行 \`import.mjs\` 时，需要提供 \`secrets-required.json\` 中列出的密钥值。

\`\`\`json
[
  { "id": "secret-0001", "value": "your-api-key-here" }
]
\`\`\`
`;
    archive.append(docsContent, { name: "docs/IMPORT.md" });

    archive.finalize();

    // 等待 archive 完成
    await new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    const zipBuffer = Buffer.concat(chunks);

    const safeId = normalizedId.replace(/[^a-zA-Z0-9_-]/g, "-");
    const filename = `openclaw-agent-${safeId}-export.zip`;

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
