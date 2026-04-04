/**
 * data-heartbeat.test.ts
 * 数据心跳测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  subscribeDataHeartbeat,
  getHeartbeatSubscriptionCount,
  clearAllHeartbeats,
} from "./data-heartbeat";

describe("data-heartbeat", () => {
  beforeEach(() => {
    clearAllHeartbeats();
    vi.restoreAllMocks();
  });

  it("SSR 环境不报错", () => {
    // 在 Node.js 环境（无 window）测试
    const originalWindow = globalThis.window;
    delete (globalThis as Record<string, unknown>).window;

    const unsubscribe = subscribeDataHeartbeat(() => {}, 1000);
    unsubscribe();

    (globalThis as Record<string, unknown>).window = originalWindow;
  });

  it("正常订阅和取消", () => {
    const callback = () => { void 0; };

    const unsubscribe = subscribeDataHeartbeat(callback, 100_000); // 很长间隔，避免干扰

    expect(getHeartbeatSubscriptionCount()).toBe(1);

    unsubscribe();
    expect(getHeartbeatSubscriptionCount()).toBe(0);
  });

  it("多次订阅正确计数", () => {
    const unsub1 = subscribeDataHeartbeat(() => {}, 100_000);
    const unsub2 = subscribeDataHeartbeat(() => {}, 100_000);

    expect(getHeartbeatSubscriptionCount()).toBe(2);

    unsub1();
    expect(getHeartbeatSubscriptionCount()).toBe(1);

    unsub2();
    expect(getHeartbeatSubscriptionCount()).toBe(0);
  });

  it("订阅后定时触发回调", async () => {
    let callCount = 0;
    const callback = () => {
      callCount++;
    };

    // 使用较短间隔（100ms）以便测试
    const unsubscribe = subscribeDataHeartbeat(callback, 100);

    // 等待至少一个间隔触发
    await new Promise((r) => setTimeout(r, 250));

    expect(callCount).toBeGreaterThanOrEqual(1);

    unsubscribe();
  });

  it("取消后不再触发", async () => {
    let callCount = 0;
    const callback = () => { callCount++; };

    const unsubscribe = subscribeDataHeartbeat(callback, 10_000);

    await new Promise((r) => setTimeout(r, 0));
    const countAfterFirst = callCount;

    unsubscribe();

    await new Promise((r) => setTimeout(r, 50));

    // 不再增加
    expect(callCount).toBe(countAfterFirst);
  });

  it("clearAllHeartbeats 清除所有心跳", () => {
    subscribeDataHeartbeat(() => {}, 100_000);
    subscribeDataHeartbeat(() => {}, 100_000);

    expect(getHeartbeatSubscriptionCount()).toBe(2);

    clearAllHeartbeats();

    expect(getHeartbeatSubscriptionCount()).toBe(0);
  });
});
