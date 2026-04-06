"use client";

/**
 * SessionToolbar - 会话工具栏
 *
 * 包含 5 个功能按钮：
 * 1. 重置/重新开始 - 重启当前会话
 * 2. 模型/思维模式切换 - 设置模型和 thinking 模式
 * 3. 工具/设置 - 访问工具配置
 * 4. 聚焦/截图 - 屏幕截图和节点控制
 * 5. 历史记录 - 查看会话历史
 */

import { useState, useCallback } from "react";
import { showError, showSuccess } from "./Toast";

interface SessionToolbarProps {
  agentId: string;
  sessionKey: string;
  /** 禁用所有按钮 */
  disabled?: boolean;
}

type ToolbarButtonState = "idle" | "loading" | "active";

interface ButtonState {
  reset: ToolbarButtonState;
  model: ToolbarButtonState;
  tools: ToolbarButtonState;
  focus: ToolbarButtonState;
  history: ToolbarButtonState;
}

// 图标 SVG 组件
const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 1 1 1.5 4" />
    <path d="M2 12V8h4" />
  </svg>
);

const BrainIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2c-1.5 0-3 .5-3 2 0 1 .5 2 1.5 2.5L5 8c-1 1-2 2.5-2 4.5C3 14 5 16 8 16s5-2 5-3.5c0-2-1-3.5-2-4.5l-1.5-1.5C9.5 6 10 5 10 4c0-1.5-1.5-2-2-2z" />
    <circle cx="6" cy="4" r="1" fill="currentColor" />
    <circle cx="10" cy="4" r="1" fill="currentColor" />
  </svg>
);

const WrenchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4a2.5 2.5 0 0 0-4.5 1.5L6 7l3 3 1.5-1.5A2.5 2.5 0 0 0 12 4z" />
    <path d="M10 3.5 12 5.5M6 8 3 11l1.5 1.5L8 10" />
    <path d="M6 8l-2 2" />
  </svg>
);

const FocusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <rect x="5" y="5" width="6" height="6" rx="1" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 2" />
    <path d="M5 2h4M5 14h4" />
  </svg>
);

