/**
 * OpenClaw gateway client library.
 */

// Config
export { getGatewayConfig, normalizeHttpBase, isLocalhostUrl, listAgentsFromOpenClawJson } from "./config.js";
export type { GatewayAuthConfig, AgentInfo } from "./config.js";

// Client
export { OpenClawClient } from "./client.js";
export type {
  OpenClawClientEvents,
  ChatDeltaEvent,
  ChatFinalEvent,
  ChatErrorEvent,
} from "./client.js";
export type { OpenClawClientMethods } from "./types.js";

// Pool
export { getOpenClawClient, clearOpenClawClient } from "./pool.js";

// Singleton guard
export { shouldReplaceOpenClawClientSingleton } from "./singleton-guard.js";

// Types (re-exported from types.ts)
export type {
  ListSessionsOpts,
  SessionsListResult,
  SessionInfo,
  ModelInfo,
  CronJob,
  SkillStatus,
  GatewayMessage,
  GatewayMessageContent,
} from "./types.js";

// Text extraction
export { extractAssistantTextFromGatewayMessage } from "./text-extraction.js";
