import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';

interface WorkspaceTreeNode {
  name: string;
  relPath: string;
  type: 'file' | 'dir';
  size?: number;
  children?: WorkspaceTreeNode[];
}

function listDir(
  dir: string,
  rel: string,
  maxDepth: number,
  currentDepth: number,
  skipDirs: Set<string>
): WorkspaceTreeNode[] {
  if (currentDepth >= maxDepth) return [];

  const SKIP_NAMES = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__']);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => !SKIP_NAMES.has(e.name) && !e.name.startsWith('.'))
    .slice(0, 500) // cap per directory
    .map((entry) => {
      const entryPath = path.join(dir, entry.name);
      const entryRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        const children = listDir(entryPath, entryRel, maxDepth, currentDepth + 1, skipDirs);
        return { name: entry.name, relPath: entryRel, type: 'dir' as const, children };
      }
      const size = (() => {
        try {
          return fs.statSync(entryPath).size;
        } catch {
          return undefined;
        }
      })();
      return { name: entry.name, relPath: entryRel, type: 'file' as const, size };
    });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const { searchParams } = req.nextUrl;
  const maxDepth = Math.min(20, Math.max(1, Number(searchParams.get('maxDepth') ?? '10')));

  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), '.openclaw', 'agents');
  const workspaceDir = path.join(stateDir, decodeURIComponent(agentId), 'workspace');

  try {
    const nodes = listDir(workspaceDir, '.', maxDepth, 0, new Set());
    return NextResponse.json({ workspaceDir, agentId, tree: nodes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
