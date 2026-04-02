import { describe, it, expect } from 'vitest';
import { computeComposerMenuState } from './composer-slash-registry';
import type { ComposerSlashDynamicContext } from './composer-slash-registry';

const emptyCtx: ComposerSlashDynamicContext = {};

const sessionsCtx: ComposerSlashDynamicContext = {
  sessions: [
    { key: 'session-alpha', label: 'Alpha Session', agentId: 'main' },
    { key: 'session-beta', label: 'Beta Session', agentId: 'main' },
    { key: 'session-gamma', label: 'Gamma Session', agentId: 'other' },
  ],
};

const modelsCtx: ComposerSlashDynamicContext = {
  models: ['openai/gpt-4', 'anthropic/claude-3', 'local/llama3'],
};

describe('computeComposerMenuState — dynamic args (Step 5)', () => {
  it('adds session choices to /focus when sessions are available', () => {
    const state = computeComposerMenuState('/focus', 6, sessionsCtx);
    expect(state?.type).toBe('slash');
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    expect(focusCmd?.argOptions?.[0]?.choices).toContain('Alpha Session');
    expect(focusCmd?.argOptions?.[0]?.choices).toContain('Beta Session');
    expect(focusCmd?.argOptions?.[0]?.choices?.length).toBe(3);
  });

  it('adds model choices to /model when models are available', () => {
    const state = computeComposerMenuState('/model', 6, modelsCtx);
    const modelCmd = state?.items.find((i) => i.name === '/model');
    expect(modelCmd?.argOptions?.[0]?.choices).toContain('openai/gpt-4');
    expect(modelCmd?.argOptions?.[0]?.choices).toContain('anthropic/claude-3');
    expect(modelCmd?.argOptions?.[0]?.choices?.length).toBe(3);
  });

  it('adds session choices to /kill and /steer', () => {
    const killState = computeComposerMenuState('/kill', 5, sessionsCtx);
    const killCmd = killState?.items.find((i) => i.name === '/kill');
    expect(killCmd?.argOptions?.[0]?.choices?.length).toBe(3);

    const steerState = computeComposerMenuState('/steer', 6, sessionsCtx);
    const steerCmd = steerState?.items.find((i) => i.name === '/steer');
    expect(steerCmd?.argOptions?.[0]?.choices?.length).toBe(3);
  });

  it('filters session choices by argQuery (case-insensitive includes)', () => {
    // argQuery = 'alp' matches 'Alpha' via case-insensitive includes
    // '/focus alp' (10 chars) at caret 10 → argQuery = 'alp'
    const state = computeComposerMenuState('/focus alp', 10, sessionsCtx);
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    const choices = focusCmd?.argOptions?.[0]?.choices ?? [];
    expect(choices).toContain('Alpha Session');
    // Beta/Gamma don't contain 'alp' (case-insensitive)
    expect(choices).not.toContain('Beta Session');
    expect(choices).not.toContain('Gamma Session');
  });

  it('filters model choices by argQuery (includes match)', () => {
    // argQuery = 'ope' matches 'openai/gpt-4' via includes
    // '/model ope ' (11 chars) at caret 10 → argQuery = 'ope'
    const state = computeComposerMenuState('/model ope ', 10, modelsCtx);
    const modelCmd = state?.items.find((i) => i.name === '/model');
    const choices = modelCmd?.argOptions?.[0]?.choices ?? [];
    expect(choices).toContain('openai/gpt-4');
    expect(choices).not.toContain('local/llama3');
  });

  it('deduplicates sessions with same label/key', () => {
    const ctx: ComposerSlashDynamicContext = {
      sessions: [
        { key: 'a', label: 'Same', agentId: 'x' },
        { key: 'b', label: 'Same', agentId: 'y' },
      ],
    };
    const state = computeComposerMenuState('/focus', 6, ctx);
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    // Deduplication should keep unique labels
    expect(focusCmd?.argOptions?.[0]?.choices?.length).toBeLessThanOrEqual(2);
  });

  it('returns command unchanged when no dynamic context', () => {
    const state = computeComposerMenuState('/focus', 6, emptyCtx);
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    expect(focusCmd?.argOptions).toBeUndefined();
  });
});

describe('computeComposerMenuState — insertKind (Step 6)', () => {
  it('/focus (no space) → insertKind: line', () => {
    const state = computeComposerMenuState('/focus', 6, sessionsCtx);
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    expect(focusCmd?.insertKind).toBe('line');
  });

  it('/focus  (with space, typing arg) → insertKind: token', () => {
    // Trailing space so user is about to type the argument
    const state = computeComposerMenuState('/focus ', 7, sessionsCtx);
    const focusCmd = state?.items.find((i) => i.name === '/focus');
    expect(focusCmd?.insertKind).toBe('token');
  });

  it('/tools  (multi-arg, typing arg) → insertKind: token', () => {
    const state = computeComposerMenuState('/tools ', 7, emptyCtx);
    const toolsCmd = state?.items.find((i) => i.name === '/tools');
    expect(toolsCmd?.insertKind).toBe('token');
  });

  it('/think  (single-arg) → insertKind: line', () => {
    const state = computeComposerMenuState('/think', 6, emptyCtx);
    const thinkCmd = state?.items.find((i) => i.name === '/think');
    expect(thinkCmd?.insertKind).toBe('line');
  });

  it('/model (no space) → insertKind: line', () => {
    const state = computeComposerMenuState('/model', 6, modelsCtx);
    const modelCmd = state?.items.find((i) => i.name === '/model');
    expect(modelCmd?.insertKind).toBe('line');
  });

  it('/kill (no space) → insertKind: line', () => {
    const state = computeComposerMenuState('/kill', 5, sessionsCtx);
    const killCmd = state?.items.find((i) => i.name === '/kill');
    expect(killCmd?.insertKind).toBe('line');
  });

  it('/steer (no space) → insertKind: line', () => {
    const state = computeComposerMenuState('/steer', 6, sessionsCtx);
    const steerCmd = state?.items.find((i) => i.name === '/steer');
    expect(steerCmd?.insertKind).toBe('line');
  });
});

describe('parseSlashTrigger — Step 2 & 3 (regex triggers)', () => {
  it('(?:^|\\s)(/\\S*)$ triggers slash at line start', () => {
    const state = computeComposerMenuState('/foc', 4, emptyCtx);
    expect(state?.type).toBe('slash');
    expect(state?.query).toBe('foc');
  });

  it('(?:^|\\s)(@\\S*)$ triggers skill', () => {
    const state = computeComposerMenuState('use @web', 8, emptyCtx);
    expect(state?.type).toBe('skill');
    expect(state?.query).toBe('web');
  });

  it('slash command after space also triggers', () => {
    const state = computeComposerMenuState('hello /mod', 10, emptyCtx);
    expect(state?.type).toBe('slash');
    expect(state?.query).toBe('mod');
  });

  it('/skill at caret position matches /skill (not @foo slash)', () => {
    // Caret at 6 = after '/skill', before '@foo'. Text before caret is '/skill'.
    // This correctly triggers the slash menu for /skill (not /foo from @foo).
    const slashSkill = computeComposerMenuState('/skill @foo', 6, emptyCtx);
    expect(slashSkill?.type).toBe('slash'); // /skill is a slash command
    // The item should be /skill (or /tools which also contains 'skill')
    expect(slashSkill?.items.some((i) => i.name === '/skill')).toBe(true);

    // @foo separately triggers skill type
    const atSkill = computeComposerMenuState('@foo', 5, emptyCtx);
    expect(atSkill?.type).toBe('skill');
  });
});
