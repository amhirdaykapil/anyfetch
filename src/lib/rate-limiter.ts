interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private cache = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 30, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic cleanup every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.resetAt < now) {
          this.cache.delete(key);
        }
      }
    }, 2 * 60 * 1000).unref();
  }

  public check(identifier: string): { allowed: boolean; remaining: number; resetInSec: number } {
    const now = Date.now();
    const record = this.cache.get(identifier);

    if (!record || record.resetAt < now) {
      this.cache.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInSec: Math.ceil(this.windowMs / 1000),
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSec: Math.ceil((record.resetAt - now) / 1000),
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetInSec: Math.ceil((record.resetAt - now) / 1000),
    };
  }
}

// 30 requests per minute for analysis
export const analyzeRateLimiter = new MemoryRateLimiter(30, 60 * 1000);

// 60 requests per minute for downloads/streams
export const downloadRateLimiter = new MemoryRateLimiter(60, 60 * 1000);

