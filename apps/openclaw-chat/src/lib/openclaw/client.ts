/**
 * OpenClawClient - WebSocket client for OpenClaw Gateway.
 *
 * Handles:
 * - WebSocket connection with JSON-RPC handshake
 * - Request/response with timeout
 * - Event forwarding (chat.delta, chat.final, chat.error, etc.)
 * - All gateway RPC methods
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { GatewayAuthConfig } from "./config";
import type {
  ListSessionsOpts,
  SessionsListResult,
  SessionInfo,
  ModelInfo,
  CronJob,
  SkillStatus,
  GatewayMessage,
  OpenClawClientMethods,
} from "./types";
import { extractAssistantTextFromGatewayMessage } from "./text-extraction";

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 25_000;

export type OpenClawClientEvents = {
  connected: [];
  disconnected: [Error | null];
  error: [Error];
  "chat.delta": [ChatDeltaEvent];
  "chat.final": [ChatFinalEvent];
  "chat.error": [ChatErrorEvent];
  "exec.approval.requested": [unknown];
  "exec.approval.resolved": [unknown];
  "plugin.approval.requested": [unknown];
  "plugin.approval.resolved": [unknown];
};

export type ChatDeltaEvent = {
  sessionKey: string;
  runId: string;
  text: string;
  state: "delta";
};

export type ChatFinalEvent = {
  sessionKey: string;
  runId: string;
  state: "final";
};

export type ChatErrorEvent = {
  sessionKey: string;
  runId: string;
  error: string;
  state: "error";
};

type OutgoingRequest = {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private _connected = false;
  private pendingRequests = new Map<string, OutgoingRequest>();
  private config: GatewayAuthConfig;
  private handshakeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  // Stored per-connect so handleMessage can call them
  private _pendingConnectResolve: ((v: void) => void) | null = null;
  private _pendingConnectReject: ((e: unknown) => void) | null = null;

  constructor(config: GatewayAuthConfig) {
    super();
    this.config = config;
  }

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Connect to the gateway and complete the JSON-RPC handshake.
   */
  async connect(): Promise<void> {
    if (this._connected) return;

    const wsUrl = this.config.gatewayUrl.replace(/^http/, "ws") + "/";
    const headers: Record<string, string> = {};

    // Set Origin header for localhost connections (gateway requirement)
    if (
      this.config.gatewayUrl.includes("localhost") ||
      this.config.gatewayUrl.includes("127.0.0.1")
    ) {
      headers["Origin"] = this.config.gatewayUrl;
    }

    return new Promise((resolve, reject) => {
      this.isIntentionallyClosed = false;

      try {
        this.ws = new WebSocket(wsUrl, { headers });
      } catch (err) {
        reject(err);
        return;
      }

      // Set up handshake timeout
      const handshakeTimeoutMs =
        parseInt(process.env.OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS ?? "", 10) ||
        DEFAULT_HANDSHAKE_TIMEOUT_MS;

      this.handshakeTimeout = setTimeout(() => {
        if (!this._connected) {
          this.ws?.close();
          reject(
            new Error(
              `WebSocket handshake timed out after ${handshakeTimeoutMs}ms`
            )
          );
        }
      }, handshakeTimeoutMs);

      this.ws.on("open", () => {
        // Wait for connect.challenge event
      });

      this.ws.on("message", async (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString()) as Record<string, unknown>;
          await this.handleMessage(msg);
        } catch (_err) {
          void _err; // Ignore malformed messages
        }
      });

      this.ws.on("close", (code, reason) => {
        if (this.handshakeTimeout) {
          clearTimeout(this.handshakeTimeout);
          this.handshakeTimeout = null;
        }

        const err = new Error(
          `WebSocket closed (code=${code}, reason=${reason.toString()})`
        );

        // Reject pending requests
        for (const req of this.pendingRequests.values()) {
          clearTimeout(req.timeout);
          req.reject(err);
        }
        this.pendingRequests.clear();

        this._connected = false;
        this.emit("disconnected", err);
      });

      this.ws.on("error", (err) => {
        this.emit("error", err);
      });

      // Store resolve/reject so handleMessage can call them
      this._pendingConnectResolve = (v: void) => {
        resolve(v);
      };
      this._pendingConnectReject = reject;
    });
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    const type = msg.type as string;

    if (type === "event") {
      const event = msg.event as string;
      const payload = msg.payload as Record<string, unknown> | undefined;

      if (event === "connect.challenge") {
        // Send connect request
        try {
          const result = await this.sendConnectRequest();
          if (result) {
            this._connected = true;
            if (this.handshakeTimeout) {
              clearTimeout(this.handshakeTimeout);
              this.handshakeTimeout = null;
            }
            this.emit("connected");
            this._pendingConnectResolve?.();
            this._pendingConnectResolve = null;
            this._pendingConnectReject = null;
          }
        } catch (err) {
          this._pendingConnectReject?.(err);
          this._pendingConnectReject = null;
          this._pendingConnectResolve = null;
          this.ws?.close();
        }
      } else if (event === "chat") {
        this.handleChatEvent(payload);
      } else if (
        event.startsWith("exec.approval.") ||
        event.startsWith("plugin.approval.")
      ) {
        this.emit(event, payload);
      }
    } else if (type === "res") {
      const id = msg.id as string;
      const req = this.pendingRequests.get(id);
      if (!req) return;

      clearTimeout(req.timeout);
      this.pendingRequests.delete(id);

      const ok = msg.ok as boolean;
      if (ok) {
        req.resolve(msg.payload);
      } else {
        const error = msg.error as Record<string, unknown> | undefined;
        req.reject(
          new Error(
            `Gateway error: ${error?.message ?? JSON.stringify(error)}`
          )
        );
      }
    }
  }

  private async sendConnectRequest(): Promise<boolean> {
    const result = await this.rawRequest("connect", {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "openclaw-control-ui",
        version: "clawui-backend",
        mode: "webchat",
        platform: process.platform,
      },
      caps: [],
      auth: {
        token: this.config.token,
        password: this.config.password,
      },
      role: "operator",
      scopes: [
        "operator.admin",
        "operator.approvals",
        "operator.write",
        "operator.read",
      ],
    });
    return result !== undefined && result !== null;
  }

  private handleChatEvent(payload: Record<string, unknown> | undefined) {
    if (!payload) return;

    const state = payload.state as string;
    const sessionKey = (payload.sessionKey as string) ?? "";
    const runId = (payload.runId as string) ?? "";
    const message = payload.message as GatewayMessage | undefined;

    if (state === "delta") {
      const text = extractAssistantTextFromGatewayMessage(message);
      this.emit("chat.delta", { sessionKey, runId, text, state } satisfies ChatDeltaEvent);
    } else if (state === "final") {
      this.emit("chat.final", { sessionKey, runId, state } satisfies ChatFinalEvent);
    } else if (state === "error") {
      const rawError = payload.error;
      let errorText = "Unknown error";
      if (typeof rawError === "string") {
        errorText = rawError;
      } else if (rawError && typeof rawError === "object") {
        const errObj = rawError as Record<string, unknown>;
        errorText = typeof errObj.message === "string" ? errObj.message : String(rawError);
      }
      this.emit("chat.error", { sessionKey, runId, error: errorText, state } satisfies ChatErrorEvent);
    }
  }

  /**
   * Send a JSON-RPC request and wait for response.
   */
  async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
  ): Promise<T> {
    if (!this.ws || !this._connected) {
      throw new Error("Not connected to gateway");
    }
    return this.rawRequest<T>(method, params, timeoutMs);
  }

  private rawRequest<T>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("WebSocket not initialized"));
        return;
      }

      const id = uuidv4();

      const req: OutgoingRequest = {
        id,
        method,
        params,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs),
      };

      this.pendingRequests.set(id, req);

      this.ws.send(
        JSON.stringify({ type: "req", id, method, params: params ?? {} })
      );
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.handshakeTimeout) {
      clearTimeout(this.handshakeTimeout);
      this.handshakeTimeout = null;
    }
    this.ws?.close();
    this._connected = false;
  }

  // ─── Chat Methods ───────────────────────────────────────────────────────────

  async sendChatMessageStreaming(
    sessionKey: string,
    message: string,
    agentId?: string
  ): Promise<{ runId: string }> {
    const params: Record<string, unknown> = {
      message,
    };

    // Normalize sessionKey: if not agent: prefix, add it
    let normalizedSessionKey = sessionKey;
    if (!sessionKey.startsWith("agent:")) {
      normalizedSessionKey = agentId
        ? `agent:${agentId}:chat:${sessionKey}`
        : `agent:main:chat:${sessionKey}`;
    }

    params.sessionKey = normalizedSessionKey;
    params.idempotencyKey = uuidv4();

    // Only send agentId when sessionKey doesn't already have an agent: prefix.
    // The gateway extracts agent ID from the sessionKey when prefixed with "agent:".
    if (agentId && !normalizedSessionKey.startsWith("agent:")) {
      params.agentId = agentId;
    }

    const result = (await this.request<{ runId: string }>(
      "chat.send",
      params
    )) as { runId: string };
    return { runId: result.runId };
  }

  async abortChat(sessionKey: string, runId?: string): Promise<void> {
    const params: Record<string, unknown> = { sessionKey };
    if (runId) {
      params.runId = runId;
    }
    await this.request("chat.abort", params);
  }

  async fetchChatHistory(
    sessionKey: string,
    limit = 50
  ): Promise<GatewayMessage[]> {
    const result = (await this.request<{ messages: GatewayMessage[] }>(
      "chat.history",
      { sessionKey, limit }
    )) as { messages: GatewayMessage[] };
    return result.messages;
  }

  async fetchChatMessageHistory(
    sessionKey: string,
    limit?: number
  ): Promise<GatewayMessage[]> {
    return this.fetchChatHistory(sessionKey, limit);
  }

  // ─── Sessions Methods ────────────────────────────────────────────────────────

  async listSessions(opts?: ListSessionsOpts): Promise<SessionsListResult> {
    const params: Record<string, unknown> = {};
    if (opts?.includeGlobal !== undefined)
      params.includeGlobal = opts.includeGlobal;
    if (opts?.includeUnknown !== undefined)
      params.includeUnknown = opts.includeUnknown;
    if (opts?.includeDerivedTitles !== undefined)
      params.includeDerivedTitles = opts.includeDerivedTitles;
    if (opts?.includeLastMessage !== undefined)
      params.includeLastMessage = opts.includeLastMessage;
    if (opts?.limit !== undefined) params.limit = opts.limit;
    if (opts?.agentId !== undefined) params.agentId = opts.agentId;
    if (opts?.activeMinutes !== undefined) params.activeMinutes = opts.activeMinutes;
    if (opts?.search !== undefined) params.search = opts.search;
    if (opts?.spawnedBy !== undefined) params.spawnedBy = opts.spawnedBy;

    return (await this.request<SessionsListResult>(
      "sessions.list",
      params
    )) as SessionsListResult;
  }

  async sessionsCreate(agentId: string, label?: string): Promise<SessionInfo> {
    const params: Record<string, unknown> = { agentId };
    if (label) params.label = label;
    return (await this.request<SessionInfo>(
      "sessions.create",
      params
    )) as SessionInfo;
  }

  async sessionsDelete(key: string): Promise<void> {
    await this.request("sessions.delete", { key });
  }

  async sessionsPatch(
    key: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    await this.request("sessions.patch", { key, ...patch });
  }

  // ─── Config & Models Methods ─────────────────────────────────────────────────

  async configGet(): Promise<Record<string, unknown>> {
    return (await this.request<Record<string, unknown>>("config.get")) as Record<
      string,
      unknown
    >;
  }

  async configPatch(
    patch: Record<string, unknown>,
    baseHash: string
  ): Promise<void> {
    await this.request("config.patch", { ...patch, baseHash });
  }

  async modelsList(): Promise<ModelInfo[]> {
    const result = (await this.request<{ models: ModelInfo[] }>(
      "models.list"
    )) as { models: ModelInfo[] };
    return result.models;
  }

  // ─── Cron Methods ───────────────────────────────────────────────────────────

  async cronList(): Promise<CronJob[]> {
    const result = (await this.request<{ jobs: CronJob[] }>("cron.list")) as {
      jobs: CronJob[];
    };
    return result.jobs;
  }

  async cronUpdate(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.request("cron.update", { id, ...patch });
  }

  async cronRemove(id: string): Promise<void> {
    await this.request("cron.remove", { id });
  }

  // ─── Skills Methods ─────────────────────────────────────────────────────────

  async skillsStatus(): Promise<SkillStatus[]> {
    const result = (await this.request<{ skills: SkillStatus[] }>(
      "skills.status"
    )) as { skills: SkillStatus[] };
    return result.skills;
  }

  async skillsInstall(skillId: string): Promise<void> {
    await this.request("skills.install", { skillId });
  }

  // ─── Logs Methods ─────────────────────────────────────────────────────────

  /**
   * Tail gateway logs.
   * @param opts.cursor - Byte offset to resume from
   * @param opts.limit - Max number of lines (default 100)
   * @param opts.maxBytes - Max bytes to read (default 64KB)
   */
  async logsTail(opts?: {
    cursor?: number;
    limit?: number;
    maxBytes?: number;
  }): Promise<{ entries: LogEntry[]; cursor: number }> {
    const params: Record<string, unknown> = {};
    if (opts?.cursor !== undefined) params.cursor = opts.cursor;
    if (opts?.limit !== undefined) params.limit = opts.limit;
    if (opts?.maxBytes !== undefined) params.maxBytes = opts.maxBytes;
    return (await this.request<{ entries: LogEntry[]; cursor: number }>(
      "logs.tail",
      params
    )) as { entries: LogEntry[]; cursor: number };
  }
}

export type { OpenClawClientMethods };

export type LogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};
