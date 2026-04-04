/**
 * session-history-cache.test.ts
 * 会话历史内存缓存测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedHistory,
  setCachedHistory,
  invalidateSessionHistory,
  clearAllSessionHistoryCache,
  getCachedSessionKeys,
  makeSessionHistoryCacheKey,
  SESSION_HISTORY_CACHE_MAX_SIZE,
} from "./session-history-cache";
import type { GatewayMessage } from "./openclaw/types";

const makeMsg = (content: string): GatewayMessage => ({
  role: "user",
  content: { type: "text", text: content },
});

describe("session-history-cache", () => {
  beforeEach(() => {
    clearAllSessionHistoryCache();
  });

  describe("makeSessionHistoryCacheKey", () => {
    it("生成带前缀的 key", () => {
      expect(makeSessionHistoryCacheKey("session-1")).toBe("history:session-1");
    });
  });

  describe("getCachedHistory / setCachedHistory", () => {
    it("未缓存返回 null", () => {
      expect(getCachedHistory("new-session")).toBeNull();
    });

    it("缓存后可以读取", () => {
      const messages: GatewayMessage[] = [
        makeMsg("Hello"),
      ];

      setCachedHistory("session-1", messages);
      const cached = getCachedHistory("session-1");

      expect(cached).toEqual(messages);
    });

    it("LRU 淘汰超过最大容量", () => {
      const messages: GatewayMessage[] = [makeMsg("x")];

      // 插入超过 MAX_SIZE 的会话
      for (let i = 0; i < SESSION_HISTORY_CACHE_MAX_SIZE + 5; i++) {
        setCachedHistory(`session-${i}`, messages);
      }

      // 最老的会话应该被淘汰
      expect(getCachedHistory("session-0")).toBeNull();

      // 最近的会话仍然存在
      expect(getCachedHistory(`session-${SESSION_HISTORY_CACHE_MAX_SIZE + 4}`)).toEqual(messages);
    });

    it("命中缓存时更新 LRU 时间戳", async () => {
      const messages: GatewayMessage[] = [makeMsg("y")];

      setCachedHistory("lru-test", messages);

      // 等待一小段时间后再访问
      await new Promise((r) => setTimeout(r, 10));

      // 再次访问（更新 LRU）
      const cached = getCachedHistory("lru-test");
      expect(cached).toEqual(messages);
    });

    it("更新已存在的会话", () => {
      const messages1: GatewayMessage[] = [makeMsg("v1")];
      const messages2: GatewayMessage[] = [makeMsg("v2")];

      setCachedHistory("session-update", messages1);
      setCachedHistory("session-update", messages2);

      const cached = getCachedHistory("session-update");
      expect(cached).toEqual(messages2);
      expect(cached).not.toEqual(messages1);
    });
  });

  describe("invalidateSessionHistory", () => {
    it("使指定会话缓存失效", () => {
      setCachedHistory("to-invalidate", [makeMsg("test")]);

      expect(getCachedHistory("to-invalidate")).not.toBeNull();

      invalidateSessionHistory("to-invalidate");

      expect(getCachedHistory("to-invalidate")).toBeNull();
    });

    it("不影响其他会话", () => {
      setCachedHistory("keep", [makeMsg("keep")]);
      setCachedHistory("remove", [makeMsg("remove")]);

      invalidateSessionHistory("remove");

      expect(getCachedHistory("keep")).not.toBeNull();
      expect(getCachedHistory("remove")).toBeNull();
    });
  });

  describe("clearAllSessionHistoryCache", () => {
    it("清空所有缓存", () => {
      setCachedHistory("a", [makeMsg("a")]);
      setCachedHistory("b", [makeMsg("b")]);

      clearAllSessionHistoryCache();

      expect(getCachedHistory("a")).toBeNull();
      expect(getCachedHistory("b")).toBeNull();
      expect(getCachedSessionKeys()).toHaveLength(0);
    });
  });

  describe("getCachedSessionKeys", () => {
    it("返回缓存中的 key 列表", () => {
      setCachedHistory("k1", []);
      setCachedHistory("k2", []);

      const keys = getCachedSessionKeys();

      expect(keys).toContain("k1");
      expect(keys).toContain("k2");
    });

    it("空缓存返回空数组", () => {
      expect(getCachedSessionKeys()).toHaveLength(0);
    });
  });
});
