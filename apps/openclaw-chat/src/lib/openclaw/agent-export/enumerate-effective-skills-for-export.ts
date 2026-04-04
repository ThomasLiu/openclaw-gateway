/**
 * enumerate-effective-skills-for-export.ts
 * 技能目录枚举工具
 *
 * 按上游层合并顺序枚举技能目录：
 * extra → bundled → managed → ~/.agents/skills →
 * <workspace>/.agents/skills → <workspace>/skills
 *
 * 按 agents.list[].skills 白名单过滤
 */

import "server-only";

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";

export type SkillSource =
  | "openclaw-extra"
  | "openclaw-bundled"
  | "openclaw-managed"
  | "agents-skills-personal"
  | "agents-skills-project"
  | "openclaw-workspace";

export interface EffectiveSkillDir {
  /** 技能目录完整路径 */
  dirPath: string;
  /** 技能名称（目录名） */
  name: string;
  /** 技能来源 */
  source: SkillSource;
}

export interface AgentSkillConfig {
  /** 技能白名单（省略=全部，空数组=不导出任何） */
  skills?: string[] | null;
}

/**
 * 枚举有效的技能目录
 *
 * @param agentConfig agent 配置（用于 skills 白名单过滤）
 * @param workspaceDir agent 的 workspace 目录
 */
export async function listEffectiveSkillDirsForExport(
  agentConfig: AgentSkillConfig,
  workspaceDir: string
): Promise<EffectiveSkillDir[]> {
  const skillFilter = agentConfig.skills;

  // 空数组 = 不导出任何技能
  if (Array.isArray(skillFilter) && skillFilter.length === 0) {
    return [];
  }

  const home = os.homedir();
  const bundledSkillsDir = process.env.OPENCLAW_BUNDLED_SKILLS_DIR ?? "";

  const skillDirs: EffectiveSkillDir[] = [];

  // 按层顺序检查每个可能的技能目录
  const candidates: Array<{ dir: string; source: SkillSource }> = [
    // extra skills (~/.openclaw/skills/extra)
    { dir: path.join(home, ".openclaw", "skills", "extra"), source: "openclaw-extra" },
    // bundled skills (OPENCLAW_BUNDLED_SKILLS_DIR or ~/.openclaw/skills/bundled)
    {
      dir: bundledSkillsDir || path.join(home, ".openclaw", "skills", "bundled"),
      source: "openclaw-bundled",
    },
    // managed skills (~/.openclaw/skills/managed)
    { dir: path.join(home, ".openclaw", "skills", "managed"), source: "openclaw-managed" },
    // personal skills (~/.agents/skills)
    { dir: path.join(home, ".agents", "skills"), source: "agents-skills-personal" },
    // project skills (<workspace>/.agents/skills)
    { dir: path.join(workspaceDir, ".agents", "skills"), source: "agents-skills-project" },
    // workspace skills (<workspace>/skills)
    { dir: path.join(workspaceDir, "skills"), source: "openclaw-workspace" },
  ];

  for (const { dir, source } of candidates) {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue; // 目录不存在或无权限
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;

      // 白名单过滤（省略=全部）
      if (Array.isArray(skillFilter) && !skillFilter.includes(skillName)) {
        continue;
      }

      skillDirs.push({
        dirPath: path.join(dir, skillName),
        name: skillName,
        source,
      });
    }
  }

  return skillDirs;
}
