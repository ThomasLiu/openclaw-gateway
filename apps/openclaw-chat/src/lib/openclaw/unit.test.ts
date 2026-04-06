/**
 * Simple debug test to verify the OpenClawClient code structure.
 */

import { describe, it, expect } from "vitest";
import { normalizeHttpBase } from "./config";

describe("normalizeHttpBase", () => {
  it("should convert ws:// to http://", () => {
    expect(normalizeHttpBase("ws://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  });

  it("should convert wss:// to https://", () => {
    expect(normalizeHttpBase("wss://example.com:8080")).toBe("https://example.com:8080");
  });

  it("should leave http:// unchanged", () => {
    expect(normalizeHttpBase("http://127.0.0.1:18789")).toBe("http://127.0.0.1:18789");
  });

  it("should leave https:// unchanged", () => {
    expect(normalizeHttpBase("https://example.com:443")).toBe("https://example.com:443");
  });
});

describe("OpenClawClient structure", () => {
  it("should have all required methods defined", async () => {
    // Dynamic import to avoid vitest from trying to load ws in non-node env
    const { OpenClawClient } = await import("./client");

    // Check class methods exist by creating instance
    const client = new OpenClawClient({ gatewayUrl: "http://127.0.0.1:18789" });

    expect(typeof client.connect).toBe("function");
    expect(typeof client.disconnect).toBe("function");
    expect(typeof client.request).toBe("function");
    expect(typeof client.sendChatMessageStreaming).toBe("function");
    expect(typeof client.abortChat).toBe("function");
    expect(typeof client.fetchChatHistory).toBe("function");
    expect(typeof client.listSessions).toBe("function");
    expect(typeof client.sessionsCreate).toBe("function");
    expect(typeof client.sessionsDelete).toBe("function");
    expect(typeof client.sessionsPatch).toBe("function");
    expect(typeof client.configGet).toBe("function");
    expect(typeof client.configPatch).toBe("function");
    expect(typeof client.modelsList).toBe("function");
    expect(typeof client.cronList).toBe("function");
    expect(typeof client.cronUpdate).toBe("function");
    expect(typeof client.cronRemove).toBe("function");
    expect(typeof client.skillsStatus).toBe("function");
    expect(typeof client.skillsInstall).toBe("function");
    expect(typeof client.fetchChatMessageHistory).toBe("function");
    expect(typeof client.on).toBe("function");
    expect(typeof client.off).toBe("function");
    expect(client.connected).toBe(false);
  });
});
