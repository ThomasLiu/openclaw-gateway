/**
 * Slash command registry and trigger/parse logic.
 *
 * Supports:
 *  - /command → command menu
 *  - @skill → skill autocomplete
 *  - /skill name → skill name autocomplete
 *  - Dynamic first-param: /focus, /kill, /steer, /model merge session/model data from API
 */
export interface SlashCommandEntry {
  name: string;
  description: string;
  insertText: string;
  argOptions?: Array<{ name: string; description: string; choices?: string[] }>;
  /** If true, single-arg commands use insertKind: line (full line replace) */
  builtinSingleArgSlashLineWide?: boolean;
  /** Commands that need dynamic first-param from API */
  needsDynamicFirstArg?: boolean;
}

const BUILTIN_COMMANDS: SlashCommandEntry[] = [
  {
    name: '/think',
    description: '开启/关闭思维日志展示',
    insertText: '/think',
    argOptions: [{ name: 'level', description: '思维详细程度', choices: ['brief', 'verbose'] }],
    builtinSingleArgSlashLineWide: true,
  },
  {
    name: '/focus',
    description: '切换到指定会话',
    insertText: '/focus',
    builtinSingleArgSlashLineWide: true,
    needsDynamicFirstArg: true,
  },
  {
    name: '/kill',
    description: '中止当前运行中的会话',
    insertText: '/kill',
    builtinSingleArgSlashLineWide: true,
    needsDynamicFirstArg: true,
  },
  {
    name: '/steer',
    description: '调整当前会话的模型或行为',
    insertText: '/steer',
    builtinSingleArgSlashLineWide: true,
    needsDynamicFirstArg: true,
  },
  {
    name: '/model',
    description: '切换模型',
    insertText: '/model',
    builtinSingleArgSlashLineWide: true,
    needsDynamicFirstArg: true,
  },
  {
    name: '/skill',
    description: '激活技能',
    insertText: '/skill ',
  },
  {
    name: '/tools',
    description: '显示/隐藏工具调用详情',
    insertText: '/tools',
    argOptions: [
      { name: 'mode', description: '工具展示模式', choices: ['compact', 'verbose', 'none'] },
    ],
  },
];

export function getBuiltinCommands(): SlashCommandEntry[] {
  return BUILTIN_COMMANDS;
}

export interface ComposerMenuState {
  type: 'slash' | 'skill' | null;
  query: string;
  insertKind: 'line' | 'token';
  /** Menu items, optionally enriched with insertKind and dynamic argOptions */
  items: Array<SlashCommandEntry & { insertKind?: 'line' | 'token' }>;
}

/**
 * Dynamic context for slash command first-param enrichment.
 * Populated by ChatApp from:
 *   - GET /api/gateway/sessions  → sessions[]
 *   - GET /api/openclaw/models   → models[]
 *   - GET /api/agents            → agents[]
 */
export interface ComposerSlashDynamicContext {
  sessions?: Array<{ key: string; label?: string; agentId?: string }>;
  models?: string[];
  agents?: Array<{ id: string; name?: string }>;
}

/**
 * Parse composer text to detect slash or @ trigger.
 *
 * Trigger: find last /word before caret and extract just the command name
 * Trigger: (?:^|\s)(@\S*)$  → skill
 *
 * For slash commands, we match from the end using the slash pattern:
 *   - /focus → command=/focus, query=focus
 *   - /focus alp → command=/focus, query=focus (stops at first space after /)
 * This allows the command to be recognized even when the user has started typing arguments.
 *
 * Returns null if no active menu.
 */
