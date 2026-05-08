// Lightweight in-memory token-bucket rate limiter.
// For production scale, swap the Map for Redis (Upstash works well with Vercel).

type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: opts.max, last: now };

  // Refill proportionally to elapsed time.
  const elapsed = now - bucket.last;
  const refill = (elapsed / opts.windowMs) * opts.max;
  bucket.tokens = Math.min(opts.max, bucket.tokens + refill);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return { ok: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.floor(bucket.tokens) };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
