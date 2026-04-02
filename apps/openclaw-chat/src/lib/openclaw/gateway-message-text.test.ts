import { describe, it, expect } from 'vitest';
import { extractAssistantTextFromGatewayMessage } from './client';

describe('extractAssistantTextFromGatewayMessage', () => {
  it('extracts text from content[0].text', () => {
    const msg = {
      content: [{ type: 'text', text: 'Hello world' }],
    };
    expect(extractAssistantTextFromGatewayMessage(msg)).toBe('Hello world');
  });

  it('extracts text from output block', () => {
    const msg = {
      content: [{ type: 'output', text: 'Tool result' }],
    };
    expect(extractAssistantTextFromGatewayMessage(msg)).toBe('Tool result');
  });

  it('falls back to top-level text field', () => {
    const msg = { text: 'Fallback text' };
    expect(extractAssistantTextFromGatewayMessage(msg)).toBe('Fallback text');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractAssistantTextFromGatewayMessage(null)).toBe('');
    expect(extractAssistantTextFromGatewayMessage(undefined)).toBe('');
  });

  it('prefers text over output when text is non-empty', () => {
    const msg = {
      content: [
        { type: 'text', text: 'Primary' },
        { type: 'output', text: 'Secondary' },
      ],
    };
    expect(extractAssistantTextFromGatewayMessage(msg)).toBe('Primary');
  });
});
