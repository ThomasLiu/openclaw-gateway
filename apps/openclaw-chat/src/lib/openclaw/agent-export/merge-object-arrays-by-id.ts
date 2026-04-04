/**
 * merge-object-arrays-by-id.ts
 * 按 id 字段合并两个对象数组
 *
 * 与上游 openclaw/src/config/merge-patch.ts 的 agents.list 同 id 合并语义一致
 */

import "server-only";

/**
 * 按 id 字段合并两个对象数组
 *
 * 规则：
 * - 两个数组中相同 id 的对象深度合并（arr2 覆盖 arr1）
 * - 仅 arr1 中存在的 id 保留
 * - 仅 arr2 中存在的 id 追加
 */
export function mergeObjectArraysById<T extends { id: string }>(
  arr1: T[],
  arr2: T[]
): T[] {
  const byId = new Map<string, T>();

  // 先加入 arr1
  for (const item of arr1) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(item.id, { ...item });
    }
  }

  // 用 arr2 合并/追加
  for (const item of arr2) {
    if (item && typeof item === "object" && "id" in item) {
      const existing = byId.get(item.id);
      if (existing) {
        // 深度合并（arr2 覆盖 arr1）
        byId.set(item.id, deepMerge(existing, item));
      } else {
        byId.set(item.id, { ...item });
      }
    }
  }

  return Array.from(byId.values());
}

/** 深度合并两个对象（target 被 source 覆盖） */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === "object" &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      // 递归深度合并对象
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = sourceVal as T[keyof T];
    }
  }

  return result;
}
