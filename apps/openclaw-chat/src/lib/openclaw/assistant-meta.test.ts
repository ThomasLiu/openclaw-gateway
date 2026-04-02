import { describe, it, expect } from 'vitest';
import { extractAssistantMetaFromGatewayMessage } from './client';

describe('extractAssistantMetaFromGatewayMessage', () => {
  it('extracts model, runId, durationMs', () => {
    const msg = {
      runId: 'run_123',
      model: 'gpt-4o',
      modelProvider: 'openai',
      durationMs: 1500,
    };
    const meta = extractAssistantMetaFromGatewayMessage(msg);
    expect(meta.runId).toBe('run_123');
    expect(meta.model).toBe('gpt-4o');
    expect(meta.modelProvider).toBe('openai');
    expect(meta.durationMs).toBe(1500);
  });

  it('returns empty object for null', () => {
    expect(extractAssistantMetaFromGatewayMessage(null)).toEqual({});
  });

  it('ignores non-numeric durationMs', () => {
    const msg = { durationMs: 'slow' };
    expect(extractAssistantMetaFromGatewayMessage(msg).durationMs).toBeUndefined();
  });
});
