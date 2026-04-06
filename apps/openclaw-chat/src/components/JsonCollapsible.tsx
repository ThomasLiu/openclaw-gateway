"use client";

/**
 * JsonCollapsible - JSON 折叠组件
 *
 * 参考 OpenClaw 源码：ai-reference-sources/openclaw/ui/src/ui/chat/grouped-render.ts
 */

type JsonCollapsibleProps = {
  json: { parsed: unknown; pretty: string };
};

function jsonSummaryLabel(parsed: unknown): string {
  if (Array.isArray(parsed)) return `Array (${parsed.length} item${parsed.length === 1 ? "" : "s"})`;
  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length <= 4) return `{ ${keys.join(", ")} }`;
    return `Object (${keys.length} keys)`;
  }
  return "JSON";
}

export default function JsonCollapsible({ json }: JsonCollapsibleProps) {
  const label = jsonSummaryLabel(json.parsed);

  return (
    <details className="chat-json-collapse">
      <summary className="chat-json-summary">
        <span className="chat-json-badge">JSON</span>
        <span className="chat-json-label">{label}</span>
      </summary>
      <pre className="chat-json-content"><code>{json.pretty}</code></pre>
    </details>
  );
}
