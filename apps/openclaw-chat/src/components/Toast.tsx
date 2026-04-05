"use client";

/**
 * Toast - 轻量级通知组件
 * 用于替代浏览器 alert() 显示错误/成功消息
 */
import { useEffect, useState } from "react";

export type ToastType = "error" | "success" | "info";

export type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
};

// 全局 toast 状态
let toastListeners: Array<(toast: ToastMessage | null) => void> = [];

export function showToast(type: ToastType, message: string, duration = 4000) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const toast: ToastMessage = { id, type, message };

  // 通知所有监听器
  toastListeners.forEach((listener) => listener(toast));

  // 自动消失
  setTimeout(() => {
    toastListeners.forEach((listener) => listener(null));
  }, duration);
}

export function showError(message: string, duration = 5000) {
  showToast("error", message, duration);
}

export function showSuccess(message: string, duration = 3000) {
  showToast("success", message, duration);
}

export function showInfo(message: string, duration = 3000) {
  showToast("info", message, duration);
}

export default function ToastContainer() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const listener = (newToast: ToastMessage | null) => {
      setToast(newToast);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (!toast) return null;

  const bgColor = {
    error: "bg-red-600",
    success: "bg-green-600",
    info: "bg-zinc-700",
  }[toast.type];

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom fade-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm`}
      >
        <div className="flex items-center gap-2">
          {toast.type === "error" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 8a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3z" />
            </svg>
          )}
          {toast.type === "success" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
            </svg>
          )}
          {toast.type === "info" && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 8a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3z" />
            </svg>
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
