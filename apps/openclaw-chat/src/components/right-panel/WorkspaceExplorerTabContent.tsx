'use client';

import { useEffect, useState } from 'react';

interface WorkspaceExplorerTabContentProps {
  agentId: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function WorkspaceExplorerTabContent({ agentId }: WorkspaceExplorerTabContentProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    fetch(`/api/openclaw/config`)
      .then((r) => r.json())
      .then((data) => {
        // Workspace path from config
        const workspacePath = data?.workspace?.path ?? data?.agents?.workspacePath;
        if (workspacePath) {
          // Build a simple root tree with the workspace path
          setTree([{ name: workspacePath.split('/').pop() ?? 'workspace', path: workspacePath, type: 'directory' }]);
        } else {
          setTree([]);
        }
      })
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  const loadFile = (path: string) => {
    setLoadingFile(true);
    setSelectedFile(path);
    fetch(`/api/agent/workspace/${encodeURIComponent(agentId)}/file?path=${encodeURIComponent(path)}`)
      .then((r) => r.text())
      .then(setFileContent)
      .catch(() => setFileContent('# 加载失败\n\n无法读取此文件'))
      .finally(() => setLoadingFile(false));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">工作区</span>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File tree */}
        <div className="w-36 flex-shrink-0 border-r border-zinc-800 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-3 text-xs text-zinc-500">加载中…</div>
          ) : tree.length === 0 ? (
            <div className="p-3 text-xs text-zinc-500">工作区为空</div>
          ) : (
            tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                expandedDirs={expandedDirs}
                onToggle={(path) => {
                  setExpandedDirs((prev) => {
                    const next = new Set(prev);
                    if (next.has(path)) next.delete(path);
                    else next.add(path);
                    return next;
                  });
                }}
                selectedFile={selectedFile}
                onSelectFile={(path) => loadFile(path)}
              />
            ))
          )}
        </div>

        {/* File preview */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {loadingFile ? (
            <div className="p-3 text-xs text-zinc-500">加载中…</div>
          ) : fileContent !== null ? (
            <div className="flex-1 min-h-0 overflow-auto p-3">
              <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">
                {fileContent}
              </pre>
            </div>
          ) : (
            <div className="p-3 text-xs text-zinc-500">选择文件查看内容</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

function FileTreeNode({ node, depth, expandedDirs, onToggle, selectedFile, onSelectFile }: FileTreeNodeProps) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;

  return (
    <div>
      <button
        onClick={() => (node.type === 'directory' ? onToggle(node.path) : onSelectFile(node.path))}
        className={`w-full text-left px-2 py-1 text-xs hover:bg-zinc-800 transition-colors truncate ${
          isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-400'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="mr-1">{node.type === 'directory' ? (isExpanded ? '📂' : '📁') : '📄'}</span>
        {node.name}
      </button>
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
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
