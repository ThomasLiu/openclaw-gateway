"use client";

/**
 * ExecApprovalOverlay.tsx
 * 审批弹窗组件
 *
 * 挂在 ChatApp 根节点，z-index: 340（高于顶栏 z-200）
 * EventSource 订阅 /api/gateway/exec-approvals/stream
 * 维护 FIFO 审批队列，支持 Allow once / Always allow / Deny
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  kind: "exec" | "plugin";
  title: string;
  description: string;
  command?: string;
  expiresAtMs: number;
  createdAtMs: number;
}

interface PendingApproval {
  request: ApprovalRequest;
  expiresTimer: ReturnType<typeof setTimeout> | null;
}

// ─── 解析函数 ────────────────────────────────────────────────────────────────

function parseExecApprovalRequested(
  payload: Record<string, unknown>
): ApprovalRequest | null {
  const p = payload as {
    id?: string;
    request?: {
      command?: string;
      ask?: string | null;
      host?: string | null;
      agentId?: string | null;
    };
    expiresAtMs?: number;
    createdAtMs?: number;
  };

  if (!p.id || !p.request) return null;

  return {
    id: p.id,
    kind: "exec",
    title: p.request.ask ?? p.request.command ?? "Shell 命令执行",
    description: buildDescription(p.request),
    command: p.request.command,
    expiresAtMs: p.expiresAtMs ?? Date.now() + 60_000,
    createdAtMs: p.createdAtMs ?? Date.now(),
  };
}

function parsePluginApprovalRequested(
  payload: Record<string, unknown>
): ApprovalRequest | null {
  const p = payload as {
    id?: string;
    request?: {
      title?: string;
      description?: string;
      pluginId?: string | null;
      toolName?: string | null;
    };
    expiresAtMs?: number;
    createdAtMs?: number;
  };

  if (!p.id || !p.request) return null;

  return {
    id: p.id,
    kind: "plugin",
    title: p.request.title ?? "插件操作",
    description: p.request.description ?? "",
    command: p.request.toolName ?? p.request.pluginId ?? undefined,
    expiresAtMs: p.expiresAtMs ?? Date.now() + 60_000,
    createdAtMs: p.createdAtMs ?? Date.now(),
  };
}

function buildDescription(request: {
  command?: string;
  host?: string | null;
  agentId?: string | null;
}): string {
  const parts: string[] = [];
  if (request.host) parts.push(`主机: ${request.host}`);
  if (request.agentId) parts.push(`Agent: ${request.agentId}`);
  return parts.join(" · ");
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export default function ExecApprovalOverlay() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const dismissApproval = useCallback((id: string) => {
    setPendingApprovals((prev) => {
      const target = prev.find((a) => a.request.id === id);
      if (target?.expiresTimer) {
        clearTimeout(target.expiresTimer);
        timersRef.current.delete(target.expiresTimer);
      }
      return prev.filter((a) => a.request.id !== id);
    });
  }, []);

  // EventSource 订阅
  useEffect(() => {
    const es = new EventSource("/api/gateway/exec-approvals/stream");
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "hello") return;

        if (msg.type === "gateway") {
          const { event, payload } = msg as {
            event: string;
            payload: Record<string, unknown>;
          };

          if (event === "exec.approval.requested") {
            const request = parseExecApprovalRequested(payload);
            if (request) {
              const expiresAt = request.expiresAtMs - Date.now();
              const timer =
                expiresAt > 0
                  ? setTimeout(() => dismissApproval(request.id), expiresAt)
                  : null;
              if (timer) timersRef.current.add(timer);
              setPendingApprovals((prev) => [
                ...prev,
                { request, expiresTimer: timer },
              ]);
            }
          } else if (event === "plugin.approval.requested") {
            const request = parsePluginApprovalRequested(payload);
            if (request) {
              const expiresAt = request.expiresAtMs - Date.now();
              const timer =
                expiresAt > 0
                  ? setTimeout(() => dismissApproval(request.id), expiresAt)
                  : null;
              if (timer) timersRef.current.add(timer);
              setPendingApprovals((prev) => [
                ...prev,
                { request, expiresTimer: timer },
              ]);
            }
          } else if (
            event === "exec.approval.resolved" ||
            event === "plugin.approval.resolved"
          ) {
            const resolvedId = (payload as { id?: string }).id;
            if (resolvedId) dismissApproval(resolvedId);
          }
        }
      } catch {
        // 忽略解析错误
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      // 清理所有定时器（在 cleanup 中使用局部副本避免 ref 竞态）
      // eslint-disable-next-line react-hooks/exhaustive-deps -- timersRef 在 dep 中，.current 读取稳定
      const timers = timersRef.current;
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
   
  }, [dismissApproval]);

  // 发送审批决策
  async function resolve(id: string, decision: "allow-once" | "allow-always" | "deny", kind: "exec" | "plugin") {
    setResolvingId(id);
    try {
      const resp = await fetch("/api/gateway/exec-approvals/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision, kind }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        alert(`审批失败: ${data.error ?? resp.statusText}`);
      }
      dismissApproval(id);
    } catch {
      alert("审批请求失败，请重试");
    } finally {
      setResolvingId(null);
    }
  }

  if (pendingApprovals.length === 0) {
    return null;
  }

  return (
    <>
      {/* 全屏遮罩 */}
      <div
        className="fixed inset-0 bg-black/60 z-[340] flex items-center justify-center p-4"
        style={{ zIndex: 340 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // 点击遮罩关闭（但不关闭审批项）
          }
        }}
      >
        {/* 审批卡片 */}
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          style={{ zIndex: 341 }}
        >
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <span className="font-semibold text-zinc-100">执行审批</span>
            </div>
            <span className="text-xs text-zinc-500">
              {pendingApprovals.length > 1
                ? `${pendingApprovals.length} 待处理`
                : ""}
            </span>
          </div>

          {/* 审批列表 */}
          <div className="max-h-96 overflow-y-auto">
            {pendingApprovals.map(({ request }) => (
              <div
                key={request.id}
                className="p-4 border-b border-zinc-800 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 mb-1">
                      {request.kind === "plugin" ? "🔌 " : "💻 "}
                      {request.title}
                    </div>
                    {request.description && (
                      <div className="text-xs text-zinc-400 mb-2">
                        {request.description}
                      </div>
                    )}
                    {request.command && (
                      <div className="bg-zinc-950 rounded px-2 py-1 font-mono text-xs text-zinc-300 break-all">
                        {request.command}
                      </div>
                    )}
                  </div>
                </div>

                {/* 决策按钮 */}
                <div className="flex gap-2 mt-3">
                  <button
                    className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-green-700 hover:bg-green-600 text-green-100 transition-colors disabled:opacity-50"
                    disabled={resolvingId === request.id}
                    onClick={() =>
                      resolve(request.id, "allow-once", request.kind)
                    }
                  >
                    允许一次
                  </button>
                  <button
                    className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-blue-700 hover:bg-blue-600 text-blue-100 transition-colors disabled:opacity-50"
                    disabled={resolvingId === request.id}
                    onClick={() =>
                      resolve(request.id, "allow-always", request.kind)
                    }
                  >
                    始终允许
                  </button>
                  <button
                    className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-red-700 hover:bg-red-600 text-red-100 transition-colors disabled:opacity-50"
                    disabled={resolvingId === request.id}
                    onClick={() => resolve(request.id, "deny", request.kind)}
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
