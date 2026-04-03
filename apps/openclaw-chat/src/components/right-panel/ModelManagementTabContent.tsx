'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelInfo {
  id: string;
  provider: string;
  name?: string;
  contextWindow?: number;
  reasoning?: boolean;
  input?: string[];
}

interface ConfigData {
  hash: string;
  parsed: {
    agents?: {
      defaults?: {
        model?: { primary?: string };
        models?: Record<string, { alias?: string }>;
      };
    };
    wizard?: {
      lastRunAt?: string;
      lastRunVersion?: string;
      lastRunCommand?: string;
      lastRunMode?: string;
    };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatContextWindow(n?: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M tokens`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K tokens`;
  return `${n}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-72">
        <div className="px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-400">{message}</p>
        </div>
        <div className="px-4 py-2 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors disabled:opacity-40"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40"
          >
            {loading ? '保存中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Refresh Icon ──────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M10.5 6a4.5 4.5 0 1 1-1.3-3.2" />
      <path d="M10.5 2v3h-3" />
    </svg>
  );
}

// ─── ModelManagementTabContent ────────────────────────────────────────────────

interface ModelManagementTabContentProps {
  agentId: string;
}

export function ModelManagementTabContent({ agentId: _agentId }: ModelManagementTabContentProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changingModelId, setChangingModelId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ModelInfo | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [modelsRes, configRes] = await Promise.all([
        fetch('/api/openclaw/models'),
        fetch('/api/openclaw/config'),
      ]);
      const modelsData = await modelsRes.json().catch(() => ({ models: [] }));
      const configData = await configRes.json().catch(() => null);
      setModels(modelsData.models ?? []);
      if (configData) setConfig(configData);
    } catch {
      // silently fail on refresh
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const currentDefault = config?.parsed?.agents?.defaults?.model?.primary ?? null;
  const wizard = config?.parsed?.wizard;
  const configHash = config?.hash ?? '';

  const handleSelectModel = (model: ModelInfo) => {
    setChangeError(null);
    setConfirmTarget(model);
  };

  const handleConfirmChange = async () => {
    if (!confirmTarget || !configHash) return;
    setChangingModelId(confirmTarget.id);
    setChangeError(null);
    try {
      const res = await fetch('/api/openclaw/config/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseHash: configHash, modelId: confirmTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'STALE_HASH') {
          setChangeError('配置已被其他进程修改，请刷新后重试。');
        } else {
          setChangeError(data.error ?? `设置失败 (${res.status})`);
        }
        setChangingModelId(null);
        return;
      }
      setConfirmTarget(null);
      await fetchAll();
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : '设置失败');
    } finally {
      setChangingModelId(null);
    }
  };

  const handleCancelChange = () => {
    if (!changingModelId) {
      setConfirmTarget(null);
      setChangeError(null);
    }
  };

  // Handle Escape key to close dialog regardless of changingModelId state
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmTarget) {
        setConfirmTarget(null);
        setChangeError(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [confirmTarget]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">模型管理</span>
        <button
          onClick={() => void fetchAll()}
          disabled={refreshing}
          title="刷新"
          className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors rounded"
        >
          <RefreshIcon spinning={refreshing} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : (
          <>
            {/* Error banner */}
            {changeError && (
              <div className="mx-3 mt-3 px-3 py-2 bg-red-900/30 border border-red-800/50 rounded text-xs text-red-300">
                {changeError}
              </div>
            )}

            {/* Models section */}
            <div className="px-3 py-2">
              <div className="text-xs text-zinc-500 mb-2">
                可用模型 {models.length > 0 && <span className="text-zinc-600">· 点击设为默认</span>}
              </div>
              <div className="space-y-2">
                {models.map((model) => {
                  const isActive = model.id === currentDefault;
                  const isPending = model.id === changingModelId;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelectModel(model)}
                      disabled={isActive || isPending}
                      className={[
                        'w-full text-left rounded border transition-colors',
                        isActive
                          ? 'border-green-600/50 bg-green-900/10'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          {/* Model name */}
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <span className="inline-flex items-center gap-0.5 text-green-400 text-xs flex-shrink-0">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M8.5 2.5 4 7 1.5 4.5l.5-.5L4 6l4-4 .5.5z" />
                                </svg>
                                默认
                              </span>
                            )}
                            <span className="text-sm font-mono text-zinc-200 truncate">
                              {model.provider}/{model.name ?? model.id}
                            </span>
                          </div>

                          {/* Model details */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {model.contextWindow && (
                              <span className="inline-flex items-center text-xs text-zinc-500">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-0.5 flex-shrink-0">
                                  <rect x="1" y="2" width="8" height="6" rx="1" />
                                  <path d="M3 5h4" />
                                </svg>
                                {formatContextWindow(model.contextWindow)}
                              </span>
                            )}
                            {model.reasoning && (
                              <span className="inline-flex text-xs px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/40">
                                推理
                              </span>
                            )}
                            {model.input && model.input.length > 0 && (
                              <span className="inline-flex text-xs text-zinc-600">
                                {model.input.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Radio indicator */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className={[
                              'w-4 h-4 rounded-full border-2 transition-colors',
                              isActive
                                ? 'border-green-500 bg-green-500'
                                : 'border-zinc-600 bg-transparent',
                            ].join(' ')}
                          >
                            {isActive && (
                              <div className="w-full h-full rounded-full bg-white/20 scale-50" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {models.length === 0 && (
                  <div className="text-xs text-zinc-600 py-4 text-center">暂无可用模型</div>
                )}
              </div>
            </div>

            {/* Wizard info section */}
            {wizard && (
              <div className="mx-3 mb-3 px-3 py-3 bg-zinc-900/30 border border-zinc-800 rounded">
                <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
                    <circle cx="6" cy="6" r="5" />
                    <path d="M6 3v3l2 1" />
                  </svg>
                  向导信息
                </div>
                <div className="space-y-1">
                  {wizard.lastRunAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-16 flex-shrink-0">上次运行</span>
                      <span className="text-xs text-zinc-400">{formatDate(wizard.lastRunAt)}</span>
                    </div>
                  )}
                  {wizard.lastRunVersion && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-16 flex-shrink-0">版本</span>
                      <span className="text-xs text-zinc-400 font-mono">{wizard.lastRunVersion}</span>
                    </div>
                  )}
                  {wizard.lastRunCommand && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-16 flex-shrink-0">命令</span>
                      <span className="text-xs text-zinc-400 font-mono">{wizard.lastRunCommand}</span>
                    </div>
                  )}
                  {wizard.lastRunMode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-16 flex-shrink-0">模式</span>
                      <span className="text-xs text-zinc-400">{wizard.lastRunMode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm dialog overlay */}
      {confirmTarget && (
        <ConfirmDialog
          title="确认切换模型"
          message={`确定要将默认模型切换为 ${confirmTarget.provider}/${confirmTarget.name ?? confirmTarget.id} 吗？`}
          confirmLabel="确认切换"
          loading={changingModelId !== null}
          onConfirm={handleConfirmChange}
          onCancel={handleCancelChange}
        />
      )}
    </div>
  );
}
