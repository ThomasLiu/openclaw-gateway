/**
 * Enumerate effective skill directories for an agent export.
 *
 * Follows the OpenClaw skill loading layer order:
 * 1. openclaw-extra    — bundled skill entries from the openclaw installation
 * 2. openclaw-bundled  — openclaw bundled skills (OPENCLAW_BUNDLED_SKILLS_DIR)
 * 3. openclaw-managed  — openclaw managed skills
 * 4. agents-skills-personal — ~/.agents/skills/<name>/
 * 5. agents-skills-project  — <workspace>/.agents/skills/<name>/
 * 6. openclaw-workspace     — <workspace>/skills/<name>/
 *
 * If the agent's skills whitelist is empty (`[]`), no skills are exported.
 * If the whitelist is absent (undefined), ALL found skills are exported.
 * Otherwise, only skills whose name is in the whitelist are exported.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type SkillSource =
  | 'openclaw-extra'
  | 'openclaw-bundled'
  | 'openclaw-managed'
  | 'agents-skills-personal'
  | 'agents-skills-project'
  | 'openclaw-workspace';

export interface EffectiveSkillDir {
  name: string;
  source: SkillSource;
  absPath: string;
}

/** Skill entries from openclaw's internal skill registry (openclaw-extra) */
interface SkillEntry {
  name: string;
  dir: string;
}

function readDirEntries(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function skillDirsFromRoot(root: string, source: SkillSource): EffectiveSkillDir[] {
  const results: EffectiveSkillDir[] = [];
  const entries = readDirEntries(root);
  for (const name of entries) {
    const absPath = path.join(root, name);
    try {
      if (fs.statSync(absPath).isDirectory()) {
        results.push({ name, source, absPath });
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  return results;
}

function findSkillEntries(rootDir: string): SkillEntry[] {
  // This mirrors the OpenClaw internal skill loading for "openclaw-extra"
  // which loads from openclaw's bundled skills directory
  const entries: SkillEntry[] = [];
  try {
    const skillDirs = readDirEntries(rootDir);
    for (const name of skillDirs) {
      const absPath = path.join(rootDir, name);
      try {
        if (fs.statSync(absPath).isDirectory()) {
          entries.push({ name, dir: absPath });
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // rootDir may not exist
  }
  return entries;
}

/**
 * Enumerate all effective skill directories for an agent, in layer order.
 * Respects the agent's `skills` whitelist.
 */
export function enumerateEffectiveSkillDirsForExport(params: {
  agentSkills?: string[]; // undefined = all, [] = none, strings = named whitelist
  bundledSkillsDir?: string; // OPENCLAW_BUNDLED_SKILLS_DIR
  managedSkillsDir?: string; // OPENCLAW_MANAGED_SKILLS_DIR
  workspaceDir: string;
  agentId: string;
}): EffectiveSkillDir[] {
  const {
    agentSkills,
    bundledSkillsDir,
    managedSkillsDir,
    workspaceDir,
  } = params;

  // Empty whitelist means "export no skills"
  if (Array.isArray(agentSkills) && agentSkills.length === 0) {
    return [];
  }

  const home = os.homedir();
  const personalSkillsRoot = path.join(home, '.agents', 'skills');
  const projectSkillsRoot = path.join(workspaceDir, '.agents', 'skills');
  const wsSkillsRoot = path.join(workspaceDir, 'skills');

  // Collect all skills across layers
  const seen = new Map<string, { source: SkillSource; absPath: string }>();

  const addSkills = (skills: EffectiveSkillDir[]) => {
    for (const s of skills) {
      if (!seen.has(s.name)) {
        seen.set(s.name, { source: s.source, absPath: s.absPath });
      }
    }
  };

  // Layer 1: openclaw-extra — use bundledSkillsDir if provided
  if (bundledSkillsDir) {
    const extras = skillDirsFromRoot(bundledSkillsDir, 'openclaw-bundled');
    addSkills(extras);
  }

  // Layer 2: openclaw-managed
  if (managedSkillsDir) {
    const managed = skillDirsFromRoot(managedSkillsDir, 'openclaw-managed');
    addSkills(managed);
  }

  // Layer 3: agents-skills-personal (~/.agents/skills/)
  const personal = skillDirsFromRoot(personalSkillsRoot, 'agents-skills-personal');
  addSkills(personal);

  // Layer 4: agents-skills-project (<workspace>/.agents/skills/)
  const project = skillDirsFromRoot(projectSkillsRoot, 'agents-skills-project');
  addSkills(project);

  // Layer 5: openclaw-workspace (<workspace>/skills/)
  const ws = skillDirsFromRoot(wsSkillsRoot, 'openclaw-workspace');
  addSkills(ws);

  // Filter by whitelist if provided
  const results: EffectiveSkillDir[] = [];
  for (const [name, { source, absPath }] of seen) {
    if (agentSkills === undefined || agentSkills.includes(name)) {
      results.push({ name, source, absPath });
    }
  }

  return results;
}

/**
 * List skill entries from the OpenClaw internal bundled skills directory.
 * Used to populate the openclaw-extra layer.
 */
export function listOpenClawExtraSkillEntries(
  bundledSkillsDir: string
): SkillEntry[] {
  return findSkillEntries(bundledSkillsDir);
}
