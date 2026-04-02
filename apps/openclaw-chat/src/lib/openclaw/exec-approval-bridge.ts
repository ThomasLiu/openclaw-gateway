/**
 * In-process event bridge for exec/plugin approval events.
 *
 * The OpenClawClient (server-side WS) receives gateway events
 * and forwards them here. The SSE route subscribes to consume them.
 */
type ApprovalBridgeListener = (data: { event: string; payload: unknown }) => void;

const listeners = new Set<ApprovalBridgeListener>();

export function subscribeExecApprovalBridge(listener: ApprovalBridgeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcastExecApprovalBridge(data: { event: string; payload: unknown }): void {
  for (const listener of listeners) {
    try {
      listener(data);
    } catch {
      // ignore listener errors
    }
  }
}
