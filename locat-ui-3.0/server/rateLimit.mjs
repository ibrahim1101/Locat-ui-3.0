/** Adapted from original Locat api/rateLimit.ts; bounded, per-process buckets. */
export function createRateLimiter(maximum = 20, windowMs = 60000, now = Date.now) {
  const buckets = new Map();
  return key => {
    const time = now();
    if (buckets.size > 10000) for (const [name, value] of buckets) if (value.reset <= time) buckets.delete(name);
    const current = buckets.get(key);
    if (current && current.reset > time) {
      if (current.count >= maximum) return Math.max(1, Math.ceil((current.reset - time) / 1000));
      current.count++;
    } else {
      if (buckets.size >= 20000) return Math.ceil(windowMs / 1000);
      buckets.set(key, { count: 1, reset: time + windowMs });
    }
    return 0;
  };
}
