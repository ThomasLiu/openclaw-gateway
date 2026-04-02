"use client";

import { useEffect, useRef, useState } from "react";

interface LogsTabContentProps {
  agentId: string;
}

export function LogsTabContent({ agentId: _agentId }: LogsTabContentProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/openclaw/logs");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLines((prev) => {
          const next = [...prev, typeof data === "string" ? data : JSON.stringify(data)];
          return next.slice(-500); // keep last 500 lines
        });
        setLoading(false);
      } catch {
        setLines((prev) => [...prev, e.data].slice(-500));
        setLoading(false);
      }
    };

    es.onerror = () => {
      setError("日志流连接失败");
      setLoading(false);
      es.close();
    };

    return () => es.close();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">日志</span>
        {loading && <span className="text-xs text-zinc-500 animate-pulse">连接中…</span>}
      </div>
      {error ? (
        <div className="p-3 text-xs text-red-400">{error}</div>
      ) : (
        <div
          ref={ref}
          className="flex-1 overflow-y-auto font-mono text-xs text-zinc-400 p-2 space-y-0.5 min-h-0"
        >
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
