/**
 * 并发请求去重（inflight deduplication）
 *
 * 防止同一 sessionKey 的并发请求打爆网关
 *
 * 策略：同一 key 的并发请求共享同一个 Promise。
 * 请求结束后，在 Promise resolve 后同步清除 entry。
 */

// 内存中正在进行的请求 Promise 和 resolve 函数
const inflightRequests = new Map<string, {
  promise: Promise<unknown>;
  settled: boolean;
}>();

/**
 * 对同一 key 的并发调用共享同一个 Promise
 *
 * @param key 请求标识
 * @param fn 请求函数
 * @returns Promise<T>
 */
export async function inflightDedupe<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // 如果已有相同 key 的请求正在进行且未结束，等待它
  const existing = inflightRequests.get(key);
  if (existing && !existing.settled) {
    return existing.promise as Promise<T>;
  }

  // 创建新请求
  let resolveFn: (v: unknown) => void;
  let rejectFn: (e: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve as (v: unknown) => void;
    rejectFn = reject;
  });

  const entry = {
    promise: promise as Promise<unknown>,
    settled: false,
  };

  inflightRequests.set(key, entry);

  // 执行请求，结束后标记为已结束并清除
  fn()
    .then((value) => {
      entry.settled = true;
      resolveFn(value);
    })
    .catch((err) => {
      entry.settled = true;
      rejectFn(err);
    })
    .finally(() => {
      // 请求结束后同步清除（entry.settled 已设为 true，
      // 后续同 key 调用会创建新请求）
      inflightRequests.delete(key);
    });

  return promise;
}

/**
 * 清除指定 key 的去重记录
 */
export function clearDeduped(key: string): void {
  inflightRequests.delete(key);
}

/**
 * 清除所有去重记录
 */
export function clearAllDeduped(): void {
  inflightRequests.clear();
}

/**
 * 检查是否有指定 key 的请求正在进行（未结束）
 */
export function hasInflight(key: string): boolean {
  return inflightRequests.has(key);
}

/**
 * 获取当前正在进行的请求数量
 */
export function getInflightCount(): number {
  return inflightRequests.size;
}

