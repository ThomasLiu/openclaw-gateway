import type { UiMessage, MessageRole } from "./chat-types";
import { ChatMarkdown } from "./ChatMarkdown";

export interface ChatMessageGroupProps {
  id?: string;
  role: MessageRole;
  messages: UiMessage[];
}

/**
 * Group consecutive messages by role.
 */
export function groupMessages(messages: UiMessage[]): ChatMessageGroupProps[] {
  const groups: ChatMessageGroupProps[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === msg.role) {
      last.messages.push(msg);
    } else {
      groups.push({ role: msg.role, messages: [msg], id: `group-${groups.length}` });
    }
  }
  return groups;
}

/**
 * Renders a group of same-role messages.
 */
export function ChatMessageGroup({ role, messages }: ChatMessageGroupProps) {
  if (role === "user") {
    return (
      <div className="flex flex-col gap-1">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 ml-12">
            {msg.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg) => (
        <div key={msg.id} className="text-sm text-zinc-100">
          <ChatMarkdown content={msg.content} />
          {msg.toolCards && msg.toolCards.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {msg.toolCards.map((card) => (
                <span
                  key={card.id}
                  className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-400 text-xs rounded px-2 py-0.5"
                >
                  ⚙ {card.name}
                </span>
              ))}
            </div>
          )}
          {msg.meta?.model && (
            <div className="mt-1 text-xs text-zinc-500">{msg.meta.model}</div>
          )}
        </div>
      ))}
    </div>
  );
}
