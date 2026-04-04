"use client";

/**
 * GatewayAlertDialog - 网关错误/告警弹窗
 *
 * 当网关连接失败时显示红色告警对话框。
 * 包含错误详情，并可通过按钮关闭。
 */
export interface GatewayAlertDialogProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 错误消息内容 */
  message?: string;
  /** 关闭弹窗回调 */
  onClose: () => void;
}

export default function GatewayAlertDialog({
  open,
  message,
  onClose,
}: GatewayAlertDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
        onClick={onClose}
      >
        {/* 弹窗主体 */}
        <div
          className="bg-zinc-900 border border-red-500/50 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gateway-alert-title"
        >
          {/* 顶部红色条 */}
          <div className="h-1 bg-red-500 w-full" />

          {/* 弹窗内容 */}
          <div className="px-6 py-5">
            {/* 标题行 */}
            <div className="flex items-start gap-3 mb-4">
              {/* 警告图标 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-red-400"
                >
                  <path
                    d="M8 1L14 14H2L8 1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M8 6v3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="11" r="0.5" fill="currentColor" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  id="gateway-alert-title"
                  className="text-base font-semibold text-red-400 mb-1"
                >
                  网关连接失败
                </h2>
                <p className="text-sm text-zinc-400">
                  无法连接到 OpenClaw Gateway
                </p>
              </div>
            </div>

            {/* 错误详情 */}
            {message && (
              <div className="mb-5 px-3 py-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  错误详情
                </p>
                <p className="text-sm text-zinc-300 font-mono break-all leading-relaxed">
                  {message}
                </p>
              </div>
            )}

            {/* 诊断建议 */}
            <div className="mb-5 px-3 py-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                诊断建议
              </p>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-1">•</span>
                  <span>确认 OpenClaw Gateway 已启动（端口 18789）</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-1">•</span>
                  <span>检查 OPENCLAW_GATEWAY_URL 环境变量配置</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-1">•</span>
                  <span>查看网关日志排查连接问题</span>
                </li>
              </ul>
            </div>

            {/* 关闭按钮 */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors border border-zinc-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
