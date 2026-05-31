import type { RunContext } from "@/lib/types/pipeline";

const RUN_STORE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface TimedRunContext {
  context: RunContext;
  expiresAt: number;
}

const runStore = new Map<string, TimedRunContext>();

// Periodic cleanup every 2 minutes
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [runId, entry] of runStore) {
    if (entry.expiresAt <= now) {
      runStore.delete(runId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[runStore] cleaned up ${cleaned} expired run(s)`);
  }
}, CLEANUP_INTERVAL_MS);

export function saveRunContext(context: RunContext): void {
  runStore.set(context.report.runId, {
    context,
    expiresAt: Date.now() + RUN_STORE_TTL_MS,
  });
}

export function getRunContext(runId: string): RunContext | undefined {
  const entry = runStore.get(runId);
  if (!entry) return undefined;

  // Check expiry on read
  if (entry.expiresAt <= Date.now()) {
    runStore.delete(runId);
    return undefined;
  }

  // Extend TTL on access (sliding window)
  entry.expiresAt = Date.now() + RUN_STORE_TTL_MS;
  return entry.context;
}

export function updateRunContext(runId: string, next: RunContext): void {
  const entry = runStore.get(runId);
  const expiresAt = entry ? entry.expiresAt : Date.now() + RUN_STORE_TTL_MS;
  runStore.set(runId, {
    context: next,
    expiresAt,
  });
}
