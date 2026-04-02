/**
 * OpenClawClient singleton pool.
 *
 * Uses globalThis to persist the singleton across Next.js HMR requests
 * within the same Node.js process.
 */
import type { OpenClawClient } from "./client";
import { getGatewayConfig } from "./config";

declare global {
  var __openclaw_client__: OpenClawClient | undefined;
}

const POOL_TIMEOUT_MS = Number(process.env.OPENCLAW_POOL_CONNECT_TIMEOUT_MS ?? "28000");

/**
 * Returns a singleton OpenClawClient, connecting if necessary.
 * Subsequent calls within the same process return the same instance.
 */
export async function getOpenClawClient(): Promise<OpenClawClient> {
  if (globalThis.__openclaw_client__?.connected) {
    return globalThis.__openclaw_client__;
  }

  const config = getGatewayConfig();
  const client = new (await import("./client")).OpenClawClient(config);

  globalThis.__openclaw_client__ = client;

  client.on("disconnected", () => {
    globalThis.__openclaw_client__ = undefined;
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.disconnect();
      globalThis.__openclaw_client__ = undefined;
      reject(new Error(`Connection to OpenClaw gateway timed out after ${POOL_TIMEOUT_MS}ms`));
    }, POOL_TIMEOUT_MS);

    client
      .connect()
      .then(() => {
        clearTimeout(timeout);

        // Version guard: if the client is missing expected methods, discard and throw
        if (!shouldReplaceOpenClawClientSingleton(client)) {
          resolve(client);
          return;
        }
        client.disconnect();
        globalThis.__openclaw_client__ = undefined;
        reject(
          new Error(
            "OpenClawClient version mismatch — restart the server process to pick up the updated client."
          )
        );
      })
      .catch((err) => {
        clearTimeout(timeout);
        globalThis.__openclaw_client__ = undefined;
        reject(err);
      });
  });
}

/**
 * Checks if the client has all expected methods.
 * If a method is missing, the singleton should be replaced.
 */
export function shouldReplaceOpenClawClientSingleton(client: OpenClawClient): boolean {
  const requiredMethods = [
    "configGet",
    "modelsList",
    "execApprovalResolve",
    "pluginApprovalResolve",
  ];
  for (const method of requiredMethods) {
    if (typeof (client as unknown as Record<string, unknown>)[method] !== "function") {
      return true;
    }
  }
  return false;
}