export function parseSlashTrigger(text: string, caret: number): ComposerMenuState | null {
  const before = text.slice(0, caret);

  // Slash command: find the slash command near the caret (last /word before caret).
  // We look for a slash that appears at start or after whitespace, then extract
  // just the command name (first word after /, stopping at the next space or caret).
  const slashMatch = before.match(/(?:^|\s)(\/\S*)/);
  if (slashMatch) {
    // Extract just the command name (strip any argument after the first space)
    const raw = slashMatch[1]; // e.g. '/focus alp' or '/focus'
    const spaceIdx = raw.indexOf(' ');
    const cmdName = spaceIdx >= 0 ? raw.slice(0, spaceIdx) : raw; // '/focus'
    const query = cmdName.slice(1); // 'focus'

    // Check if user has typed a space after the command (i.e. is typing the argument)
    const hasSpaceAfterCmd = spaceIdx >= 0;

    const filtered = filterCommands(query);
    if (filtered.length === 0 && query.length > 0) return null;
    return {
      type: 'slash',
      query,
      insertKind: hasSpaceAfterCmd ? 'token' : 'line',
      items: filtered,
    };
  }

  // @ skill: match last @word before caret
  const atMatch = before.match(/(?:^|\s)(@\S*)$/);
  if (atMatch) {
    const query = atMatch[1].slice(1); // remove @
    return {
      type: 'skill',
      query,
      insertKind: 'token',
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

export type SlashInsertKind = 'line' | 'token';

/**
 * Determines the insertKind based on the command entry and whether the user
 * is in the middle of typing an argument (space present in matched text).
 *
 * Multi-arg commands (no builtinSingleArgSlashLineWide) → always token
 * Single-arg lineWide commands:
 *   - /tool compact → token (user chose an arg, replace token)
 *   - /focus  → line (no arg yet, full-line replace)
 */
function computeInsertKind(cmd: SlashCommandEntry, hasSpaceInMatch: boolean): 'line' | 'token' {
  if (cmd.builtinSingleArgSlashLineWide && !hasSpaceInMatch) return 'line';
  return 'token';
}

/**
 * Build enriched menu items by merging dynamic first-param choices for commands
 * that need them (/focus, /kill, /steer, /model).
 *
 * When the user types a query after the command name (e.g. /focus ma), the
 * choices are filtered by startsWith.
 */
function buildDynamicItems(
  cmd: SlashCommandEntry,
  argQuery: string,
  ctx: ComposerSlashDynamicContext | undefined
): SlashCommandEntry {
  if (!cmd.needsDynamicFirstArg) return cmd;

  let choices: string[] = [];

  // Return command unchanged if no dynamic context available
  if (!ctx) return cmd;

  if (cmd.name === '/model' && ctx.models) {
    choices = ctx.models;
  } else if (
    (cmd.name === '/focus' || cmd.name === '/kill' || cmd.name === '/steer') &&
    ctx.sessions
  ) {
    // Use session key (or label if available) as the choice value
    choices = ctx.sessions
      .map((s) => s.label || s.key)
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
  }

  // Filter by arg query (first token being typed)
  // Use includes() rather than startsWith() so that "alp" matches "Alpha Session"
  // (session labels / model names often don't start with the typed prefix)
  if (argQuery) {
    const lc = argQuery.toLowerCase();
    choices = choices.filter((c) => c.toLowerCase().includes(lc));
  }

  // If no choices available (no ctx or filter emptied the list), return unchanged
  if (choices.length === 0) return cmd;

  // Limit to ~300 choices as per spec
  if (choices.length > 300) choices = choices.slice(0, 300);

  return {
    ...cmd,
    argOptions: [
      {
        name: 'value',
        description: cmd.name === '/model' ? '选择模型' : '选择会话',
        choices,
      },
    ],
  };
}

export function computeComposerMenuState(
  text: string,
  caret: number,
  dynamicCtx?: ComposerSlashDynamicContext
): ComposerMenuState | null {
  const base = parseSlashTrigger(text, caret);
  if (!base) return null;

  if (base.type === 'skill') {
    // @ skill: items are populated externally by the caller (skills.status API)
    return base;
  }

  // Detect whether there is a space in the matched slash text (i.e. user is
  // already typing an argument).  We check if the character immediately before
  // the caret is a space — this means the user typed the command name followed
  // by a space and is now typing the argument.
  const before = text.slice(0, caret);
  const hasSpaceInMatch = before.length > 0 && before[before.length - 1] === ' ';

  // Extract the argument being typed after the first space following the slash
  // command name.  Used to filter dynamic choice lists (e.g. /focus alp → 'alp').
  // The command name from parseSlashTrigger may include the argument (e.g. '/focus alp'),
  // so we find its end in 'before' and check the character right after it.
  const cmdNameMatch = before.match(/(?:^|\s)(\/\S*)/);
  const matchedText = cmdNameMatch?.[1] ?? '';
  // Find where the command name ends in the 'before' text
  const cmdEndInBefore = matchedText ? before.indexOf(matchedText) : -1;
  const charAfterCmd = cmdEndInBefore >= 0 ? before[cmdEndInBefore + matchedText.length] : undefined;
  const spaceAfterCmd = charAfterCmd === ' ';
  const finalArgQuery = spaceAfterCmd ? before.slice(cmdEndInBefore + matchedText.length + 1).trimEnd() : '';

  const enrichedItems = base.items.map((cmd) => {
    const insertKind = computeInsertKind(cmd, hasSpaceInMatch);
    const enriched = buildDynamicItems(cmd, finalArgQuery, dynamicCtx);

    return {
      ...enriched,
      insertKind,
    };
  });

  return {
    ...base,
    insertKind: enrichedItems[0]?.insertKind ?? base.insertKind,
    items: enrichedItems,
  };
}
