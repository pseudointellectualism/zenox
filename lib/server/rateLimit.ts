import "server-only";

/**
 * In-memory failed-attempt throttle for the admin login.
 *
 * Deliberately per-process and not backed by a store: this deployment runs a
 * single instance, and a lock that lives in memory cannot itself be poisoned
 * remotely. Counters reset on restart, which is acceptable — restarting is an
 * operator action, not something an attacker can trigger.
 *
 * Only failures count. A correct password clears the record, so normal use is
 * never throttled.
 */

interface Attempt {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 6;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;

const attempts = new Map<string, Attempt>();

function sweep(now: number) {
  // Bound the map so a spray of forged client IPs cannot grow it without limit.
  if (attempts.size < MAX_TRACKED) return;
  for (const [key, record] of attempts) {
    if (record.lockedUntil < now && now - record.firstFailureAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

export interface RateLimitState {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(key: string): RateLimitState {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) return { allowed: true, retryAfterSeconds: 0, remaining: MAX_FAILURES };

  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  if (now - record.firstFailureAt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true, retryAfterSeconds: 0, remaining: MAX_FAILURES };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, MAX_FAILURES - record.failures),
  };
}

export function recordFailure(key: string): RateLimitState {
  const now = Date.now();
  sweep(now);

  const record = attempts.get(key);
  if (!record || now - record.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
    return { allowed: true, retryAfterSeconds: 0, remaining: MAX_FAILURES - 1 };
  }

  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
      remaining: 0,
    };
  }

  return { allowed: true, retryAfterSeconds: 0, remaining: MAX_FAILURES - record.failures };
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
