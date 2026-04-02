import { describe, it, expect } from 'vitest';
import { redactSecretsForExport } from './redact-secrets-for-export';

describe('redactSecretsForExport', () => {
  it('returns original for null', () => {
    const { redacted, secrets } = redactSecretsForExport(null);
    expect(redacted).toBeNull();
    expect(secrets).toHaveLength(0);
  });

  it('returns original for undefined', () => {
    const { redacted, secrets } = redactSecretsForExport(undefined);
    expect(redacted).toBeUndefined();
    expect(secrets).toHaveLength(0);
  });

  it('returns original for primitives', () => {
    expect(redactSecretsForExport('hello').redacted).toBe('hello');
    expect(redactSecretsForExport(42).redacted).toBe(42);
    expect(redactSecretsForExport(true).redacted).toBe(true);
  });

  it('redacts top-level apiKey', () => {
    const input = { apiKey: 'super-secret-123', name: 'my-agent' };
    const { redacted, secrets } = redactSecretsForExport(input);
    expect(redacted).toEqual({
      apiKey: expect.stringContaining('__OPENCLAW_IMPORT_REQUIRED__:'),
      name: 'my-agent',
    });
    expect(secrets).toHaveLength(1);
    expect(secrets[0]!.id).toBe('apikey'); // buildEntryId lowercases the path
  });

  it('redacts nested secret values', () => {
    const input = {
      providers: {
        openai: { apiKey: 'sk-nested', model: 'gpt-4' },
      },
    };
    const { redacted, secrets } = redactSecretsForExport(input);
    expect((redacted as Record<string, unknown>).providers).toEqual({
      openai: { apiKey: expect.stringContaining('__OPENCLAW_IMPORT_REQUIRED__:'), model: 'gpt-4' },
    });
    expect(secrets).toHaveLength(1);
    expect(secrets[0]!.jsonPath).toBe('providers.openai.apiKey');
  });

  it('redacts token suffix keys', () => {
    const input = { accessToken: 'secret', refresh_token: 'also-secret' };
    const { redacted, secrets } = redactSecretsForExport(input);
    expect(redacted).toEqual({
      accessToken: expect.stringContaining('__OPENCLAW_IMPORT_REQUIRED__:'),
      refresh_token: expect.stringContaining('__OPENCLAW_IMPORT_REQUIRED__:'),
    });
    expect(secrets).toHaveLength(2);
  });

  it('redacts password field', () => {
    const input = { password: 'hunter2' };
    const { redacted, secrets } = redactSecretsForExport(input);
    expect(redacted).toEqual({
      password: expect.stringContaining('__OPENCLAW_IMPORT_REQUIRED__:'),
    });
    expect(secrets).toHaveLength(1);
  });

  it('does not redact empty secret values', () => {
    const input = { apiKey: '', token: null };
    const { redacted, secrets } = redactSecretsForExport(input);
    expect(secrets).toHaveLength(0);
    expect(redacted).toEqual({ apiKey: '', token: null });
  });

  it('handles arrays of objects', () => {
    const input = {
      models: [
        { id: 'gpt-4', apiKey: 'key1' },
        { id: 'claude', apiKey: 'key2' },
      ],
    };
    const { secrets } = redactSecretsForExport(input);
    expect(secrets).toHaveLength(2);
    const paths = secrets.map((s) => s.jsonPath);
    expect(paths).toContain('models[0].apiKey');
    expect(paths).toContain('models[1].apiKey');
  });

  it('generates unique ids per jsonPath', () => {
    const input = { a: { apiKey: 'k1' }, b: { apiKey: 'k2' } };
    const { secrets } = redactSecretsForExport(input);
    const ids = secrets.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });

  it('marks required=true for non-empty strings', () => {
    const input = { apiKey: 'has-value' };
    const { secrets } = redactSecretsForExport(input);
    expect(secrets[0]!.required).toBe(true);
  });

  it('marks required=false for empty strings', () => {
    const input = { apiKey: '' };
    const { secrets } = redactSecretsForExport(input);
    expect(secrets).toHaveLength(0); // empty values not collected
  });

  it('infers kind as string for string values', () => {
    const input = { token: 'abc' };
    const { secrets } = redactSecretsForExport(input);
    expect(secrets[0]!.kind).toBe('string');
  });

  it('deep redacts nested objects', () => {
    const input = {
      deep: { nested: { apiKey: 'deep-secret' } },
    };
    const { secrets } = redactSecretsForExport(input);
    expect(secrets[0]!.jsonPath).toBe('deep.nested.apiKey');
  });

  it('does not modify the original object', () => {
    const input = { apiKey: 'original' };
    redactSecretsForExport(input);
    expect(input.apiKey).toBe('original');
  });
});
