/**
 * Slash command registry and trigger/parse logic.
 *
 * Supports:
 *  - /command → command menu
 *  - @skill → skill autocomplete
 *  - /skill name → skill name autocomplete
 */
export interface SlashCommandEntry {
  name: string;
  description: string;
  insertText: string;
  argOptions?: Array<{ name: string; description: string; choices?: string[] }>;
  builtinSingleArgSlashLineWide?: boolean;
}

const BUILTIN_COMMANDS: SlashCommandEntry[] = [
  {
    name: "/think",
    description: "开启/关闭思维日志展示",
    insertText: "/think",
    argOptions: [{ name: "level", description: "思维详细程度", choices: ["brief", "verbose"] }],
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: "/focus",
    description: "切换到指定会话",
    insertText: "/focus",
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: "/kill",
    description: "中止当前运行中的会话",
    insertText: "/kill",
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: "/steer",
    description: "调整当前会话的模型或行为",
    insertText: "/steer",
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: "/model",
    description: "切换模型",
    insertText: "/model",
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: "/skill",
    description: "激活技能",
    insertText: "/skill ",
  },
  {
    name: "/tools",
    description: "显示/隐藏工具调用详情",
    insertText: "/tools",
    argOptions: [{ name: "mode", description: "工具展示模式", choices: ["compact", "verbose", "none"] }],
  },
];

export function getBuiltinCommands(): SlashCommandEntry[] {
  return BUILTIN_COMMANDS;
}

export interface ComposerMenuState {
  type: "slash" | "skill" | null;
  query: string;
  insertKind: "line" | "token";
  items: SlashCommandEntry[];
}

/**
 * Parse composer text to detect slash or @ trigger.
 *
 * Trigger: (?:^|\s)(/\S*)$  → slash command
 * Trigger: (?:^|\s)(@\S*)$  → skill
 *
 * Returns null if no active menu.
 */
export function parseSlashTrigger(
  text: string,
  caret: number
): ComposerMenuState | null {
  const before = text.slice(0, caret);

  // Slash command: match last /word before caret
  const slashMatch = before.match(/(?:^|\s)(\/\S*)$/);
  if (slashMatch) {
    const query = slashMatch[1].slice(1); // remove leading /
    const filtered = filterCommands(query);
    if (filtered.length === 0 && query.length > 0) return null;
    return {
      type: "slash",
      query,
      insertKind: query.includes(" ") ? "token" : "line",
      items: filtered,
    };
  }

  // @ skill: match last @word before caret
  const atMatch = before.match(/(?:^|\s)(@\S*)$/);
  if (atMatch) {
    const query = atMatch[1].slice(1); // remove @
    return {
      type: "skill",
      query,
      insertKind: "token",
      items: [], // populated dynamically from skills.status API
    };
  }

  return null;
}

function filterCommands(query: string): SlashCommandEntry[] {
  if (!query) return BUILTIN_COMMANDS;
  const lc = query.toLowerCase();
  return BUILTIN_COMMANDS.filter((c) => c.name.toLowerCase().includes(lc));
}

export type SlashInsertKind = "line" | "token";

export function computeComposerMenuState(
  text: string,
  caret: number,
  _dynamicCtx?: { agents?: Array<{ id: string }>; models?: string[] }
): ComposerMenuState | null {
  return parseSlashTrigger(text, caret);
}
