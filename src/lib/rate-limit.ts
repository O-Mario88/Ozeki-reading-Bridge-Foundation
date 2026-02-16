type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

declare global {
  var __orbfRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

const buckets = globalThis.__orbfRateLimitBuckets ?? new Map<string, RateLimitBucket>();

if (!globalThis.__orbfRateLimitBuckets) {
  globalThis.__orbfRateLimitBuckets = buckets;
}

export function consumeRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  bucket.count += 1;
  buckets.set(key, bucket);

  const retryAfterMs = Math.max(bucket.resetAt - now, 0);
  const allowed = bucket.count <= options.maxRequests;

  return {
    allowed,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    remaining: Math.max(options.maxRequests - bucket.count, 0),
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
