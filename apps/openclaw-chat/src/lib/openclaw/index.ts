/**
 * OpenClaw gateway client library.
 */

// Config
export { getGatewayConfig, normalizeHttpBase, isLocalhostUrl, listAgentsFromOpenClawJson } from "./config";
export type { GatewayAuthConfig, AgentInfo } from "./config";

// Client
export { OpenClawClient, setApprovalBridgeBroadcaster } from "./client";
export type {
  OpenClawClientEvents,
  ChatDeltaEvent,
  ChatFinalEvent,
  ChatErrorEvent,
  ApprovalBridgeEvent,
} from "./client";
export type { OpenClawClientMethods } from "./types";

// Pool
export { getOpenClawClient, clearOpenClawClient } from "./pool";

// Singleton guard
export { shouldReplaceOpenClawClientSingleton } from "./singleton-guard";

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
} from "./types";

// Text extraction
export { extractAssistantTextFromGatewayMessage } from "./text-extraction";
