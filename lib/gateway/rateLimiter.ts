interface RateLimiterEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const store = new Map<string, RateLimiterEntry>();

// Periodic cleanup of expired entries to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[rateLimiter] cleaned up ${cleaned} expired rate limit entries`);
  }
}, CLEANUP_INTERVAL_MS);

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  store.set(key, entry);

  return { allowed: true };
}
