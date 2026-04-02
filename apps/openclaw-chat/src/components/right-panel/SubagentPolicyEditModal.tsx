'use client';

import { useEffect, useRef, useState } from 'react';

export type SubagentPolicyKind = 'defaults' | 'tools' | 'agent';

interface SubagentPolicyEditModalProps {
  agentId: string;
  currentPolicy: SubagentPolicy;
  onSave: (kind: SubagentPolicyKind, policy: SubagentPolicy) => Promise<void>;
  onClose: () => void;
}

export interface SubagentPolicy {
  allowAgents?: string[];
  maxDepth?: number;
  allowTools?: string[];
  enabled?: boolean;
}

interface PolicySection {
  kind: SubagentPolicyKind;
  label: string;
  description: string;
  hint: string;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    kind: 'defaults',
    label: '全局默认策略',
    description: '控制所有 Agent 的默认子会话行为',
    hint: 'agents.defaults.subagents',
  },
  {
    kind: 'tools',
    label: '工具策略',
    description: '控制工具调用产生的子会话',
    hint: 'tools.subagents',
  },
  {
    kind: 'agent',
    label: '当前 Agent 策略',
    description: '仅控制当前 Agent 的子会话行为',
    hint: `agents.list[?(@.id=="${''}")].subagents`,
  },
];

export function SubagentPolicyEditModal({
  agentId,
  currentPolicy,
  onSave,
  onClose,
}: SubagentPolicyEditModalProps) {
  const [kind, setKind] = useState<SubagentPolicyKind>('agent');
  const [policy, setPolicy] = useState<SubagentPolicy>(currentPolicy);
  const [allowAgentsText, setAllowAgentsText] = useState(
    (currentPolicy.allowAgents ?? []).join(', ')
  );
  const [maxDepthText, setMaxDepthText] = useState(
    currentPolicy.maxDepth?.toString() ?? '3'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsedPolicy: SubagentPolicy = {
        ...policy,
        allowAgents: allowAgentsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        maxDepth: parseInt(maxDepthText, 10),
      };
      await onSave(kind, parsedPolicy);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">编辑子会话策略</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Agent: {agentId}</p>
          </div>
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
          {/* Kind selector */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">策略类型</label>
            <div className="space-y-2">
              {POLICY_SECTIONS.map((section) => (
                <button
                  key={section.kind}
                  type="button"
                  onClick={() => setKind(section.kind)}
                  className={`w-full flex items-start gap-3 p-3 rounded border transition-colors text-left ${
                    kind === section.kind
                      ? 'border-green-600 bg-green-900/20'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex-shrink-0 inline-block w-4 h-4 rounded-full border-2 ${
                      kind === section.kind ? 'border-green-500 bg-green-500' : 'border-zinc-600'
                    }`}
                  >
                    {kind === section.kind && (
                      <span className="block w-full h-full rounded-full bg-white scale-[0.4]" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm text-zinc-200">{section.label}</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{section.description}</span>
                    <span className="block text-xs text-zinc-600 mt-0.5 font-mono">{section.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Allow agents */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              允许的 Agent <span className="text-zinc-600">(逗号分隔)</span>
            </label>
            <input
              ref={firstFocusRef}
              type="text"
              value={allowAgentsText}
              onChange={(e) => setAllowAgentsText(e.target.value)}
              placeholder="main, assistant, *"
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
            />
            <p className="text-xs text-zinc-600 mt-1">* 表示允许所有 Agent；留空表示使用默认策略</p>
          </div>

          {/* Max depth */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              最大嵌套深度 <span className="text-zinc-600">(1-10)</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxDepthText}
              onChange={(e) => setMaxDepthText(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm rounded px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPolicy((p) => ({ ...p, enabled: !p.enabled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 ${
                policy.enabled !== false ? 'bg-green-600' : 'bg-zinc-700'
              }`}
              aria-checked={policy.enabled !== false}
              role="switch"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  policy.enabled !== false ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-xs text-zinc-400">
              {policy.enabled !== false ? '子会话已启用' : '子会话已禁用'}
            </span>
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
