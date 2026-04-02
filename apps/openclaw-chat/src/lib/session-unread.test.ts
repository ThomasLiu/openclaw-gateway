import { describe, it, expect } from "vitest";
import { computeSessionUnreadByKey, maxUiMessageId } from "./session-unread";

describe("computeSessionUnreadByKey", () => {
  it("returns empty object for empty messages", () => {
    expect(computeSessionUnreadByKey([], {})).toEqual({});
  });
});

describe("maxUiMessageId", () => {
  it("returns 0 for empty array", () => {
    expect(maxUiMessageId([])).toBe(0);
  });

  it("returns max numeric id", () => {
    const msgs = [
      { id: "user-5" },
      { id: "user-100" },
      { id: "assistant-50" },
    ];
    expect(maxUiMessageId(msgs)).toBe(100);
  });

  it("returns 0 when no numeric ids", () => {
    expect(maxUiMessageId([{ id: "abc" }])).toBe(0);
  });
});
