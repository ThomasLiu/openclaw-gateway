import { describe, it, expect } from "vitest";
import { extractToolCards } from "./client";

describe("extractToolCards", () => {
  it("extracts tool_use blocks", () => {
    const msg = {
      content: [
        { type: "tool_use", id: "call_1", name: "bash", input: { cmd: "ls" } },
      ],
    };
    const cards = extractToolCards(msg);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("bash");
    expect(cards[0].input).toEqual({ cmd: "ls" });
    expect(cards[0].status).toBe("success");
  });

  it("extracts tool_call blocks", () => {
    const msg = {
      content: [
        { type: "tool_call", id: "call_2", name: "read_file", input: { path: "/tmp" } },
      ],
    };
    const cards = extractToolCards(msg);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("read_file");
  });

  it("returns empty array for no tool blocks", () => {
    const msg = { content: [{ type: "text", text: "Hello" }] };
    expect(extractToolCards(msg)).toHaveLength(0);
  });

  it("handles null/undefined", () => {
    expect(extractToolCards(null)).toHaveLength(0);
    expect(extractToolCards(undefined)).toHaveLength(0);
  });
});
