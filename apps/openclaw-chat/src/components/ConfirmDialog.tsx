"use client";

/**
 * ConfirmDialog - 统一的用户确认框组件
 *
 * 提供一致的确认对话框样式，替代浏览器原生的 confirm()
 * 支持自定义标题、内容、按钮文本和颜色主题
 */

export interface ConfirmDialogProps {
  /** 是否显示对话框 */
  open: boolean;
  /** 对话框标题 */
  title?: string;
  /** 对话框内容/描述 */
  description?: string;
  /** 确认按钮文本（默认：确认） */
  confirmText?: string;
  /** 取消按钮文本（默认：取消） */
  cancelText?: string;
  /** 确认按钮的颜色主题（默认：danger） */
  variant?: "primary" | "danger" | "warning";
  /** 是否显示危险图标 */
  showIcon?: boolean;
  /** 是否正在加载/处理中 */
  loading?: boolean;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "确认操作",
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "danger",
  showIcon = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          topBar: "bg-blue-500",
          iconBg: "bg-blue-500/20",
          iconColor: "text-blue-400",
          titleColor: "text-blue-400",
          confirmBtn: "bg-blue-600 hover:bg-blue-500",
        };
      case "warning":
        return {
          topBar: "bg-yellow-500",
          iconBg: "bg-yellow-500/20",
          iconColor: "text-yellow-400",
          titleColor: "text-yellow-400",
          confirmBtn: "bg-yellow-600 hover:bg-yellow-500",
        };
      case "danger":
      default:
        return {
          topBar: "bg-red-500",
          iconBg: "bg-red-500/20",
          iconColor: "text-red-400",
          titleColor: "text-red-400",
          confirmBtn: "bg-red-600 hover:bg-red-500",
        };
    }
  };

  const styles = getVariantStyles();

  const getIcon = () => {
    switch (variant) {
      case "primary":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconColor}>
            <path d="M8 1L14 14H2L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
        );
      case "warning":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconColor}>
            <path d="M8 1L14 14H2L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
        );
      case "danger":
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.iconColor}>
            <path d="M8 1L14 14H2L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
        );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
        onClick={loading ? undefined : onCancel}
      >
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className={`h-1 ${styles.topBar} w-full`} />

          <div className="px-6 py-5">
            <div className="flex items-start gap-3 mb-4">
              {showIcon && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center mt-0.5`}>
                  {getIcon()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2
                  id="confirm-dialog-title"
                  className={`text-base font-semibold ${styles.titleColor} mb-1`}
                >
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-zinc-400">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 ${styles.confirmBtn} text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "处理中..." : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
