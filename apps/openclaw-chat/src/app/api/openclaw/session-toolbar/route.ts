/**
 * /api/openclaw/session-toolbar
 *
 * Session 工具栏 API：
 * - action=restart: 重启 gateway
 * - action=session_status: 获取/设置 session 状态（模型、thinking 模式等）
 * - action=sessions_history: 获取 session 历史消息
 * - action=gateway_config: 获取/修改 gateway 配置
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";
import { getGatewayConfig } from "@/lib/openclaw/config";

type ToolbarAction =
  | "restart"
  | "session_status"
  | "sessions_history"
  | "gateway_config"
  | "nodes";

interface ToolbarRequest {
  action: ToolbarAction;
  sessionKey?: string;
  // restart
  delayMs?: number;
  reason?: string;
  note?: string;
  // session_status
  model?: string;
  thinkingLevel?: string;
  // sessions_history
  limit?: number;
  includeTools?: boolean;
  // gateway_config
  configPatch?: Record<string, unknown>;
  baseHash?: string;
  // nodes
  node?: string;
  nodeAction?: string;
  facing?: string;
  maxWidth?: number;
  quality?: number;
  delay?: number;
  deviceId?: string;
  limitPhotos?: number;
  duration?: string;
  durationMs?: number;
  includeAudio?: boolean;
  fps?: number;
  screenIndex?: number;
  outPath?: string;
  maxAgeMs?: number;
  locationTimeoutMs?: number;
  desiredAccuracy?: string;
  notificationAction?: string;
  notificationKey?: string;
  notificationReplyText?: string;
  invokeCommand?: string;
  invokeParamsJson?: string;
  invokeTimeoutMs?: number;
  // notify
  title?: string;
  body?: string;
  sound?: string;
  priority?: string;
  delivery?: string;
}

/**
 * GET /api/openclaw/session-toolbar
 * 获取 session 状态信息
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") as ToolbarAction;
  const sessionKey = searchParams.get("sessionKey") ?? undefined;

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();

    switch (action) {
      case "session_status": {
        if (!sessionKey) {
          return NextResponse.json({ error: "sessionKey is required for session_status" }, { status: 400 });
        }
        // session_status 通过调用 gateway 的内部工具实现
        // 这里我们通过 chat.history 来获取基本信息
        const messages = await client.fetchChatHistory(sessionKey, 1);
        return NextResponse.json({
          ok: true,
          sessionKey,
          messageCount: messages.length,
        });
      }

      case "sessions_history": {
        if (!sessionKey) {
          return NextResponse.json({ error: "sessionKey is required for sessions_history" }, { status: 400 });
        }
        const limit = parseInt(searchParams.get("limit") ?? "50", 10);
        const messages = await client.fetchChatHistory(sessionKey, limit);
        return NextResponse.json({
          ok: true,
          sessionKey,
          messages,
        });
      }

      case "gateway_config": {
        const config = await client.configGet();
        return NextResponse.json({
          ok: true,
          config,
        });
      }

      case "nodes": {
        // 列出所有已配对的节点
        const nodes = await client.request<{ nodes?: unknown[] }>("node.list", {});
        return NextResponse.json({
          ok: true,
          nodes: nodes?.nodes ?? [],
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/openclaw/session-toolbar
 * 执行工具栏操作
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ToolbarRequest = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const client = await getOpenClawClient();

    switch (action) {
      case "restart": {
        // Gateway restart 通过写入 restart sentinel 实现
        // 然后调度 SIGUSR1 重启
        const { scheduleGatewaySigusr1Restart } = await import("@/lib/openclaw/restart");
        const result = await scheduleGatewaySigusr1Restart({
          delayMs: body.delayMs,
          reason: body.reason,
        });
        return NextResponse.json({ ok: true, result });
      }

      case "session_status": {
        if (!body.sessionKey) {
          return NextResponse.json({ error: "sessionKey is required" }, { status: 400 });
        }
        // 设置 session 的模型覆盖或 thinking 级别
        // 通过 sessions.patch 实现
        const patch: Record<string, unknown> = {};
        if (body.model) {
          // model 格式: provider/model
          const parts = body.model.split("/");
          if (parts.length === 2) {
            patch.providerOverride = parts[0];
            patch.modelOverride = parts[1];
          } else {
            patch.modelOverride = body.model;
          }
        }
        if (body.thinkingLevel) {
          patch.thinkingLevel = body.thinkingLevel;
        }

        if (Object.keys(patch).length > 0) {
          await client.sessionsPatch(body.sessionKey, patch);
        }

        return NextResponse.json({ ok: true, sessionKey: body.sessionKey, patch });
      }

      case "sessions_history": {
        if (!body.sessionKey) {
          return NextResponse.json({ error: "sessionKey is required" }, { status: 400 });
        }
        const messages = await client.fetchChatHistory(body.sessionKey, body.limit ?? 50);
        return NextResponse.json({
          ok: true,
          sessionKey: body.sessionKey,
          messages,
        });
      }

      case "gateway_config": {
        if (body.configPatch && body.baseHash) {
          await client.configPatch(body.configPatch, body.baseHash);
          return NextResponse.json({ ok: true, message: "Config patched successfully" });
        }
        const config = await client.configGet();
        return NextResponse.json({ ok: true, config });
      }

      case "nodes": {
        if (!body.nodeAction) {
          return NextResponse.json({ error: "nodeAction is required for nodes action" }, { status: 400 });
        }

        const params: Record<string, unknown> = {};

        // 根据节点操作类型设置参数
        switch (body.nodeAction) {
          case "status":
          case "describe":
          case "pending":
          case "camera_list":
          case "notifications_list":
          case "device_status":
          case "device_info":
          case "device_permissions":
          case "device_health":
            break; // 这些操作不需要额外参数

          case "camera_snap":
          case "camera_clip":
            if (body.facing) params.facing = body.facing;
            if (body.maxWidth) params.maxWidth = body.maxWidth;
            if (body.quality) params.quality = body.quality;
            if (body.delayMs) params.delayMs = body.delayMs;
            if (body.deviceId) params.deviceId = body.deviceId;
            break;

          case "photos_latest":
            if (body.limitPhotos) params.limit = body.limitPhotos;
            if (body.deviceId) params.deviceId = body.deviceId;
            break;

          case "screen_record":
            if (body.durationMs) params.durationMs = body.durationMs;
            if (body.includeAudio !== undefined) params.includeAudio = body.includeAudio;
            if (body.fps) params.fps = body.fps;
            if (body.screenIndex !== undefined) params.screenIndex = body.screenIndex;
            if (body.outPath) params.outPath = body.outPath;
            break;

          case "location_get":
            if (body.maxAgeMs) params.maxAgeMs = body.maxAgeMs;
            if (body.locationTimeoutMs) params.locationTimeoutMs = body.locationTimeoutMs;
            if (body.desiredAccuracy) params.desiredAccuracy = body.desiredAccuracy;
            break;

          case "notifications_action":
            if (body.notificationAction) params.notificationAction = body.notificationAction;
            if (body.notificationKey) params.notificationKey = body.notificationKey;
            if (body.notificationReplyText) params.notificationReplyText = body.notificationReplyText;
            break;

          case "invoke":
            if (body.invokeCommand) params.command = body.invokeCommand;
            if (body.invokeParamsJson) {
              try {
                params.params = JSON.parse(body.invokeParamsJson);
              } catch {
                return NextResponse.json({ error: "Invalid invokeParamsJson" }, { status: 400 });
              }
            }
            if (body.invokeTimeoutMs) params.invokeTimeoutMs = body.invokeTimeoutMs;
            break;

          case "notify":
            if (body.node) params.nodeId = body.node;
            if (body.title) params.title = body.title;
            if (body.body) params.body = body.body;
            if (body.sound) params.sound = body.sound;
            if (body.priority) params.priority = body.priority;
            if (body.delivery) params.delivery = body.delivery;
            break;

          default:
            return NextResponse.json({ error: `Unknown nodeAction: ${body.nodeAction}` }, { status: 400 });
        }

        // 调用节点方法
        const result = await client.request<unknown>(`node.${body.nodeAction}`, params);
        return NextResponse.json({ ok: true, result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
