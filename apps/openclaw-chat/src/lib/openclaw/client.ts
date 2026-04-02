/**
 * OpenClawClient — WebSocket JSON-RPC client for the OpenClaw gateway.
 *
 * Transport layers:
 *  - Browser → Next.js: HTTP/SSE (SSE for streaming, fetch for everything else)
 *  - Next.js (Node) → OpenClaw gateway: WebSocket JSON-RPC
 *
 * This client lives on the server side only (via getOpenClawClient() singleton pool).
 */
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { GatewayAuthConfig } from '@/components/chat-types';

export interface ChatDeltaPayload {
  state: 'delta' | 'final' | 'error';
  sessionKey: string;
  runId?: string;
  message?: unknown;
  error?: string;
}

interface GatewayRequest {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

interface GatewayResponse {
  type: 'res';
  id: string;
  ok?: boolean;
  payload?: unknown;
  error?: string;
}

interface GatewayEvent {
  type: 'event';
  event: string;
  payload?: unknown;
  data?: unknown;
}

type IncomingMessage = GatewayRequest | GatewayResponse | GatewayEvent;

// ─── Text extraction ────────────────────────────────────────────────────────

/**
 * Extract assistant plain text from a gateway message payload.
 * Avoids relying solely on content[0].text which can be empty on final messages.
 */
export function extractAssistantTextFromGatewayMessage(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const msg = message as Record<string, unknown>;

  // Try content array first
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string' && b.text.length > 0) {
          return b.text;
        }
        if (b.type === 'output' && typeof b.text === 'string' && b.text.length > 0) {
          return b.text;
        }
      }
    }
  }

  // Fallback: text field at top level
  if (typeof msg.text === 'string') return msg.text;

  return '';
}

// ─── Tool cards ────────────────────────────────────────────────────────────

export interface ToolCardFromGateway {
  id: string;
  name: string;
  input: unknown;
  output?: string;
  status: 'pending' | 'success' | 'error';
}

export function extractToolCards(message: unknown): ToolCardFromGateway[] {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (!Array.isArray(content)) return [];

  const cards: ToolCardFromGateway[] = [];
  for (const block of content) {
    if (block && typeof block === 'object') {
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' || b.type === 'tool_call') {
        cards.push({
          id: String(b.id ?? uuidv4()),
          name: String(b.name ?? 'unknown'),
          input: b.input ?? {},
          output: typeof b.output === 'string' ? b.output : undefined,
          status: 'success',
        });
      }
    }
  }
  return cards;
}

// ─── Assistant meta ─────────────────────────────────────────────────────────

export interface AssistantMetaFromGateway {
  runId?: string;
  model?: string;
  modelProvider?: string;
  durationMs?: number;
}

export function extractAssistantMetaFromGatewayMessage(message: unknown): AssistantMetaFromGateway {
  if (!message || typeof message !== 'object') return {};
  const msg = message as Record<string, unknown>;
  return {
    runId: msg.runId ? String(msg.runId) : undefined,
    model: msg.model ? String(msg.model) : undefined,
    modelProvider: msg.modelProvider ? String(msg.modelProvider) : undefined,
    durationMs: typeof msg.durationMs === 'number' ? msg.durationMs : undefined,
  };
}

