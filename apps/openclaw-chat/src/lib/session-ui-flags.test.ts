/**
 * session-ui-flags.test.ts
 * 会话 UI 状态标志测试
 */

import { describe, it, expect } from "vitest";
import {
  computeSessionNeedsContinue,
  extractAgentIdFromSession,
  computeSessionActiveState,
  shouldShowUnreadBadge,
  type SessionInfo,
} from "./session-ui-flags";

describe("session-ui-flags", () => {
  describe("computeSessionNeedsContinue", () => {
    it("有 error 时需要 Continue", () => {
      const session: SessionInfo = {
        key: "s1",
        error: "Gateway timeout",
      };

      expect(computeSessionNeedsContinue(session)).toBe(true);
    });

    it("5 分钟前有最后消息的 idle 会话需要 Continue", () => {
      const fiveMinAgo = new Date(Date.now() - 6 * 60_000).toISOString();
      const session: SessionInfo = {
        key: "s1",
        updatedAt: fiveMinAgo,
        lastMessage: "Here is my response.",
      };

      // 5 分钟前无更新且有最后消息 → 需要 Continue
      expect(computeSessionNeedsContinue(session)).toBe(true);
    });

    it("thinking 状态不需要 Continue", () => {
      const session: SessionInfo = {
        key: "s1",
        thinking: true,
      };

      expect(computeSessionNeedsContinue(session)).toBe(false);
    });

    it("streaming 状态不需要 Continue", () => {
      const session: SessionInfo = {
        key: "s1",
        streaming: true,
      };

      expect(computeSessionNeedsContinue(session)).toBe(false);
    });
  });

  describe("extractAgentIdFromSession", () => {
    it("从 agentId 字段提取", () => {
      const session: SessionInfo = { key: "s1", agentId: "my-agent" };

      expect(extractAgentIdFromSession(session)).toBe("my-agent");
    });

    it("从 sessionKey 提取（格式 agent:<id>:chat:...）", () => {
      const session: SessionInfo = {
        key: "agent:architect:chat:abc",
      };

      expect(extractAgentIdFromSession(session)).toBe("architect");
    });

    it("无 agentId 且无法解析时返回 unknown", () => {
      const session: SessionInfo = { key: "plain-key" };

      expect(extractAgentIdFromSession(session)).toBe("unknown");
    });
  });

  describe("computeSessionActiveState", () => {
    it("error 状态", () => {
      const session: SessionInfo = { key: "s1", error: "oops" };

      expect(computeSessionActiveState(session)).toBe("error");
    });

    it("thinking 状态", () => {
      const session: SessionInfo = { key: "s1", thinking: true };

      expect(computeSessionActiveState(session)).toBe("thinking");
    });

    it("streaming 状态", () => {
      const session: SessionInfo = { key: "s1", streaming: true };

      expect(computeSessionActiveState(session)).toBe("active");
    });

    it("1 分钟内有更新的为 active", () => {
      const recent = new Date(Date.now() - 30_000).toISOString();
      const session: SessionInfo = {
        key: "s1",
        updatedAt: recent,
      };

      expect(computeSessionActiveState(session)).toBe("active");
    });

    it("无更新的为 idle", () => {
      const old = new Date(Date.now() - 5 * 60_000).toISOString();
      const session: SessionInfo = {
        key: "s1",
        updatedAt: old,
      };

      expect(computeSessionActiveState(session)).toBe("idle");
    });
  });

  describe("shouldShowUnreadBadge", () => {
    it("无未读不显示", () => {
      const session: SessionInfo = { key: "s1" };

      expect(shouldShowUnreadBadge(session, 0)).toBe(false);
    });

    it("idle 状态且有未读时显示", () => {
      const old = new Date(Date.now() - 5 * 60_000).toISOString();
      const session: SessionInfo = {
        key: "s1",
        updatedAt: old,
      };

      expect(shouldShowUnreadBadge(session, 3)).toBe(true);
    });

    it("active 状态不显示（会话在前台）", () => {
      const session: SessionInfo = {
        key: "s1",
        streaming: true,
      };

      expect(shouldShowUnreadBadge(session, 5)).toBe(false);
    });

    it("thinking 状态不显示", () => {
      const session: SessionInfo = {
        key: "s1",
        thinking: true,
      };

      expect(shouldShowUnreadBadge(session, 1)).toBe(false);
    });
  });
});
