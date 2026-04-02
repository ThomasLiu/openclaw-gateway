import { describe, it, expect } from 'vitest';
import { clampComposerTotalHeightPx, parseCssPx } from '../components/use-composer-textarea-height';

describe('clampComposerTotalHeightPx', () => {
  it('clamps to min when below', () => {
    expect(clampComposerTotalHeightPx(10, 44, 200)).toBe(44);
  });

  it('clamps to max when above', () => {
    expect(clampComposerTotalHeightPx(300, 44, 200)).toBe(200);
  });

  it('returns value when within range', () => {
    expect(clampComposerTotalHeightPx(100, 44, 200)).toBe(100);
  });

  it('handles edge cases', () => {
    expect(clampComposerTotalHeightPx(44, 44, 200)).toBe(44);
    expect(clampComposerTotalHeightPx(200, 44, 200)).toBe(200);
  });
});

describe('parseCssPx', () => {
  it('parses valid px values', () => {
    expect(parseCssPx('44px')).toBe(44);
    expect(parseCssPx('100.5px')).toBe(100.5);
  });

  it('returns 0 for invalid format', () => {
    expect(parseCssPx('44')).toBe(0);
    expect(parseCssPx('abc')).toBe(0);
    expect(parseCssPx('')).toBe(0);
  });
});