// ─── OpenClawClient ────────────────────────────────────────────────────────

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (v: unknown) => void;
      reject: (e: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private _connected = false;
  private config: GatewayAuthConfig;
  private handshakeTimeoutMs: number;
  private defaultRequestTimeoutMs = 60_000;

  constructor(config: GatewayAuthConfig) {
    super();
    this.config = config;
    this.handshakeTimeoutMs = Number(process.env.OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS ?? '25000');
  }

  get connected(): boolean {
    return this._connected;
  }

  // ─── connect ─────────────────────────────────────────────────────────────

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsBase = this.config.gatewayUrl.replace(/^http/, 'ws');
      const headers: Record<string, string> = {};
      // Local loopback origin workaround
      if (/localhost|127\.0\.0\.1/.test(this.config.gatewayUrl)) {
        headers['Origin'] = this.config.gatewayUrl;
      }

      const timeout = setTimeout(() => {
        this.ws?.terminate();
        reject(new Error('WebSocket handshake timed out'));
      }, this.handshakeTimeoutMs);

      this.ws = new WebSocket(`${wsBase}/ws`, { headers });

      this.ws.on('open', () => {
        // Wait for connect.challenge event
        const challengeHandler = (msg: IncomingMessage) => {
          if (msg.type === 'event' && (msg as GatewayEvent).event === 'connect.challenge') {
            this.off('message', challengeHandler);
            void this.sendConnectRequest()
              .then(() => {
                this._connected = true;
                this.emit('connected');
                clearTimeout(timeout);
                resolve();
              })
              .catch((err) => {
                clearTimeout(timeout);
                reject(err);
              });
          }
        };
        this.on('message', challengeHandler);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString()) as IncomingMessage;
          this.handleMessage(msg);
        } catch {
          // ignore parse errors
        }
      });

      this.ws.on('close', () => {
        this._connected = false;
        this.emit('disconnected');
        this.rejectAllPending(new Error('WebSocket closed'));
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private async sendConnectRequest(): Promise<void> {
    await this.request('connect', {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'openclaw-control-ui',
        version: 'clawui-backend',
        mode: 'webchat',
        platform: process.platform,
      },
      caps: [],
      auth: {
        token: this.config.token,
        password: this.config.password,
      },
      role: 'operator',
      scopes: ['operator.admin', 'operator.approvals', 'operator.write', 'operator.read'],
    });
  }

  // ─── disconnect ──────────────────────────────────────────────────────────

  disconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
    this._connected = false;
    this.rejectAllPending(new Error('Client disconnected'));
  }

  // ─── request / RPC ───────────────────────────────────────────────────────

  request<T = unknown>(method: string, params?: unknown, timeoutMs?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = uuidv4();
      const req: GatewayRequest = { type: 'req', id, method, params };
      this.ws.send(JSON.stringify(req));

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `Request ${method} timed out after ${timeoutMs ?? this.defaultRequestTimeoutMs}ms`
          )
        );
      }, timeoutMs ?? this.defaultRequestTimeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      });
    });
  }

  private handleMessage(msg: IncomingMessage): void {
    if (msg.type === 'res') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(msg.id);
        if (msg.ok) {
          pending.resolve(msg.payload);
        } else {
          pending.reject(new Error(msg.error ?? 'Unknown error'));
        }
      }
    } else if (msg.type === 'event') {
      const ev = msg as GatewayEvent;
      this.emit('message', ev);
      this.handleGatewayEvent(ev);
    }
  }

  private handleGatewayEvent(ev: GatewayEvent): void {
    // Chat streaming
    if (ev.event === 'chat.delta' || ev.event === 'chat.final' || ev.event === 'chat.error') {
      const payload = (ev.payload ?? ev.data) as ChatDeltaPayload;
      if (ev.event === 'chat.delta') this.emit('chat.delta', payload);
      else if (ev.event === 'chat.final') this.emit('chat.final', payload);
      else this.emit('chat.error', payload);
      return;
    }

    // Exec / plugin approvals
    if (
      ev.event === 'exec.approval.requested' ||
      ev.event === 'exec.approval.resolved' ||
      ev.event === 'plugin.approval.requested' ||
      ev.event === 'plugin.approval.resolved'
    ) {
      // Imported dynamically to avoid circular deps
      import('./exec-approval-bridge').then(({ broadcastExecApprovalBridge }) => {
        broadcastExecApprovalBridge({ event: ev.event, payload: ev.payload ?? ev.data });
      });
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(err);
    }
    this.pendingRequests.clear();
  }

  // ─── Convenience RPC wrappers ────────────────────────────────────────────

  async sendChatMessageStreaming(params: {
    sessionKey: string;
    text?: string;
    attachments?: unknown[];
  }): Promise<string> {
    const result = await this.request<{ runId: string }>('chat.send', params);
    return result.runId;
  }

  async abortChat(params: { sessionKey: string; runId?: string }): Promise<void> {
    await this.request('chat.abort', params);
  }

  async fetchChatHistory(params: { sessionKey: string; limit?: number }): Promise<unknown[]> {
    const result = await this.request<{ history: unknown[] }>('chat.history', params);
    return result.history ?? [];
  }

  async listSessions(params?: {
    limit?: number;
    includeGlobal?: boolean;
    includeUnknown?: boolean;
    includeDerivedTitles?: boolean;
    includeLastMessage?: boolean;
    activeMinutes?: number;
    search?: string;
    spawnedBy?: string;
    agentId?: string;
  }): Promise<unknown[]> {
    const result = await this.request<{ sessions: unknown[] }>('sessions.list', params ?? {});
    return result.sessions ?? [];
  }

  async sessionsPreview(params: { keys: string[] }): Promise<unknown[]> {
    const result = await this.request<{ previews: unknown[] }>('sessions.preview', params);
    return result.previews ?? [];
  }

  async sessionsCreate(params: { agentId: string; label?: string }): Promise<{ key: string }> {
    return this.request<{ key: string }>('sessions.create', params);
  }

  async sessionsDelete(params: { key: string }): Promise<void> {
    await this.request('sessions.delete', params);
  }

  async sessionsPatch(params: { key: string; model: string | null }): Promise<void> {
    await this.request('sessions.patch', params);
  }

  async modelsList(): Promise<unknown[]> {
    const result = await this.request<{ models: unknown[] }>('models.list', {});
    return result.models ?? [];
  }

  async configGet(): Promise<unknown> {
    return this.request('config.get', {});
  }

  async configPatch(params: { patch: unknown; baseHash: string }): Promise<void> {
    await this.request('config.patch', params);
  }

  async cronList(): Promise<unknown[]> {
    const result = await this.request<{ crons: unknown[] }>('cron.list', {});
    return result.crons ?? [];
  }

  async cronUpdate(params: unknown): Promise<void> {
    await this.request('cron.update', params);
  }

  async cronRemove(params: { id: string }): Promise<void> {
    await this.request('cron.remove', params);
  }

  async skillsStatus(params?: { agentId?: string }): Promise<unknown[]> {
    const result = await this.request<{ skills: unknown[] }>('skills.status', params ?? {});
    return result.skills ?? [];
  }

  async skillsInstall(params: { name: string; agentId?: string; scope?: string }): Promise<void> {
    await this.request('skills.install', params);
  }

  // ─── Approval resolvers ──────────────────────────────────────────────────

  async execApprovalResolve(params: { id: string; decision: string }): Promise<void> {
    await this.request('exec.approval.resolve', params);
  }

  async pluginApprovalResolve(params: { id: string; decision: string }): Promise<void> {
    await this.request('plugin.approval.resolve', params);
  }
}
