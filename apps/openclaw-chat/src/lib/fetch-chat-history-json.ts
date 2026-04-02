/**
 * Inflight deduplication for concurrent chat history requests.
 */
const inflightKeys = new Map<string, Promise<unknown>>();

export async function fetchChatHistoryJsonDeduped(
  url: string,
  options?: Parameters<typeof fetch>[1]
): Promise<unknown> {
  const existing = inflightKeys.get(url);
  if (existing) return existing;

  const promise = fetch(url, options)
    .then((r) => r.json())
    .finally(() => {
      inflightKeys.delete(url);
    });

  inflightKeys.set(url, promise);
  return promise;
}
