'use client';

import { useEffect, useRef, useState } from 'react';

export type SkillInstallScope = 'global' | 'agent';

interface SkillInstallScopeModalProps {
  agentId: string;
  onInstall: (name: string, scope: SkillInstallScope, agentId: string) => Promise<void>;
  onClose: () => void;
}

const SCOPE_OPTIONS: { value: SkillInstallScope; label: string; description: string }[] = [
  {
    value: 'global',
    label: '全局安装',
    description: '所有 Agent 均可使用此 Skill',
  },
  {
    value: 'agent',
    label: '当前 Agent',
    description: '仅当前 Agent 可使用此 Skill',
  },
];

export function SkillInstallScopeModal({ agentId, onInstall, onClose }: SkillInstallScopeModalProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<SkillInstallScope>('agent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInstall = async () => {
    if (!name.trim()) {
      setError('Skill 名称不能为空');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const resolvedScope = scope === 'agent' ? agentId : undefined;
      await onInstall(name.trim(), scope, resolvedScope ?? 'global');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装失败');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-100">安装 Skill</h2>
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
          {/* Skill name */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Skill 名称 <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：code-search"
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* Scope selection */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">安装范围</label>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScope(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded border transition-colors text-left ${
                    scope === opt.value
                      ? 'border-green-600 bg-green-900/20'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex-shrink-0 inline-block w-4 h-4 rounded-full border-2 ${
                      scope === opt.value ? 'border-green-500 bg-green-500' : 'border-zinc-600'
                    }`}
                  >
                    {scope === opt.value && (
                      <span className="block w-full h-full rounded-full bg-white scale-[0.4]" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm text-zinc-200">{opt.label}</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{opt.description}</span>
                    {opt.value === 'agent' && (
                      <span className="block text-xs text-zinc-600 mt-0.5 font-mono">Agent: {agentId}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
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
            onClick={handleInstall}
            disabled={saving || !name.trim()}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {saving ? '安装中…' : '安装'}
          </button>
        </div>
      </div>
    </div>
  );
}
