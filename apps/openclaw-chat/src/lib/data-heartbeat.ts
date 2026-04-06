/**
 * Data Heartbeat - 定时触发会话列表/状态刷新
 *
 * 特点：
 * - 定时回调（默认 30 秒）
 * - 页面隐藏（visibilitychange）时暂停
 * - 页面恢复时立即触发一次
 * - 返回 unsubscribe 取消订阅
 */

export type HeartbeatCallback = () => void | Promise<void>;

const DEFAULT_INTERVAL_MS = 30_000;

let heartbeatId = 0;
const subscriptions = new Map<
  number,
  { callback: HeartbeatCallback; intervalMs: number; timer: ReturnType<typeof setInterval> | null }
>();

/**
 * 订阅数据心跳
 *
 * @param callback 定时回调函数
 * @param intervalMs 心跳间隔（默认 30 秒）
 * @returns unsubscribe 取消订阅函数
 */
export function subscribeDataHeartbeat(
  callback: HeartbeatCallback,
  intervalMs = DEFAULT_INTERVAL_MS
): () => void {
  const id = ++heartbeatId;

  // 避免在 SSR 时执行
  if (typeof window === "undefined") {
    return () => {
      subscriptions.delete(id);
    };
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let paused = false;

  function tick() {
    if (paused) return;
    void Promise.resolve(callback());
  }

  timer = setInterval(tick, intervalMs);

  // visibilitychange：页面隐藏时暂停，恢复时立即触发
  function onVisibilityChange() {
    if (document.hidden) {
      paused = true;
    } else {
      paused = false;
      // 恢复时立即触发一次
      void tick();
    }
  }

  // 避免重复添加监听器
  if (subscriptions.size === 0) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  subscriptions.set(id, { callback, intervalMs, timer });

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    subscriptions.delete(id);

    // 最后一个订阅时移除监听器
    if (subscriptions.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

/**
 * 获取当前活跃订阅数（测试用）
 */
export function getHeartbeatSubscriptionCount(): number {
  return subscriptions.size;
}

/**
 * 清除所有心跳订阅（测试用）
 */
export function clearAllHeartbeats(): void {
  for (const [, sub] of subscriptions) {
    if (sub.timer) {
      clearInterval(sub.timer);
    }
  }
  subscriptions.clear();

  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", () => {
      // 已清理
    });
  }
}
