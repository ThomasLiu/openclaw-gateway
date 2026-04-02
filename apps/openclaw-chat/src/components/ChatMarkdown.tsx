"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMarkdownProps {
  content: string;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-zinc-900 rounded p-3 overflow-x-auto text-xs font-mono">
                <code className="text-zinc-300">{children}</code>
              </pre>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-zinc-700 px-2 py-1 bg-zinc-800 text-left">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-zinc-700 px-2 py-1">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
