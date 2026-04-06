/**
 * Connection pool for OpenClawClient.
 * Uses globalThis singleton to maintain a single connection across requests.
 */

import { getGatewayConfig } from "./config";
import { OpenClawClient } from "./client";
import {
  shouldReplaceOpenClawClientSingleton,
  type OpenClawClientMethods,
} from "./singleton-guard";

const DEFAULT_POOL_CONNECT_TIMEOUT_MS = 28_000;

declare global {
  var __openclawClientSingleton: OpenClawClient | undefined;
  var __openclawClientConnecting: Promise<void> | undefined;
}

/**
 * Get or create the singleton OpenClawClient instance.
 * Ensures only one connection exists at a time.
 */
export async function getOpenClawClient(): Promise<OpenClawClient> {
  // Check if existing client is still valid
  if (
    globalThis.__openclawClientSingleton &&
    globalThis.__openclawClientSingleton.connected
  ) {
    const client = globalThis.__openclawClientSingleton;
    if (!shouldReplaceOpenClawClientSingleton(client as unknown as OpenClawClientMethods)) {
      return client;
    }
    // Client is outdated - disconnect and replace
    console.warn(
      "[openclaw-pool] Existing client is outdated. Replacing singleton."
    );
    client.disconnect();
    globalThis.__openclawClientSingleton = undefined;
  }

  // If a connection is already in progress, wait for it
  if (globalThis.__openclawClientConnecting) {
    await globalThis.__openclawClientConnecting;
    if (globalThis.__openclawClientSingleton?.connected) {
      return globalThis.__openclawClientSingleton;
    }
  }

  // Create new connection
  const config = getGatewayConfig();
  const client = new OpenClawClient(config);

  // Set up disconnected handler to clear singleton
  client.on("disconnected", () => {
    if (globalThis.__openclawClientSingleton === client) {
      globalThis.__openclawClientSingleton = undefined;
    }
    globalThis.__openclawClientConnecting = undefined;
  });

  // Connect with timeout
  const connectTimeoutMs =
    parseInt(process.env.OPENCLAW_POOL_CONNECT_TIMEOUT_MS ?? "", 10) ||
    DEFAULT_POOL_CONNECT_TIMEOUT_MS;

  globalThis.__openclawClientConnecting = (async () => {
    try {
      await client.connect();
    } catch (err) {
      client.disconnect();
      globalThis.__openclawClientSingleton = undefined;
      globalThis.__openclawClientConnecting = undefined;
      throw err;
    }
    globalThis.__openclawClientConnecting = undefined;
  })();

  // Apply connect timeout
  const connectPromise = globalThis.__openclawClientConnecting;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Connection to gateway timed out after ${connectTimeoutMs}ms. ` +
            "Make sure OpenClaw gateway is running on the configured port."
        )
      );
    }, connectTimeoutMs);
  });

  try {
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err) {
    client.disconnect();
    globalThis.__openclawClientSingleton = undefined;
    throw err;
  }

  globalThis.__openclawClientSingleton = client;
  return client;
}

/**
 * Force disconnect and clear the singleton.
 * Useful for reconnecting after a gateway restart.
 */
export function clearOpenClawClient(): void {
  if (globalThis.__openclawClientSingleton) {
    globalThis.__openclawClientSingleton.disconnect();
    globalThis.__openclawClientSingleton = undefined;
  }
  globalThis.__openclawClientConnecting = undefined;
}
