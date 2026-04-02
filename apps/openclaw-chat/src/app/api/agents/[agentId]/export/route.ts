import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import JSZip from 'jszip';

import { loadOpenClawJsonObject } from '@/lib/agent-export/load-openclaw-json';
import { redactSecretsForExport } from '@/lib/agent-export/redact-secrets-for-export';
import {
  enumerateEffectiveSkillDirsForExport,
} from '@/lib/agent-export/enumerate-effective-skills-for-export';
import { resolveAgentWorkspaceDir } from '@/lib/openclaw/workspace-path';

export const runtime = 'nodejs';

interface AgentListEntry {
  id: string;
  label?: string;
  name?: string;
  model?: Record<string, unknown>;
  skills?: string[];
  [key: string]: unknown;
}

interface OpenClawJsonAgents {
  list?: AgentListEntry[];
  defaults?: Record<string, unknown>;
}

/** Recursively add a directory to a JSZip instance */
async function addDirToZip(
  zip: JSZip,
  dirPath: string,
  zipPrefix: string,
  excludeDirs: string[] = []
): Promise<void> {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const absPath = path.join(dirPath, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await addDirToZip(zip, absPath, zipPath, excludeDirs);
    } else {
      const content = fs.readFileSync(absPath);
      zip.file(zipPath, content);
    }
  }
}

/** Copy a single file to zip (or skip if it doesn't exist) */
function addFileToZipIfExists(zip: JSZip, absPath: string, zipPath: string): void {
  if (fs.existsSync(absPath)) {
    zip.file(zipPath, fs.readFileSync(absPath));
  }
}

/** Extract a sub-slice from a config object */
function extractSlice(
  obj: Record<string, unknown> | undefined,
  keys: string[]
): Record<string, unknown> {
  if (!obj) return {};
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId: rawAgentId } = await params;
  const agentId = rawAgentId ? decodeURIComponent(rawAgentId) : '';

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  try {
    const config = loadOpenClawJsonObject();
    const agentsList = (config.agents as OpenClawJsonAgents | undefined)?.list ?? [];
    const agentEntry = agentsList.find((a) => a.id === agentId);

    // Fall back to a synthetic "main" agent entry if not found in config
    const effectiveAgent: AgentListEntry = agentEntry ?? ({ id: agentId } as AgentListEntry);

    // --- Build redacted config slices ---
    const { redacted: redactedAgent, secrets: agentSecrets } = redactSecretsForExport(
      effectiveAgent
    );
    const { redacted: redactedDefaults, secrets: defaultsSecrets } = redactSecretsForExport(
      (config.agents as OpenClawJsonAgents | undefined)?.defaults ?? {}
    );
    const { redacted: redactedBindings, secrets: bindingsSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['bindings']) as Record<string, unknown>
    );
    const { redacted: redactedHooks, secrets: hooksSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['hooks', 'mappings']) as Record<string, unknown>
    );
    const { redacted: redactedMcp, secrets: mcpSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['mcp']) as Record<string, unknown>
    );
    const { redacted: redactedSkills, secrets: skillsSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['skills']) as Record<string, unknown>
    );
    const { redacted: redactedTools, secrets: toolsSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['tools']) as Record<string, unknown>
    );
    const { redacted: redactedModels, secrets: modelsSecrets } = redactSecretsForExport(
      extractSlice(config as Record<string, unknown>, ['models']) as Record<string, unknown>
    );

    const allSecrets = [
      ...agentSecrets,
      ...defaultsSecrets,
      ...bindingsSecrets,
      ...hooksSecrets,
      ...mcpSecrets,
      ...skillsSecrets,
      ...toolsSecrets,
      ...modelsSecrets,
    ];

    // --- Enumerate skill directories ---
    const workspaceDir = resolveAgentWorkspaceDir(agentId);
    const bundledSkillsDir =
      process.env.OPENCLAW_BUNDLED_SKILLS_DIR ??
      path.join(os.homedir(), '.openclaw', 'skills', 'bundled');
    const managedSkillsDir = path.join(os.homedir(), '.openclaw', 'skills', 'managed');

    const skills = enumerateEffectiveSkillDirsForExport({
      agentSkills: effectiveAgent.skills,
      bundledSkillsDir,
      managedSkillsDir,
      workspaceDir,
      agentId,
    });

    // --- Build zip ---
    const zip = new JSZip();

    // manifest.json
    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          formatVersion: '1.0',
          agentId,
          exportedAt: new Date().toISOString(),
          workspaceStrategy: 'exclude-skills-subfolder',
          exportedSkills: skills.map((s) => ({ name: s.name, source: s.source })),
          pluginPackagedSkillsIncluded: false,
        },
        null,
        2
      )
    );

    // secrets-required.json
    zip.file('secrets-required.json', JSON.stringify(allSecrets, null, 2));

    // config/ directory slices
    zip.file('config/agent-list-entry.json', JSON.stringify(redactedAgent, null, 2));
    zip.file('config/agents-defaults.json', JSON.stringify(redactedDefaults, null, 2));
    zip.file('config/bindings.json', JSON.stringify(redactedBindings, null, 2));
    zip.file('config/hooks-mappings.json', JSON.stringify(redactedHooks, null, 2));
    zip.file('config/mcp.json', JSON.stringify(redactedMcp, null, 2));
    zip.file('config/skills-root.json', JSON.stringify(redactedSkills, null, 2));
    zip.file('config/tools-root.json', JSON.stringify(redactedTools, null, 2));
    zip.file('config/models.json', JSON.stringify(redactedModels, null, 2));

    // workspace/ (excluding skills/ subdirectory)
    if (fs.existsSync(workspaceDir)) {
      await addDirToZip(zip, workspaceDir, 'workspace', ['skills']);
    }

    // skills/<name>/ directories
    for (const skill of skills) {
      await addDirToZip(zip, skill.absPath, `skills/${skill.name}`);
    }

    // agent-dir/
    const agentDir = path.join(os.homedir(), '.openclaw', 'agents', agentId);
    if (fs.existsSync(agentDir)) {
      await addDirToZip(zip, agentDir, 'agent-dir');
    }

    // import.mjs template (copy from lib)
    // process.cwd() is the Next.js project root (apps/openclaw-chat/)
    const libAgentExport = path.join(process.cwd(), 'src', 'lib', 'agent-export');
    const importScriptPath = path.join(libAgentExport, 'import-script.mjs');
    addFileToZipIfExists(zip, importScriptPath, 'import.mjs');

    // import.sh wrapper
    const importShContent = `#!/usr/bin/env bash
# Wrapper script — delegates to import.mjs
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/import.mjs" "$@"
`;
    zip.file('import.sh', importShContent);

    // docs/
    const docsDir = path.join(libAgentExport, 'docs');
    if (fs.existsSync(docsDir)) {
      await addDirToZip(zip, docsDir, 'docs');
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="openclaw-agent-${agentId}-export.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Return 404 if config not found
    if (message.includes('not found') || message.includes('ENOENT')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
