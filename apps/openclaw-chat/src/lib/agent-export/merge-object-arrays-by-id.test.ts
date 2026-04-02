import { describe, it, expect } from 'vitest';
import { mergeObjectArraysById } from './merge-object-arrays-by-id';

describe('mergeObjectArraysById', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeObjectArraysById([], [])).toEqual([]);
  });

  it('returns base items when overrides is empty', () => {
    const base = [{ id: 'a', name: 'alpha' }, { id: 'b', name: 'beta' }];
    expect(mergeObjectArraysById(base, [])).toEqual(base);
  });

  it('returns override items when base is empty', () => {
    const overrides = [{ id: 'a', name: 'ALPHA' }];
    expect(mergeObjectArraysById([], overrides)).toEqual(overrides);
  });

  it('merges by id — overrides win', () => {
    const base = [{ id: 'a', name: 'alpha' }, { id: 'b', name: 'beta' }];
    const overrides = [{ id: 'a', name: 'ALPHA-override' }];
    const result = mergeObjectArraysById(base, overrides);
    expect(result).toContainEqual({ id: 'a', name: 'ALPHA-override' });
    expect(result).toContainEqual({ id: 'b', name: 'beta' });
  });

  it('appends new items from overrides', () => {
    const base = [{ id: 'a', name: 'alpha' }];
    const overrides = [{ id: 'c', name: 'gamma' }];
    const result = mergeObjectArraysById(base, overrides);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: 'a', name: 'alpha' });
    expect(result).toContainEqual({ id: 'c', name: 'gamma' });
  });

  it('handles full replacement of an item', () => {
    const base = [{ id: 'x', name: 'old', extra: 1 }];
    const overrides = [{ id: 'x', name: 'new', extra: 2 }];
    const result = mergeObjectArraysById(base, overrides);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'x', name: 'new', extra: 2 });
  });

  it('preserves insertion order (base first, then new overrides)', () => {
    const base = [{ id: 'a', order: 1 }, { id: 'b', order: 2 }];
    const overrides = [{ id: 'c', order: 3 }];
    const result = mergeObjectArraysById(base, overrides);
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
