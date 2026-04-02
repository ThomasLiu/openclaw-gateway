'use client';

import { useEffect, useState } from 'react';

interface ModelManagementTabContentProps {
  agentId: string;
}

interface ModelInfo {
  id: string;
  provider: string;
  name?: string;
}

export function ModelManagementTabContent({ agentId: _agentId }: ModelManagementTabContentProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/openclaw/models')
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">可用模型</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : models.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无模型</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {models.map((model) => (
              <div key={model.id} className="px-3 py-2">
                <div className="text-sm text-zinc-200 font-mono">
                  {model.provider}/{model.name ?? model.id}
                </div>
                {model.name && <div className="text-xs text-zinc-500">{model.id}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
