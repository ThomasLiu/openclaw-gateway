/**
 * Data heartbeat — periodic refresh of session list and status.
 */
type HeartbeatCallback = () => void | Promise<void>;

const intervals: ReturnType<typeof setInterval>[] = [];

export function subscribeDataHeartbeat(
  callback: HeartbeatCallback,
  intervalMs: number = 60_000
): () => void {
  callback(); // immediate first call
  const id = setInterval(() => {
    void callback();
  }, intervalMs);
  intervals.push(id);
  return () => clearInterval(id);
}

export function stopAllHeartbeats(): void {
  for (const id of intervals) clearInterval(id);
  intervals.length = 0;
}
