'use client';

import { useEffect, useRef, useState } from 'react';
import type { CronTask } from '@/lib/openclaw/use-scheduled-cron-tasks';

interface ScheduledTaskJsonModalProps {
  task?: CronTask; // undefined = create mode
  onSave: (task: Omit<CronTask, 'id'> | CronTask) => Promise<void>;
  onClose: () => void;
}

const CRON_HELP_LINES = [
  '*/5 * * * *  — 每 5 分钟',
  '0 * * * *    — 每整点',
  '0 9 * * *   — 每天 09:00',
  '0 9 * * 1   — 每周一 09:00',
  '0 0 1 * *   — 每月 1 日',
];

export function ScheduledTaskJsonModal({ task, onSave, onClose }: ScheduledTaskJsonModalProps) {
  const isEdit = Boolean(task);
  const [label, setLabel] = useState(task?.label ?? '');
  const [schedule, setSchedule] = useState(task?.schedule ?? '');
  const [command, setCommand] = useState(task?.command ?? '');
  const [enabled, setEnabled] = useState(task?.enabled ?? true);
  const [agentId, setAgentId] = useState(task?.agentId ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  // Trap focus inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!label.trim()) { setError('名称不能为空'); return; }
    if (!schedule.trim()) { setError('Cron 表达式不能为空'); return; }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && task) {
        await onSave({ ...task, label: label.trim(), schedule: schedule.trim(), command: command.trim(), enabled, agentId: agentId.trim() || undefined, description: description.trim() || undefined });
      } else {
        await onSave({ label: label.trim(), schedule: schedule.trim(), command: command.trim(), enabled, agentId: agentId.trim() || undefined, description: description.trim() || undefined });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-100">
            {isEdit ? '编辑定时任务' : '新建定时任务'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded"
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              ref={labelRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如：每日健康检查"
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Cron 表达式 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="*/5 * * * *"
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm font-mono rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <div className="mt-1.5 space-y-0.5">
              {CRON_HELP_LINES.map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => setSchedule(line.split(' ')[0] === line ? line : line.split('—')[0].trim())}
                  className="block text-left w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          {/* Agent ID */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Agent ID <span className="text-zinc-600">(可选)</span>
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="main"
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm font-mono rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* Command */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              命令 <span className="text-zinc-600">(可选)</span>
            </label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="echo hello"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm font-mono rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              描述 <span className="text-zinc-600">(可选)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="此任务的用途说明"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 ${
                enabled ? 'bg-green-600' : 'bg-zinc-700'
              }`}
              aria-checked={enabled}
              role="switch"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-xs text-zinc-400">{enabled ? '已启用' : '已禁用'}</span>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
