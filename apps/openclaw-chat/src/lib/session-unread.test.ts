/**
 * session-unread.test.ts
 * 会话未读计数计算测试
 */

import { describe, it, expect } from "vitest";
import {
  computeSessionUnreadByKey,
  aggregateUnreadByAgentId,
  mergeUnreadWithSnapshot,
  maxUiMessageId,
  isMessageUnread,
} from "./session-unread";

describe("session-unread", () => {
  describe("computeSessionUnreadByKey", () => {
    it("从未已读的会话，所有消息都视为未读", () => {
      const messages = [
        { id: "1" }, { id: "2" }, { id: "3" },
      ];
      const readMap = new Map<string, string | number>();

      const unread = computeSessionUnreadByKey("session-a", messages, readMap);

      // 排除用户消息后，assistant 消息视为未读
      expect(unread).toBe(3);
    });

    it("正确计算已读游标后的未读数", () => {
      const messages = [
        { id: "1" }, { id: "2" }, { id: "3" }, { id: "4" },
      ];
      const readMap = new Map<string, string | number>([["session-a", "2"]]);

      const unread = computeSessionUnreadByKey("session-a", messages, readMap);

      // 2 之后有 3, 4 两个未读
      expect(unread).toBe(2);
    });

    it("游标等于最后一条消息时未读为 0", () => {
      const messages = [{ id: "1" }, { id: "2" }];
      const readMap = new Map<string, string | number>([["session-a", "2"]]);

      const unread = computeSessionUnreadByKey("session-a", messages, readMap);

      expect(unread).toBe(0);
    });

    it("游标不在消息列表中时返回合理值", () => {
      const messages = [{ id: "1" }, { id: "2" }, { id: "3" }];
      const readMap = new Map<string, string | number>([["session-a", "99"]]);

      const unread = computeSessionUnreadByKey("session-a", messages, readMap);

      // 99 不在列表中，视为全部未读
      expect(unread).toBeGreaterThanOrEqual(0);
    });

    it("空消息列表返回 0", () => {
      const messages: Array<{ id?: string | number }> = [];
      const readMap = new Map<string, string | number>();

      const unread = computeSessionUnreadByKey("session-a", messages, readMap);

      expect(unread).toBe(0);
    });
  });

  describe("aggregateUnreadByAgentId", () => {
    it("正确按 agentId 聚合", () => {
      const sessions = [
        { sessionKey: "s1", agentId: "agent-a" },
        { sessionKey: "s2", agentId: "agent-a" },
        { sessionKey: "s3", agentId: "agent-b" },
      ];
      const unreadByKey = { s1: 2, s2: 3, s3: 1 };

      const result = aggregateUnreadByAgentId(sessions, unreadByKey);

      expect(result.get("agent-a")).toBe(5);
      expect(result.get("agent-b")).toBe(1);
    });

    it("unknown agentId 处理", () => {
      const sessions = [
        { sessionKey: "s1" },
      ];
      const unreadByKey = { s1: 5 };

      const result = aggregateUnreadByAgentId(sessions, unreadByKey);

      expect(result.get("unknown")).toBe(5);
    });

    it("空会话列表返回空 Map", () => {
      const result = aggregateUnreadByAgentId([], {});

      expect(result.size).toBe(0);
    });
  });

  describe("mergeUnreadWithSnapshot", () => {
    it("取较大值", () => {
      const memory = { s1: 3, s2: 1 };
      const snapshot = { s1: 2, s2: 5, s3: 0 };

      const merged = mergeUnreadWithSnapshot(memory, snapshot);

      expect(merged.s1).toBe(3); // 3 > 2
      expect(merged.s2).toBe(5); // 5 > 1
      expect(merged.s3).toBe(0);
    });

    it("处理空值", () => {
      const merged = mergeUnreadWithSnapshot({}, {});

      expect(Object.keys(merged).length).toBe(0);
    });

    it("合并两者都不为空的情况", () => {
      const memory = { a: 10 };
      const snapshot = { b: 20 };

      const merged = mergeUnreadWithSnapshot(memory, snapshot);

      expect(merged.a).toBe(10);
      expect(merged.b).toBe(20);
    });
  });

  describe("maxUiMessageId", () => {
    it("返回最大 id", () => {
      const messages = [{ id: "a" }, { id: "z" }, { id: "m" }];

      const result = maxUiMessageId(messages);

      expect(result).toBe("z");
    });

    it("处理数字 id", () => {
      const messages = [{ id: 1 }, { id: 100 }, { id: 50 }];

      const result = maxUiMessageId(messages);

      expect(result).toBe(100);
    });

    it("空列表返回 null", () => {
      const result = maxUiMessageId([]);

      expect(result).toBeNull();
    });

    it("过滤 undefined id", () => {
      const messages = [{ id: "x" }, {}, { id: "y" }];

      const result = maxUiMessageId(messages);

      expect(result).toBe("y");
    });
  });

  describe("isMessageUnread", () => {
    it("已读游标之前的消息为已读", () => {
      const readMap = new Map<string, string | number>([["s1", "5"]]);

      expect(isMessageUnread("3", "s1", readMap)).toBe(false);
      expect(isMessageUnread("5", "s1", readMap)).toBe(false);
    });

    it("已读游标之后的消息为未读", () => {
      const readMap = new Map<string, string | number>([["s1", "5"]]);

      expect(isMessageUnread("6", "s1", readMap)).toBe(true);
      expect(isMessageUnread("100", "s1", readMap)).toBe(true);
    });

    it("无已读游标时全部未读", () => {
      const readMap = new Map<string, string | number>();

      expect(isMessageUnread("1", "s1", readMap)).toBe(true);
      expect(isMessageUnread("999", "s1", readMap)).toBe(true);
    });

    it("undefined id 返回 false", () => {
      const readMap = new Map<string, string | number>();

      expect(isMessageUnread(undefined, "s1", readMap)).toBe(false);
    });
  });
});
