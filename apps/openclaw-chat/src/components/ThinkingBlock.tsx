"use client";

/**
 * ThinkingBlock - 思考内容折叠组件
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ThinkingBlockProps = {
  thinking: string;
};

export default function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  return (
    <details className="chat-thinking">
      <summary className="chat-thinking__summary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500/70">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
          <path d="M12 8v4l3 3"/>
        </svg>
        <span>思考过程</span>
      </summary>
      <div className="chat-thinking__content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {thinking}
        </ReactMarkdown>
      </div>
    </details>
  );
}