export default function SessionToolbar({ agentId, sessionKey, disabled = false }: SessionToolbarProps) {
  const [states, setStates] = useState<ButtonState>({
    reset: "idle",
    model: "idle",
    tools: "idle",
    focus: "idle",
    history: "idle",
  });

  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [showFocusMenu, setShowFocusMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const setButtonState = useCallback((button: keyof ButtonState, state: ToolbarButtonState) => {
    setStates((prev) => ({ ...prev, [button]: state }));
  }, []);

  /** 重置/重新开始 */
  const handleReset = useCallback(async () => {
    if (!sessionKey || disabled) return;
    setButtonState("reset", "loading");
    try {
      const resp = await fetch("/api/openclaw/session-toolbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", sessionKey }),
      });
      const data = await resp.json();
      if (data.ok) {
        showSuccess("Gateway 正在重启...");
        // 等待一下然后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showError(`重启失败: ${data.error}`);
      }
    } catch (err) {
      showError(`重启失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setButtonState("reset", "idle");
    }
  }, [sessionKey, disabled, setButtonState]);

  /** 获取 session 状态 */
  const handleSessionStatus = useCallback(async () => {
    if (!sessionKey || disabled) return;
    setButtonState("model", "loading");
    try {
      const resp = await fetch(
        `/api/openclaw/session-toolbar?action=session_status&sessionKey=${encodeURIComponent(sessionKey)}`
      );
      const data = await resp.json();
      if (data.ok) {
        showSuccess(`Session 状态: ${data.messageCount ?? "?"} 条消息`);
      } else {
        showError(`获取状态失败: ${data.error}`);
      }
    } catch (err) {
      showError(`获取状态失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setButtonState("model", "idle");
    }
  }, [sessionKey, disabled, setButtonState]);

  /** 获取会话历史 */
  const handleHistory = useCallback(async () => {
    if (!sessionKey || disabled) return;
    setButtonState("history", "loading");
    try {
      const resp = await fetch(
        `/api/openclaw/session-toolbar?action=sessions_history&sessionKey=${encodeURIComponent(sessionKey)}&limit=20`
      );
      const data = await resp.json();
      if (data.ok) {
        const count = data.messages?.length ?? 0;
        showSuccess(`会话历史: ${count} 条消息`);
        // 可以在这里打开历史面板
      } else {
        showError(`获取历史失败: ${data.error}`);
      }
    } catch (err) {
      showError(`获取历史失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setButtonState("history", "idle");
    }
  }, [sessionKey, disabled, setButtonState]);

  /** 获取节点列表 */
  const handleNodes = useCallback(async () => {
    if (!sessionKey || disabled) return;
    setButtonState("focus", "loading");
    try {
      const resp = await fetch("/api/openclaw/session-toolbar?action=nodes");
      const data = await resp.json();
      if (data.ok) {
        const count = data.nodes?.length ?? 0;
        showSuccess(`已配对节点: ${count} 个`);
      } else {
        showError(`获取节点失败: ${data.error}`);
      }
    } catch (err) {
      showError(`获取节点失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setButtonState("focus", "idle");
    }
  }, [sessionKey, disabled, setButtonState]);

  /** 获取 Gateway 配置 */
  const handleGatewayConfig = useCallback(async () => {
    if (!sessionKey || disabled) return;
    setButtonState("tools", "loading");
    try {
      const resp = await fetch("/api/openclaw/session-toolbar?action=gateway_config");
      const data = await resp.json();
      if (data.ok) {
        showSuccess("Gateway 配置已获取");
        // 可以在这里打开配置面板
      } else {
        showError(`获取配置失败: ${data.error}`);
      }
    } catch (err) {
      showError(`获取配置失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setButtonState("tools", "idle");
    }
  }, [sessionKey, disabled, setButtonState]);

  const isLoading = (state: ToolbarButtonState) => state === "loading";
  const isActive = (state: ToolbarButtonState) => state === "active";

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
      {/* 重置/重新开始按钮 */}
      <ToolbarButton
        icon={<ResetIcon />}
        title="重置会话"
        onClick={handleReset}
        loading={isLoading(states.reset)}
        disabled={disabled || isLoading(states.reset)}
        active={isActive(states.reset)}
      />

      {/* 分隔线 */}
      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* 模型/思维模式切换 */}
      <div className="relative">
        <ToolbarButton
          icon={<BrainIcon />}
          title="模型/思维模式"
          onClick={() => {
            setShowModelMenu(!showModelMenu);
            setShowFocusMenu(false);
            setShowHistoryMenu(false);
            setShowToolsMenu(false);
          }}
          loading={isLoading(states.model)}
          disabled={disabled || isLoading(states.model)}
          active={isActive(states.model) || showModelMenu}
          isDropdown={true}
        />
        {showModelMenu && (
          <ModelMenu
            agentId={agentId}
            sessionKey={sessionKey}
            onClose={() => setShowModelMenu(false)}
          />
        )}
      </div>

      {/* 工具/设置 */}
      <div className="relative">
        <ToolbarButton
          icon={<WrenchIcon />}
          title="工具/设置"
          onClick={() => {
            setShowToolsMenu(!showToolsMenu);
            setShowFocusMenu(false);
            setShowHistoryMenu(false);
            setShowModelMenu(false);
          }}
          loading={isLoading(states.tools)}
          disabled={disabled || isLoading(states.tools)}
          active={isActive(states.tools) || showToolsMenu}
          isDropdown={true}
        />
        {showToolsMenu && (
          <ToolsMenu
            onClose={() => setShowToolsMenu(false)}
            onGatewayConfig={handleGatewayConfig}
          />
        )}
      </div>

      {/* 聚焦/截图 */}
      <div className="relative">
        <ToolbarButton
          icon={<FocusIcon />}
          title="聚焦/截图"
          onClick={() => {
            setShowFocusMenu(!showFocusMenu);
            setShowHistoryMenu(false);
            setShowModelMenu(false);
            setShowToolsMenu(false);
          }}
          loading={isLoading(states.focus)}
          disabled={disabled || isLoading(states.focus)}
          active={isActive(states.focus) || showFocusMenu}
          isDropdown={true}
        />
        {showFocusMenu && (
          <FocusMenu
            agentId={agentId}
            sessionKey={sessionKey}
            onClose={() => setShowFocusMenu(false)}
          />
        )}
      </div>

      {/* 历史记录 */}
      <div className="relative">
        <ToolbarButton
          icon={<HistoryIcon />}
          title="历史记录"
          onClick={() => {
            setShowHistoryMenu(!showHistoryMenu);
            setShowFocusMenu(false);
            setShowModelMenu(false);
            setShowToolsMenu(false);
          }}
          loading={isLoading(states.history)}
          disabled={disabled || isLoading(states.history)}
          active={isActive(states.history) || showHistoryMenu}
          isDropdown={true}
        />
        {showHistoryMenu && (
          <HistoryMenu
            agentId={agentId}
            sessionKey={sessionKey}
            onClose={() => setShowHistoryMenu(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ToolbarButton 子组件
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  isDropdown?: boolean;
}

function ToolbarButton({
  icon,
  title,
  onClick,
  loading = false,
  disabled = false,
  active = false,
  isDropdown = false,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
        transition-all duration-150
        ${active
          ? "bg-red-600/20 text-red-400 border border-red-500/50"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {loading ? (
        <svg width="14" height="14" className="animate-spin" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="5" />
        </svg>
      ) : icon}
      {isDropdown && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="ml-0.5">
          <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// ModelMenu 子组件 - 模型/思维模式切换
// ============================================================================

interface ModelMenuProps {
  agentId: string;
  sessionKey: string;
  onClose: () => void;
}

function ModelMenu({ agentId, sessionKey, onClose }: ModelMenuProps) {
  const [thinkingLevel, setThinkingLevel] = useState<string>("off");
  const [loading, setLoading] = useState(false);

  const thinkingLevels = [
    { value: "off", label: "关闭思考" },
    { value: "low", label: "轻度思考" },
    { value: "medium", label: "中度思考" },
    { value: "high", label: "深度思考" },
  ];

  const handleThinkingChange = async (level: string) => {
    setLoading(true);
    try {
      const resp = await fetch("/api/openclaw/session-toolbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "session_status",
          sessionKey,
          thinkingLevel: level,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setThinkingLevel(level);
        showSuccess(`思维模式已设置为: ${thinkingLevels.find((l) => l.value === level)?.label}`);
      } else {
        showError(`设置失败: ${data.error}`);
      }
    } catch (err) {
      showError(`设置失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
      <div className="px-3 py-1.5 text-xs text-zinc-500 uppercase tracking-wider">思维模式</div>
      {thinkingLevels.map((level) => (
        <button
          key={level.value}
          onClick={() => handleThinkingChange(level.value)}
          disabled={loading}
          className={`
            w-full text-left px-3 py-2 text-sm transition-colors
            ${thinkingLevel === level.value
              ? "bg-red-600/20 text-red-400"
              : "text-zinc-300 hover:bg-zinc-700"
            }
          `}
        >
          {level.label}
        </button>
      ))}
      <div className="border-t border-zinc-700 mt-1 pt-1">
        <button
          onClick={onClose}
          className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-700"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ToolsMenu 子组件 - 工具/设置
// ============================================================================

interface ToolsMenuProps {
  onClose: () => void;
  onGatewayConfig: () => void;
}

function ToolsMenu({ onClose, onGatewayConfig }: ToolsMenuProps) {
  return (
    <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
      <button
        onClick={onGatewayConfig}
        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
      >
        Gateway 配置
      </button>
      <button
        onClick={onClose}
        className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-700"
      >
        取消
      </button>
    </div>
  );
}

// ============================================================================
// FocusMenu 子组件 - 聚焦/截图
// ============================================================================

interface FocusMenuProps {
  agentId: string;
  sessionKey: string;
  onClose: () => void;
}

function FocusMenu({ agentId, sessionKey, onClose }: FocusMenuProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const focusActions = [
    { id: "camera_snap", label: "拍照", icon: "📷" },
    { id: "photos_latest", label: "最近照片", icon: "🖼" },
    { id: "screen_record", label: "屏幕录制", icon: "🎬" },
    { id: "location_get", label: "位置", icon: "📍" },
    { id: "device_status", label: "设备状态", icon: "📱" },
  ];

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const resp = await fetch("/api/openclaw/session-toolbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "nodes",
          nodeAction: action,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        showSuccess(`${action} 执行成功`);
      } else {
        showError(`执行失败: ${data.error}`);
      }
    } catch (err) {
      showError(`执行失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(null);
      onClose();
    }
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
      <div className="px-3 py-1.5 text-xs text-zinc-500 uppercase tracking-wider">节点操作</div>
      {focusActions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
          disabled={loading !== null}
          className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
        >
          <span>{loading === action.id ? "⏳" : action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
      <div className="border-t border-zinc-700 mt-1 pt-1">
        <button
          onClick={onClose}
          className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-700"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HistoryMenu 子组件 - 历史记录
// ============================================================================

interface HistoryMenuProps {
  agentId: string;
  sessionKey: string;
  onClose: () => void;
}

function HistoryMenu({ agentId, sessionKey, onClose }: HistoryMenuProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<{ messages: unknown[] } | null>(null);

  const handleLoadHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `/api/openclaw/session-toolbar?action=sessions_history&sessionKey=${encodeURIComponent(sessionKey)}&limit=10`
      );
      const data = await resp.json();
      if (data.ok) {
        setHistoryData(data);
      } else {
        showError(`获取历史失败: ${data.error}`);
      }
    } catch (err) {
      showError(`获取历史失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-full right-0 mt-1 w-80 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-sm text-zinc-300">会话历史</span>
        <button
          onClick={handleLoadHistory}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {historyData ? (
          historyData.messages?.length > 0 ? (
            <div className="space-y-2">
              {historyData.messages.map((msg: unknown, idx: number) => {
                const message = msg as { role?: string; content?: string };
                const isUser = message.role === "user";
                return (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded ${
                      isUser ? "bg-zinc-700 text-zinc-200" : "bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    <div className="text-[10px] text-zinc-500 mb-1">
                      {isUser ? "👤 用户" : "🤖 助手"}
                    </div>
                    <div className="line-clamp-2">
                      {typeof message.content === "string"
                        ? message.content.slice(0, 200)
                        : JSON.stringify(message.content)?.slice(0, 200)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 text-center py-4">暂无历史消息</div>
          )
        ) : (
          <div className="text-sm text-zinc-500 text-center py-4">点击刷新加载历史</div>
        )}
      </div>
      <div className="border-t border-zinc-700 p-2">
        <button
          onClick={onClose}
          className="w-full text-center px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-700 rounded"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
