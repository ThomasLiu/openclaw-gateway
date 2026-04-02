'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(m => ({ default: m.DiffEditor })), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceExplorerTabContentProps {
  agentId: string;
}

interface TreeNode {
  name: string;
  relPath: string;
  type: 'file' | 'dir';
  size?: number;
  children?: TreeNode[];
}

interface FileContent {
  content: string;
  path: string;
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/70 flex-shrink-0">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.09a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 flex-shrink-0">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-zinc-600 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkspaceExplorerTabContent({ agentId }: WorkspaceExplorerTabContentProps) {
  // Tree state
  const [rootLoading, setRootLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // File state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load root tree ─────────────────────────────────────────────────────────
  const loadTree = useCallback(async () => {
    setRootLoading(true);
    setTreeError(null);
    try {
      const res = await fetch(`/api/agent/workspace/${encodeURIComponent(agentId)}/tree?maxDepth=3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTree(data.tree ?? []);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : '加载失败');
      setTree([]);
    } finally {
      setRootLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // ── Toggle directory expansion ──────────────────────────────────────────────
  const toggleDir = useCallback((relPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(relPath)) next.delete(relPath);
      else next.add(relPath);
      return next;
    });
  }, []);

  // ── Load a file ────────────────────────────────────────────────────────────
  const loadFile = useCallback(
    async (relPath: string) => {
      setFileLoading(true);
      setFileLoadError(null);
      setEditMode(false);
      setSaveError(null);
      setSaveSuccess(false);
      setSelectedFile(relPath);

      try {
        const res = await fetch(`/api/agent/workspace/${encodeURIComponent(agentId)}/file?path=${encodeURIComponent(relPath)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data: FileContent = await res.json();
        setOriginalContent(data.content);
        setEditedContent(data.content);
      } catch (err) {
        setFileLoadError(err instanceof Error ? err.message : '加载失败');
        setOriginalContent('');
        setEditedContent('');
      } finally {
        setFileLoading(false);
      }
    },
    [agentId]
  );

  // ── Save file ──────────────────────────────────────────────────────────────
  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/agent/workspace/${encodeURIComponent(agentId)}/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: editedContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      // Update original to current after save
      setOriginalContent(editedContent);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [agentId, selectedFile, editedContent]);

  // ── Enter edit mode ────────────────────────────────────────────────────────
  const enterEditMode = () => {
    setEditedContent(originalContent);
    setEditMode(true);
    setSaveError(null);
  };

  // ── Cancel edit ────────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setEditedContent(originalContent);
    setEditMode(false);
    setSaveError(null);
  };

  // ── Detect language for Monaco ────────────────────────────────────────────
  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
      sh: 'shell', bash: 'shell', py: 'python', go: 'go',
      rs: 'rust', css: 'css', html: 'html', xml: 'xml',
      sql: 'sql', toml: 'toml', ini: 'ini', env: 'shell',
    };
    return map[ext] ?? 'plaintext';
  };

  const fileName = selectedFile ? selectedFile.split('/').pop() ?? selectedFile : '';
  const monacoLang = fileName ? detectLanguage(fileName) : 'plaintext';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.09a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16Z" />
          </svg>
          <span className="text-xs text-zinc-400 font-medium">工作区</span>
        </div>
        <button
          onClick={loadTree}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800"
          title="刷新"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      {/* Body: tree + editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── File Tree ──────────────────────────────────────────────────── */}
        <div className="w-44 flex-shrink-0 border-r border-zinc-800 overflow-y-auto min-h-0 bg-zinc-950/30">
          {rootLoading ? (
            <TreePlaceholder label="加载中…" />
          ) : treeError ? (
            <TreePlaceholder label={`错误: ${treeError}`} />
          ) : tree.length === 0 ? (
            <TreePlaceholder label="工作区为空" />
          ) : (
            <div className="py-1">
              {tree.map((node) => (
                <TreeNodeRow
                  key={node.relPath}
                  node={node}
                  depth={0}
                  expandedDirs={expandedDirs}
                  onToggle={toggleDir}
                  selectedFile={selectedFile}
                  onSelectFile={loadFile}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Editor Panel ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          {selectedFile && (
            <div className="flex-shrink-0 px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between gap-2 bg-zinc-900/30">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileIcon />
                <span className="text-xs text-zinc-300 truncate">{selectedFile}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!editMode ? (
                  <button
                    onClick={enterEditMode}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                    disabled={fileLoading}
                  >
                    编辑
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="text-xs px-2 py-1 text-zinc-400 hover:text-white transition-colors"
                      disabled={saving}
                    >
                      取消
                    </button>
                    <button
                      onClick={saveFile}
                      disabled={saving}
                      className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50"
                    >
                      {saving ? '保存中…' : '保存'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status bar */}
          {editMode && (
            <div className="flex-shrink-0 px-3 py-1 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                左侧：原始版本&nbsp;|&nbsp;右侧：当前编辑
              </span>
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
              {saveSuccess && <span className="text-xs text-green-400">已保存</span>}
            </div>
          )}

          {/* Monaco editor */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {fileLoading ? (
              <EditorPlaceholder label="加载文件…" />
            ) : fileLoadError ? (
              <EditorPlaceholder label={`加载失败: ${fileLoadError}`} />
            ) : !selectedFile ? (
              <EditorPlaceholder label="选择文件查看内容" />
            ) : editMode ? (
              <MonacoDiffEditor
                height="100%"
                language={monacoLang}
                original={originalContent}
                modified={editedContent}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  automaticLayout: true,
                  ariaLabel: '文件差异对比',
                }}
                onMount={(editor) => {
                  // Sync edited content from the modified editor
                  editor.getModifiedEditor().onDidChangeModelContent(() => {
                    setEditedContent(editor.getModifiedEditor().getValue());
                  });
                }}
              />
            ) : (
              <MonacoEditor
                height="100%"
                language={monacoLang}
                value={originalContent}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  automaticLayout: true,
                  ariaLabel: '文件预览',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tree Node Row ─────────────────────────────────────────────────────────────

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  onToggle: (relPath: string) => void;
  selectedFile: string | null;
  onSelectFile: (relPath: string) => void;
}

function TreeNodeRow({ node, depth, expandedDirs, onToggle, selectedFile, onSelectFile }: TreeNodeRowProps) {
  const isDir = node.type === 'dir';
  const isExpanded = expandedDirs.has(node.relPath);
  const isSelected = selectedFile === node.relPath;

  return (
    <div>
      <button
        onClick={() => (isDir ? onToggle(node.relPath) : onSelectFile(node.relPath))}
        className={`w-full text-left flex items-center gap-1 px-2 py-1 text-xs hover:bg-zinc-800/60 transition-colors truncate group ${
          isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-400'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '8px' }}
        title={node.relPath}
      >
        {isDir ? (
          <ChevronIcon open={isExpanded} />
        ) : (
          <span className="w-[10px] flex-shrink-0" />
        )}
        {isDir ? <FolderIcon open={isExpanded} /> : <FileIcon />}
        <span className="truncate">{node.name}</span>
        {node.size !== undefined && (
          <span className="ml-auto text-zinc-600 text-[10px] flex-shrink-0 hidden group-hover:inline">
            {node.size > 1024 ? `${Math.round(node.size / 1024)}k` : node.size}
          </span>
        )}
      </button>
      {isDir && isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.relPath}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              onToggle={onToggle}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Helpers ──────────────────────────────────────────────────────

function TreePlaceholder({ label }: { label: string }) {
  return (
    <div className="p-3 text-xs text-zinc-500">{label}</div>
  );
}

function EditorPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-zinc-600">
      {label}
    </div>
  );
}
