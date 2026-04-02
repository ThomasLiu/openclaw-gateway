/**
 * Composer draft persistence by agent/session key.
 * Uses localStorage to survive navigation without losing drafts.
 */
const STORAGE_KEY_PREFIX = "openclaw-chat.draft.v1";

function storageKey(agentId: string, sessionKey?: string): string {
  return `${STORAGE_KEY_PREFIX}:${agentId}:${sessionKey ?? "default"}`;
}

export const composerDraftStorage = {
  get(agentId: string, sessionKey?: string): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(storageKey(agentId, sessionKey)) ?? "";
  },
  set(agentId: string, sessionKey: string | undefined, value: string): void {
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(storageKey(agentId, sessionKey), value);
    } else {
      localStorage.removeItem(storageKey(agentId, sessionKey));
    }
  },
  clear(agentId: string, sessionKey?: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey(agentId, sessionKey));
  },
};
