import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';

// Stub: full implementation uses archiver/jszip to create actual zip
// Currently returns a minimal zip for API contract verification
async function buildAgentExportZip(
  agentId: string,
  _configJson: Record<string, unknown>
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `openclaw-export-${Date.now()}-`));
  const zipFile = path.join(tmpDir, `agent-export-${agentId}.zip`);
  const manifest = {
    formatVersion: '1.0',
    agentId,
    exportedAt: new Date().toISOString(),
    workspaceStrategy: 'exclude-skills-subfolder',
    exportedSkills: [] as string[],
    pluginPackagedSkillsIncluded: false,
  };
  // Write minimal manifest as a placeholder (full implementation uses archiver)
  fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return zipFile;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId: rawAgentId } = await params;
  const agentId = rawAgentId ? decodeURIComponent(rawAgentId) : '';

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  try {
    // Find openclaw.json
    const configPath =
      process.env.OPENCLAW_CONFIG_PATH ?? path.join(os.homedir(), '.openclaw', 'openclaw.json');

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: 'openclaw.json not found' }, { status: 404 });
    }

    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const configJson = JSON.parse(rawConfig);

    // Verify agent exists
    const agents = (configJson.agents?.list ?? []) as Array<{ id: string }>;
    if (!agents.some((a) => a.id === agentId)) {
      return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
    }

    // Build zip
    const zipPath = await buildAgentExportZip(agentId, configJson);
    const zipBuffer = fs.readFileSync(zipPath);

    // Clean up temp
    fs.rmSync(path.dirname(zipPath), { recursive: true, force: true });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="openclaw-agent-${agentId}-export.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
