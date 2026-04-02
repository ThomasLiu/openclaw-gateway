"use client";

interface GatewayAlertDialogProps {
  message: string;
  onClose: () => void;
}

export function GatewayAlertDialog({ message, onClose }: GatewayAlertDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-base font-semibold text-red-400 mb-2">网关连接错误</h2>
        <p className="text-sm text-zinc-300 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded transition-colors"
        >
          确定
        </button>
      </div>
    </div>
  );
}
