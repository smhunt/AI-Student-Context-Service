import type { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter.
 *
 * Uses a sliding window approach per IP + route prefix.
 * For production at scale, replace with Redis-backed limiter.
 */
const buckets = new Map<string, RateLimitBucket>();

// Clean up expired buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const prefix = opts.keyPrefix || req.baseUrl || req.path;
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    // Set rate limit headers
    const remaining = Math.max(0, opts.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', opts.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'Too many requests',
        retry_after_seconds: retryAfter,
      });
      return;
    }

    next();
  };
}

// Pre-configured limiters
export const chatRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyPrefix: 'chat',
});

export const adminRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyPrefix: 'admin',
});

export const openaiCompatRateLimit = rateLimit({
  windowMs: 60_000,
  max: 100,
  keyPrefix: 'v1',
});

export const mcpHttpRateLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  keyPrefix: 'mcp',
});
