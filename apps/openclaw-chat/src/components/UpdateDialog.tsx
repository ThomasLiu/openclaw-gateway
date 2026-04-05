"use client";

/**
 * UpdateDialog - OpenClaw 版本更新弹窗
 *
 * 显示更新内容，执行时实时显示 CLI 输出
 */

export interface UpdateDialogProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 当前版本 */
  currentVersion?: string;
  /** 最新版本 */
  latestVersion?: string;
  /** 更新日志/内容 */
  changelog?: string;
  /** 是否正在更新 */
  updating: boolean;
  /** CLI 输出内容 */
  cliOutput: string;
  /** 开始更新回调 */
  onConfirm: () => void;
  /** 取消更新回调 */
  onCancel: () => void;
}

export default function UpdateDialog({
  open,
  currentVersion,
  latestVersion,
  changelog,
  updating,
  cliOutput,
  onConfirm,
  onCancel,
}: UpdateDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
        onClick={updating ? undefined : onCancel}
      >
        {/* 弹窗主体 */}
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-dialog-title"
        >
          {/* 顶部条 */}
          <div className="h-1 bg-green-500 w-full" />

          {/* 弹窗内容 */}
          <div className="px-6 py-5">
            {/* 标题行 */}
            <div className="flex items-start gap-3 mb-4">
              {/* 更新图标 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-green-400"
                >
                  <path
                    d="M8 1v6M8 1L5 4M8 1l3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 10v2a3 3 0 003 3h6a3 3 0 003-3v-2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  id="update-dialog-title"
                  className="text-base font-semibold text-green-400 mb-1"
                >
                  发现新版本
                </h2>
                <p className="text-sm text-zinc-400">
                  {currentVersion && latestVersion
                    ? `v${currentVersion.match(/(\d+\.\d+\.\d+)/)?.[1] ?? currentVersion} → v${latestVersion.match(/(\d+\.\d+\.\d+)/)?.[1] ?? latestVersion}`
                    : "有可用的更新"}
                </p>
              </div>
            </div>

            {/* 更新内容 */}
            {changelog && (
              <div className="mb-5 px-3 py-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  更新内容
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {changelog}
                </p>
              </div>
            )}

            {/* CLI 输出区域 */}
            {updating && (
              <div className="mb-5 px-3 py-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  更新进度
                </p>
                <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {cliOutput || "正在准备更新..."}
                </pre>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              {!updating && (
                <>
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors border border-zinc-700"
                  >
                    稍后再说
                  </button>
                  <button
                    onClick={onConfirm}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
                  >
                    确认更新
                  </button>
                </>
              )}
              {updating && (
                <button
                  disabled
                  className="px-4 py-2 bg-zinc-800 text-zinc-500 text-sm rounded-lg cursor-not-allowed"
                >
                  更新中...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
