/**
 * Tests for the OpenClaw gateway client.
 * Integration tests require the OpenClaw gateway to be running on port 18789.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { OpenClawClient } from "./client";
import { getGatewayConfig } from "./config";

describe("OpenClawClient", () => {
  describe("getGatewayConfig", () => {
    it("should read from OPENCLAW_GATEWAY_URL env var", () => {
      const original = process.env.OPENCLAW_GATEWAY_URL;
      process.env.OPENCLAW_GATEWAY_URL = "http://127.0.0.1:18789";
      try {
        const config = getGatewayConfig();
        expect(config.gatewayUrl).toBe("http://127.0.0.1:18789");
      } finally {
        if (original !== undefined) {
          process.env.OPENCLAW_GATEWAY_URL = original;
        } else {
          delete process.env.OPENCLAW_GATEWAY_URL;
        }
      }
    });

    it("should read token from openclaw.json when URL is in env", () => {
      const originalUrl = process.env.OPENCLAW_GATEWAY_URL;
      const originalToken = process.env.OPENCLAW_TOKEN;
      try {
        process.env.OPENCLAW_GATEWAY_URL = "http://127.0.0.1:18789";
        delete process.env.OPENCLAW_TOKEN;
        const config = getGatewayConfig();
        // Token should be read from ~/.openclaw/openclaw.json
        expect(config.token).toBeDefined();
        expect(config.token!.length).toBeGreaterThan(0);
      } finally {
        if (originalUrl !== undefined) process.env.OPENCLAW_GATEWAY_URL = originalUrl;
        else delete process.env.OPENCLAW_GATEWAY_URL;
        if (originalToken !== undefined) process.env.OPENCLAW_TOKEN = originalToken;
        else delete process.env.OPENCLAW_TOKEN;
      }
    });
  });

  // Integration tests - require gateway to be running
  describe("WebSocket connection (integration)", () => {
    let client: OpenClawClient;

    beforeAll(async () => {
      // Use a short handshake timeout for testing
      process.env.OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS = "8000";
      const config = getGatewayConfig();
      client = new OpenClawClient(config);
      // connect() has its own internal handshake timeout
      await client.connect();
    }, 30_000);

    afterAll(() => {
      client.disconnect();
    });

    it("should connect to the gateway", () => {
      expect(client.connected).toBe(true);
    });

    it("should send chat.send request and receive response", async () => {
      const result = await client.sendChatMessageStreaming("agent:main:chat:test-session", "hello");
      expect(result).toHaveProperty("runId");
      expect(typeof result.runId).toBe("string");
    });

    it("should list sessions", async () => {
      const result = await client.listSessions({ limit: 10 });
      expect(result).toHaveProperty("sessions");
      expect(Array.isArray(result.sessions)).toBe(true);
    });

    it("should get config", async () => {
      const result = await client.configGet();
      expect(result).toBeDefined();
    });

    it("should list models", async () => {
      const result = await client.modelsList();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
