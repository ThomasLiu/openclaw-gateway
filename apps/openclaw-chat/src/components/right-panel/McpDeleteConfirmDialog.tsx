'use client';

interface McpDeleteConfirmDialogProps {
  serverName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
}

export function McpDeleteConfirmDialog({ serverName, onConfirm, onCancel, deleting }: McpDeleteConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-80 max-w-[90vw] p-5">
        <h3 className="text-sm font-semibold text-white mb-2">确认删除 MCP 服务</h3>
        <p className="text-xs text-zinc-400 mb-5">
          确定要删除 MCP 服务{' '}
          <span className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">{serverName}</span>{' '}
          吗？此操作无法撤销。
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
