/**
 * Singleton guard: checks if the OpenClawClient instance has all required methods.
 * If the client is missing methods (e.g., added in a newer gateway version),
 * the singleton should be replaced.
 */

// Types are re-exported below; imports are for documentation only in this module.

export type {
  OpenClawClientMethods,
  ListSessionsOpts,
  SessionsListResult,
  SessionInfo,
  ModelInfo,
  CronJob,
  SkillStatus,
  GatewayMessage,
  GatewayMessageContent,
} from "./types.js";

/** Required method names that must exist on any OpenClawClient instance */
const REQUIRED_METHODS = [
  "connected",
  "connect",
  "disconnect",
  "request",
  "sendChatMessageStreaming",
  "abortChat",
  "fetchChatHistory",
  "listSessions",
  "sessionsCreate",
  "sessionsDelete",
  "sessionsPatch",
  "configGet",
  "configPatch",
  "modelsList",
  "cronList",
  "cronUpdate",
  "cronRemove",
  "skillsStatus",
  "skillsInstall",
  "fetchChatMessageHistory",
] as const;

/**
 * Check if the given client has all required methods.
 * Returns true if the client is up-to-date; false if it should be replaced.
 */
export function shouldReplaceOpenClawClientSingleton(
  client: unknown
): boolean {
  if (!client || typeof client !== "object") return true;

  const obj = client as Record<string, unknown>;

  for (const method of REQUIRED_METHODS) {
    if (typeof obj[method] !== "function") {
      console.error(
        `[openclaw-client] Client is missing method "${method}". ` +
          "Gateway protocol may have updated. Please restart the process."
      );
      return true;
    }
  }

  return false;
}
