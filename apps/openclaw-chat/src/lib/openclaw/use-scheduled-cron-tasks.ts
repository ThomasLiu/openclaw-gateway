import { useCallback, useEffect, useState } from 'react';

export interface CronTask {
  id: string;
  label?: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  command?: string;
  description?: string;
}

interface UseScheduledCronTasksResult {
  tasks: CronTask[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  refreshing: boolean;
  createTask: (task: Omit<CronTask, 'id'>) => Promise<void>;
  updateTask: (task: CronTask) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useScheduledCronTasks(): UseScheduledCronTasksResult {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/openclaw/cron');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data.crons ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(false);
  }, [fetchTasks]);

  const createTask = useCallback(
    async (task: Omit<CronTask, 'id'>) => {
      setCreating(true);
      try {
        const res = await fetch('/api/openclaw/cron', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', params: { ...task } }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'HTTP ' + res.status }));
          throw new Error(err.error ?? '创建失败');
        }
        await fetchTasks(true);
      } finally {
        setCreating(false);
      }
    },
    [fetchTasks]
  );

  const updateTask = useCallback(
    async (task: CronTask) => {
      const res = await fetch('/api/openclaw/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', params: task }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'HTTP ' + res.status }));
        throw new Error(err.error ?? '更新失败');
      }
      await fetchTasks(true);
    },
    [fetchTasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      const res = await fetch('/api/openclaw/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'HTTP ' + res.status }));
        throw new Error(err.error ?? '删除失败');
      }
      await fetchTasks(true);
    },
    [fetchTasks]
  );

  return {
    tasks,
    loading,
    error,
    creating,
    refreshing,
    createTask,
    updateTask,
    removeTask,
    refresh: () => fetchTasks(true),
  };
}
