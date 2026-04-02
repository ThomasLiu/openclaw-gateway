'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecApprovalRequested } from '@/lib/exec-approval-gateway';
import {
  formatCommandForDisplay,
  formatExpiresIn,
  parseExecApprovalRequested,
  parsePluginApprovalRequested,
  parseExecApprovalResolved,
  parsePluginApprovalResolved,
} from '@/lib/exec-approval-gateway';

interface QueuedApproval {
  id: string;
  detail: ExecApprovalRequested;
  expiresIn: string;
}

interface ExecApprovalOverlayProps {
  /** Called when the overlay should show/hide a gateway alert */
  onGatewayAlert?: (message: string | null) => void;
}

/**
 * ExecApprovalOverlay — full-screen overlay for shell / plugin execution approvals.
 *
 * - Subscribes to /api/gateway/exec-approvals/stream via EventSource
 * - Maintains a FIFO queue of pending approval requests
 * - Each entry shows command + countdown; allows Allow-once / Always-allow / Deny
 * - Removes entries on resolution event or expiration
 *
 * z-index: z-[340] — above AppTitleBar (z-200) and dropdown menus (z-300)
 */
export function ExecApprovalOverlay({ onGatewayAlert }: ExecApprovalOverlayProps) {
  const [queue, setQueue] = useState<QueuedApproval[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── EventSource subscription ────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/gateway/exec-approvals/stream');
    esRef.current = es;

    es.addEventListener('open', () => {
      setDismissed(false);
      onGatewayAlert?.(null);
    });

    es.addEventListener('message', (e: MessageEvent) => {
      const data = e.data;
      if (data === 'hello' || data === 'ping') return;

      try {
        const frame = JSON.parse(data) as { type: string; event: string; payload: unknown };
        if (frame.type !== 'gateway') return;

        const { event, payload } = frame;

        if (
          event === 'exec.approval.requested' ||
          event === 'plugin.approval.requested'
        ) {
          const parseFn = event === 'plugin.approval.requested'
            ? parsePluginApprovalRequested
            : parseExecApprovalRequested;
          const detail = parseFn(payload);
          if (!detail) return;

          setQueue((prev) => {
            // Avoid duplicates
            if (prev.some((q) => q.id === detail.id)) return prev;
            return [...prev, { id: detail.id, detail, expiresIn: formatExpiresIn(detail.expiresAtMs) }];
          });
        } else if (
          event === 'exec.approval.resolved' ||
          event === 'plugin.approval.resolved'
        ) {
          const parseFn = event === 'plugin.approval.resolved'
            ? parsePluginApprovalResolved
            : parseExecApprovalResolved;
          const resolved = parseFn(payload);
          if (!resolved) return;

          // Remove from queue
          setQueue((prev) => prev.filter((q) => q.id !== resolved.id));
        }
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('error', () => {
      // EventSource auto-reconnects; nothing to do
    });
  }, [onGatewayAlert]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  // ─── Countdown ticker ───────────────────────────────────────────────────────

  useEffect(() => {
    if (queue.length === 0) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    if (!countdownRef.current) {
      countdownRef.current = setInterval(() => {
        setQueue((prev) => {
          const now = Date.now();
          const next = prev
            .map((q) => ({
              ...q,
              expiresIn: formatExpiresIn(q.detail.expiresAtMs),
            }))
            .filter((q) => q.detail.expiresAtMs > now);

          // All expired → dismiss
          if (next.length === 0) setDismissed(true);
          return next;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [queue.length]);

  // ─── Resolve ──────────────────────────────────────────────────────────────────

  const resolve = useCallback(
    async (id: string, decision: 'allow-once' | 'allow-always' | 'deny', kind: 'exec' | 'plugin') => {
      try {
        const res = await fetch('/api/gateway/exec-approvals/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, decision, kind }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          onGatewayAlert?.(err.error ?? '审批提交失败');
        }
      } catch {
        onGatewayAlert?.('审批提交失败，请检查网络连接');
      }
    },
    [onGatewayAlert]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (dismissed || queue.length === 0) return null;

  const head = queue[0];
  const pendingCount = queue.length;

  return (
    <div
      className="fixed inset-0 z-[340] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="执行审批"
    >
      <div className="w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 text-lg">⚠️</span>
            <h2 className="text-sm font-semibold text-zinc-100">
              {head.detail.kind === 'plugin' ? '插件审批请求' : '执行审批请求'}
            </h2>
          </div>
          {pendingCount > 1 && (
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
              +{pendingCount - 1} 待处理
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">命令</p>
          <pre className="w-full text-sm text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {formatCommandForDisplay(head.detail.command)}
          </pre>

          {head.detail.cwd && (
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">目录：</span>
              <span className="font-mono">{head.detail.cwd}</span>
            </p>
          )}

          {head.detail.reason && (
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">原因：</span>
              {head.detail.reason}
            </p>
          )}

          <p className="text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">过期：</span>
            <span className={head.expiresIn.includes('已过期') ? 'text-red-400' : 'text-amber-400'}>
              {head.expiresIn}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 bg-zinc-950/50 border-t border-zinc-800">
          <button
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:bg-zinc-800 transition-colors cursor-pointer"
            onClick={() => resolve(head.id, 'deny', head.detail.kind)}
          >
            拒绝
          </button>
          <button
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-700 text-blue-100 hover:bg-blue-600 active:bg-blue-800 transition-colors cursor-pointer"
            onClick={() => resolve(head.id, 'allow-once', head.detail.kind)}
          >
            仅允许一次
          </button>
          <button
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-green-700 text-green-100 hover:bg-green-600 active:bg-green-800 transition-colors cursor-pointer"
            onClick={() => resolve(head.id, 'allow-always', head.detail.kind)}
          >
            始终允许
          </button>
        </div>
      </div>
    </div>
  );
}
