"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch(`/api/openclaw/skills/status?agentId=${encodeURIComponent(agentId)}`)
      .then((r) => r.json())
      .then((data) => setSkills(data.skills ?? []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">已安装 Skill</span>
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
                <div className="text-sm text-zinc-200 font-medium">{skill.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{skill.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
