'use client';

import { useState } from 'react';
import { useScheduledCronTasks, type CronTask } from '@/lib/openclaw/use-scheduled-cron-tasks';
import { ScheduledTaskJsonModal } from './ScheduledTaskJsonModal';

interface ScheduledTasksTabContentProps {
  agentId: string;
}

interface DeleteConfirmState {
  task: CronTask;
  confirming: boolean;
}

export function ScheduledTasksTabContent({ agentId: _agentId }: ScheduledTasksTabContentProps) {
  const { tasks, loading, error, refreshing, createTask, updateTask, removeTask, refresh } =
    useScheduledCronTasks();

  const [editTask, setEditTask] = useState<CronTask | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (task: Omit<CronTask, 'id'> | CronTask) => {
    if ('id' in task) {
      await updateTask(task);
    } else {
      await createTask(task);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await removeTask(deleteConfirm.task.id);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">定时任务</span>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={refreshing}
            title="刷新"
            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors rounded"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M10.5 6a4.5 4.5 0 1 1-1.3-3.2" />
              <path d="M10.5 2v3h-3" />
            </svg>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            title="新建任务"
            className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
          >
            + 新建
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : error ? (
          <div className="p-3 space-y-2">
            <div className="text-xs text-red-400">{error}</div>
            <button
              onClick={refresh}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              重试
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-zinc-600">
              <rect x="4" y="6" width="24" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 12h24" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 3v6M22 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 17h2M11 21h4M11 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-zinc-500">暂无定时任务</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              创建第一个任务
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={() => setEditTask(task)}
                onDelete={() => setDeleteConfirm({ task, confirming: false })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ScheduledTaskJsonModal
          onSave={handleSave}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTask && (
        <ScheduledTaskJsonModal
          task={editTask}
          onSave={handleSave}
          onClose={() => setEditTask(undefined)}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          task={deleteConfirm.task}
          confirming={deleteConfirm.confirming || deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onEdit,
  onDelete,
}: {
  task: CronTask;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group px-3 py-2 hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Status indicator */}
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
                task.enabled ? 'bg-green-400' : 'bg-zinc-600'
              }`}
              title={task.enabled ? '已启用' : '已禁用'}
            />
            <span className="text-sm text-zinc-200 font-medium truncate">
              {task.label ?? task.id}
            </span>
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5 ml-3 truncate">
            {task.schedule}
          </div>
          {task.description && (
            <div className="text-xs text-zinc-500 mt-0.5 ml-3 truncate">
              {task.description}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            title="编辑"
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="删除"
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────

function DeleteConfirmDialog({
  task,
  confirming,
  onConfirm,
  onCancel,
}: {
  task: CronTask;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">确认删除</h3>
        <p className="text-xs text-zinc-400 mb-4">
          确定要删除任务{' '}
          <span className="text-zinc-200 font-medium">{task.label ?? task.id}</span>{' '}
          吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {confirming ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
