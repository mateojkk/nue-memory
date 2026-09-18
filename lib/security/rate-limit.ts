/**
 * Security Rate Limiter
 * Implements an in-memory sliding window rate limiter for API endpoints.
 * Protects Livepeer compute calls and database mutations against automated spam and Denial of Wallet.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection every 3 minutes (unref so timer does not block process exit)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 180000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and updates rate limit for a specific key
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const oldestTimestamp = record.timestamps[0] || now;
  const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  if (record.timestamps.length >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetSeconds,
  };
}

/**
 * Extracts a client identifier (IP address or fallback) from incoming request headers
 */
export function getClientIdentifier(request: Request, userEmail?: string | null): string {
  if (userEmail && userEmail.trim()) {
    return `user:${userEmail.trim().toLowerCase()}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return `ip:${ip}`;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return `ip:${realIp.trim()}`;

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return `ip:${cfIp.trim()}`;

  return 'ip:unknown';
}
