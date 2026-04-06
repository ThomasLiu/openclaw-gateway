/**
 * inflight-dedupe.test.ts
 * 并发请求去重测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  inflightDedupe,
  clearDeduped,
  clearAllDeduped,
  hasInflight,
  getInflightCount,
} from "./inflight-dedupe";

describe("inflight-dedupe", () => {
  beforeEach(() => {
    clearAllDeduped();
  });

  it("首次请求正常执行", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 10));
      return "result";
    };

    const result = await inflightDedupe("test-key", fn);
    expect(result).toBe("result");
    expect(callCount).toBe(1);
  });

  it("相同 key 的并发调用共享同一个 Promise", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return `count-${callCount}`;
    };

    // 同时发起 3 个相同 key 的请求
    const [r1, r2, r3] = await Promise.all([
      inflightDedupe("same-key", fn),
      inflightDedupe("same-key", fn),
      inflightDedupe("same-key", fn),
    ]);

    // 实际只执行了一次函数
    expect(callCount).toBe(1);

    // 所有请求返回相同结果
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it("不同 key 的请求互不影响", async () => {
    let aCount = 0;
    let bCount = 0;

    const fnA = async () => {
      aCount++;
      return "a";
    };
    const fnB = async () => {
      bCount++;
      return "b";
    };

    await Promise.all([
      inflightDedupe("key-a", fnA),
      inflightDedupe("key-b", fnB),
    ]);

    expect(aCount).toBe(1);
    expect(bCount).toBe(1);
  });

  it("请求完成后可以再次调用", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return callCount;
    };

    const r1 = await inflightDedupe("reuse-key", fn);
    const r2 = await inflightDedupe("reuse-key", fn);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(callCount).toBe(2);
  });

  it("hasInflight 正确检测", async () => {
    let release: () => void;
    const wait = new Promise<void>((r) => {
      release = r;
    });

    const fn = async () => {
      await wait;
      return "done";
    };

    const p = inflightDedupe("pending-key", fn);
    expect(hasInflight("pending-key")).toBe(true);
    expect(hasInflight("other-key")).toBe(false);

    release!();
    await p;

    // 请求结束后清除（需要等待微任务队列处理 finally）
    await new Promise((r) => setTimeout(r, 0));

    // settled=true 后，相同 key 的后续调用会创建新请求
    // hasInflight 只检查未 settled 的 entry
    expect(hasInflight("pending-key")).toBe(false);
  });

  it("getInflightCount 返回正在进行的请求数", async () => {
    let release1: () => void;
    let release2: () => void;

    const wait1 = new Promise<void>((r) => { release1 = r; });
    const wait2 = new Promise<void>((r) => { release2 = r; });

    const fn1 = async () => { await wait1; return "a"; };
    const fn2 = async () => { await wait2; return "b"; };

    const p1 = inflightDedupe("count-a", fn1);
    expect(getInflightCount()).toBeGreaterThanOrEqual(1);

    const p2 = inflightDedupe("count-b", fn2);
    expect(getInflightCount()).toBeGreaterThanOrEqual(2);

    release1!();
    await p1;

    release2!();
    await p2;
  });

  it("clearDeduped 清除指定 key", async () => {
    let release: () => void;
    const wait = new Promise<void>((r) => { release = r; });

    const fn = async () => { await wait; return "x"; };

    const p = inflightDedupe("to-clear", fn);
    expect(hasInflight("to-clear")).toBe(true);

    clearDeduped("to-clear");

    // 清除后 hasInflight 返回 false（即使 Promise 还在）
    expect(hasInflight("to-clear")).toBe(false);

    release!();
    await p;
  });

  it("clearAllDeduped 清除所有记录", async () => {
    // 使用短延迟确保函数能正常完成
    const p1 = inflightDedupe("all-1", async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "1";
    });
    const p2 = inflightDedupe("all-2", async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "2";
    });

    expect(getInflightCount()).toBeGreaterThanOrEqual(2);
    clearAllDeduped();
    expect(getInflightCount()).toBe(0);

    // 即使清除了，请求仍然会正常完成
    await expect(p1).resolves.toBe("1");
    await expect(p2).resolves.toBe("2");
  });
});
