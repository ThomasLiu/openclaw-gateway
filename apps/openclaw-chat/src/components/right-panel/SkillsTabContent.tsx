'use client';

import { useEffect, useState } from 'react';
import { SkillInstallScopeModal, type SkillInstallScope } from './SkillInstallScopeModal';

interface SkillsTabContentProps {
  agentId: string;
}

interface SkillInfo {
  name: string;
  description: string;
  enabled: boolean;
}

export function SkillsTabContent({ agentId }: SkillsTabContentProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/openclaw/skills/status?agentId=${encodeURIComponent(agentId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSkills(data.skills ?? []);
      })
      .catch(() => {
        if (!cancelled) setSkills([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const reloadSkills = () => {
    fetch(`/api/openclaw/skills/status?agentId=${encodeURIComponent(agentId)}`)
      .then((r) => r.json())
      .then((data) => setSkills(data.skills ?? []))
      .catch(() => setSkills([]));
  };

  const handleInstall = async (name: string, scope: SkillInstallScope, scopeId: string) => {
    const body: { name: string; agentId?: string; scope?: string } = { name };
    if (scope === 'agent') {
      body.agentId = scopeId;
    } else {
      body.scope = 'global';
    }
    const res = await fetch('/api/openclaw/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `安装失败 (${res.status})`);
    }
    reloadSkills();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400">已安装 Skill</span>
        <button
          onClick={() => setShowInstallModal(true)}
          className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        >
          + 安装
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : skills.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无已安装的 Skill</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {skills.map((skill) => (
              <div key={skill.name} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-200 font-medium">{skill.name}</span>
                  {!skill.enabled && (
                    <span className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">
                      已禁用
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{skill.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showInstallModal && (
        <SkillInstallScopeModal
          agentId={agentId}
          onInstall={handleInstall}
          onClose={() => {
            setShowInstallModal(false);
          }}
        />
      )}
    </div>
  );
}
