// ============================================================
// OpenClaw Chat - 性能优化工具 Hooks
// useThrottledValue / useDebouncedValue / useMemoCompare
// ============================================================

"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";

/**
 * 节流 Hook - 限制值更新频率
 *
 * @param value 需要节流的值
 * @param intervalMs 节流间隔（毫秒），默认 300ms
 * @returns 节流后的值
 *
 * 用途：WS 事件高频推送时防止过度渲染（日志/消息流）
 */
export function useThrottledValue<T>(value: T, intervalMs = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());
  const pendingValue = useRef<T>(value);

  useEffect(() => {
    pendingValue.current = value;

    const now = Date.now();
    const elapsed = now - lastUpdated.current;

    if (elapsed >= intervalMs) {
      // Enough time passed, update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Schedule update for remaining time
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(pendingValue.current);
      }, intervalMs - elapsed);

      return () => clearTimeout(timer);
    }
  }, [value, intervalMs]);

  return throttledValue;
}

/**
 * 防抖 Hook - 延迟值更新直到停止变化
 *
 * @param value 需要防抖的值
 * @param delayMs 防抖延迟（毫秒），默认 300ms
 * @returns 防抖后的值
 *
 * 用途：搜索输入框、过滤条件变更等场景
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * 深比较 Memo Hook - 仅当值实际发生变化时返回新引用
 *
 * @param value 需要比较的值
 * @param compare 自定义比较函数，默认浅比较
 * @returns memoized 值（引用稳定）
 *
 * 用途：避免对象/数组 props 导致子组件不必要的重渲染
 */
export function useMemoCompare<T>(
  value: T,
  compare: (prev: T | undefined, next: T) => boolean = (a, b) => a === b
): T {
  const ref = useRef<{ value: T; result: T }>({
    value,
    result: value,
  });

  if (!compare(ref.current.value, value)) {
    ref.current = { value, result: value };
  }

  return ref.current.result;
}

/**
 * RAF-based throttle callback - 基于 requestAnimationFrame 的回调节流
 *
 * @param callback 需要节流的回调函数
 * @returns 节流后的回调函数
 *
 * 用途：scroll/resize/move 等高频事件处理
 */
export function useRafCallback<T extends (...args: any[]) => void>(
  callback: T
): T {
  const rafId = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        callback(...args);
      });
    },
    [callback]
  ) as T;

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return throttledCallback;
}

/**
 * 批量更新 Hook - 将多次 setState 合并为一次渲染
 *
 * @returns { batchUpdate, flushUpdates }
 * - batchUpdate: 收集更新但不触发渲染
 * - flushUpdates: 一次性应用所有收集的更新
 */
export function useBatchedUpdates() {
  const updatesRef = useRef<(() => void)[]>([]);
  const [, forceUpdate] = useState<object>({});

  const batchUpdate = useCallback((fn: () => void) => {
    updatesRef.current.push(fn);
  }, []);

  const flushUpdates = useCallback(() => {
    if (updatesRef.current.length > 0) {
      const pending = [...updatesRef.current];
      updatesRef.current = [];
      pending.forEach((fn) => fn());
      forceUpdate({});
    }
  }, []);

  return { batchUpdate, flushUpdates };
}
