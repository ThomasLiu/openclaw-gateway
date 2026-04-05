"use client";

/**
 * AgentConfigModal - Agent 配置编辑弹窗
 *
 * 使用 Monaco Editor 的 Diff Editor，左右对比并可直接编辑
 */

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Monaco Editor 动态导入（ssr: false）
const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-zinc-500">加载编辑器...</div> }
);

export interface AgentConfigModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 保存成功后的回调 */
  onSaved: () => void;
}

export default function AgentConfigModal({
  open,
  onClose,
  onSaved,
}: AgentConfigModalProps) {
  const [originalJson, setOriginalJson] = useState<string>("");
  const [editedJson, setEditedJson] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cliOutput, setCliOutput] = useState<string>("");

  // 加载当前配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCliOutput("");

    try {
      const resp = await fetch("/api/openclaw/cli-exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config",
          args: ["get", "agents.list", "--json"],
        }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "stdout") {
                output += data.text;
              } else if (data.type === "stderr") {
                output += data.text;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      let json: unknown;
      try {
        json = JSON.parse(output);
      } catch {
        throw new Error(`Invalid JSON output: ${output.slice(0, 200)}`);
      }

      const formatted = JSON.stringify(json, null, 2);
      setOriginalJson(formatted);
      setEditedJson(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开弹窗时加载配置
  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open, loadConfig]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    setCliOutput("");
    setError(null);

    try {
      // 验证 JSON
      JSON.parse(editedJson);

      const resp = await fetch("/api/openclaw/cli-exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config",
          args: ["set", "agents.list", editedJson, "--json"],
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "stdout" || data.type === "stderr") {
                setCliOutput((prev) => prev + data.text);
              } else if (data.type === "error") {
                setCliOutput((prev) => prev + `\n错误: ${data.text}`);
              } else if (data.type === "done") {
                if (data.exitCode !== 0) {
                  setCliOutput((prev) => prev + `\n命令退出码: ${data.exitCode}`);
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      setCliOutput((prev) => prev + "\n\n配置已保存！");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const hasChanges = originalJson !== editedJson;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
        onClick={saving ? undefined : onClose}
      >
        {/* 弹窗主体 */}
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden flex flex-col"
          style={{ height: "85vh", maxHeight: "800px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-semibold text-zinc-200">
                Agent 配置
              </h2>
              {loading && (
                <span className="text-xs text-zinc-500">加载中...</span>
              )}
              {hasChanges && (
                <span className="text-xs text-yellow-500">有未保存的更改</span>
              )}
            </div>
            <button
              onClick={saving ? undefined : onClose}
              disabled={saving}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Monaco Diff Editor */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                加载中...
              </div>
            ) : (
              <MonacoDiffEditor
                original={originalJson}
                modified={editedJson}
                language="json"
                theme="vs-dark"
                options={{
                  readOnly: false,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  automaticLayout: true,
                  wordWrap: "on",
                  renderIndicators: true,
                  renderOverviewRuler: true,
                }}
                onMount={(editor) => {
                  // 监听修改侧的变更
                  const modifiedEditor = editor.getModifiedEditor();
                  modifiedEditor.onDidChangeModelContent(() => {
                    const value = modifiedEditor.getValue();
                    setEditedJson(value);
                  });
                }}
              />
            )}
          </div>

          {/* CLI 输出 */}
          {cliOutput && (
            <div className="border-t border-zinc-800 max-h-32 overflow-auto">
              <div className="px-4 py-2 bg-zinc-950">
                <p className="text-xs text-zinc-500 mb-1">CLI 输出</p>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {cliOutput}
                </pre>
              </div>
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-500">
              使用 <code className="bg-zinc-800 px-1 rounded">openclaw config set agents.list</code> 保存配置
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading || !hasChanges}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
