/**
 * exec-approval-bridge.ts
 * 执行审批事件桥接库
 *
 * 浏览器无法直接连接网关 WS，所有审批事件通过 SSE 桥接：
 * - subscribeExecApprovalBridge() 订阅审批事件
 * - broadcastExecApprovalBridge() 网关事件到达时广播给订阅者
 *
 * 支持多订阅者（同一事件可被多个消费者消费）
 */

import "server-only";

export type ApprovalEvent =
  | {
      event: "exec.approval.requested";
      payload: {
        id: string;
        request: ExecApprovalRequestPayload;
        createdAtMs: number;
        expiresAtMs: number;
      };
    }
  | {
      event: "exec.approval.resolved";
      payload: {
        id: string;
        decision: string;
        resolvedBy?: string;
        ts: number;
        request?: ExecApprovalRequestPayload;
      };
    }
  | {
      event: "plugin.approval.requested";
      payload: {
        id: string;
        request: PluginApprovalRequestPayload;
        createdAtMs: number;
        expiresAtMs: number;
      };
    }
  | {
      event: "plugin.approval.resolved";
      payload: {
        id: string;
        decision: string;
        resolvedBy?: string;
        ts: number;
        request?: PluginApprovalRequestPayload;
      };
    };

/** exec.approval.requested 事件的有效载荷 */
export interface ExecApprovalRequestPayload {
  command: string;
  commandPreview?: string;
  commandArgv?: string[];
  cwd?: string | null;
  envKeys?: string[];
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  agentId?: string | null;
  resolvedPath?: string | null;
  sessionKey?: string | null;
  turnSourceChannel?: string | null;
  turnSourceTo?: string | null;
  turnSourceAccountId?: string | null;
  turnSourceThreadId?: string | number | null;
  nodeId?: string | null;
  allowedDecisions?: string[];
}

/** plugin.approval.requested 事件的有效载荷 */
export interface PluginApprovalRequestPayload {
  pluginId?: string | null;
  title: string;
  description: string;
  severity?: string | null;
  toolName?: string | null;
  toolCallId?: string | null;
  agentId?: string | null;
  sessionKey?: string | null;
  turnSourceChannel?: string | null;
  turnSourceTo?: string | null;
  turnSourceAccountId?: string | null;
  turnSourceThreadId?: string | number | null;
  timeoutMs?: number;
}

type BridgeListener = (event: ApprovalEvent) => void;

const listeners = new Set<BridgeListener>();

/**
 * 订阅审批事件
 * @returns 取消订阅函数
 */
export function subscribeExecApprovalBridge(listener: BridgeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 广播审批事件给所有订阅者
 */
export function broadcastExecApprovalBridge(event: ApprovalEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // 单个 listener 错误不影响其他订阅者
    }
  }
}

/** 获取当前订阅者数量（用于调试） */
export function getApprovalBridgeListenerCount(): number {
  return listeners.size;
}
