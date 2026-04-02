/**
 * Merge two arrays of objects by their `id` field.
 * Items in `overrides` win over `base` for the same id.
 * Items only in `base` are kept.
 * Items only in `overrides` are appended.
 *
 * This mirrors the `mergePatch` semantics used by OpenClaw for agents.list
 * in the upstream `ai-reference-sources/openclaw/src/config/merge-patch.ts`.
 */
export function mergeObjectArraysById<T extends { id: string }>(
  base: T[],
  overrides: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of base) {
    map.set(item.id, item);
  }

  for (const item of overrides) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}
