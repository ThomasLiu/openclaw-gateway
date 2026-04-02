'use client';

import { useEffect, useState } from 'react';

interface ScheduledTasksTabContentProps {
  agentId: string;
}

interface CronTask {
  id: string;
  label?: string;
  schedule: string;
  enabled: boolean;
}

export function ScheduledTasksTabContent({ agentId: _agentId }: ScheduledTasksTabContentProps) {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/openclaw/cron')
      .then((r) => r.json())
      .then((data) => setTasks(data.crons ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">定时任务</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-xs text-zinc-500">加载中…</div>
        ) : tasks.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500">暂无定时任务</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {tasks.map((task) => (
              <div key={task.id} className="px-3 py-2">
                <div className="text-sm text-zinc-200 font-medium">{task.label ?? task.id}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{task.schedule}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
