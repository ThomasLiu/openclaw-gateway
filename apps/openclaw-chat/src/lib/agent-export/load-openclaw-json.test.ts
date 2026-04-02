import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import * as fs from 'fs';
import { loadOpenClawJsonObject } from './load-openclaw-json';

describe('loadOpenClawJsonObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads config from OPENCLAW_CONFIG_PATH when set', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValueOnce(Buffer.from('{"agents":{"list":[]}}'));
    vi.stubEnv('OPENCLAW_CONFIG_PATH', '/custom/path/openclaw.json');

    const result = loadOpenClawJsonObject();
    expect(result).toEqual({ agents: { list: [] } });
    expect(fs.readFileSync).toHaveBeenCalledWith('/custom/path/openclaw.json', 'utf-8');
  });

  it('throws when config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.stubEnv('OPENCLAW_CONFIG_PATH', '/nonexistent/openclaw.json');

    expect(() => loadOpenClawJsonObject()).toThrow('OpenClaw config not found');
  });

  it('throws when JSON is invalid', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValueOnce(Buffer.from('not valid json {{{'));
    vi.stubEnv('OPENCLAW_CONFIG_PATH', '/test/openclaw.json');

    expect(() => loadOpenClawJsonObject()).toThrow('Failed to parse');
  });
});
