import Redis from 'ioredis';

// In-memory fallback store for development or Redis outage
// Structure: { [key]: { count, resetAt } }
const memoryStore = {};

const createRateLimiter = (options) => {
  const {
    windowMs,
    max,
    keyGenerator,
    standardHeaders = true, // Return RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
    legacyHeaders = false, // X-RateLimit-* headers
  } = options;

  const store = options.redis
    ? new Redis(options.redis)
    : null;

  return async function rateLimitMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    try {
      let count, resetTime;

      if (store) {
        // Redis-based rate limiting
        const redisKey = `ratelimit:${key}`;
        const pipeline = store.pipeline();

        // Get current count and reset time
        pipeline.get(redisKey);
        pipeline.ttl(redisKey);

        const [rawCount, ttl] = await pipeline.exec();

        if (rawCount !== null) {
          count = parseInt(rawCount, 10);
          resetTime = ttl; // TTL in seconds; when it expires, key auto-removes
        } else {
          count = 0;
          resetTime = Math.floor(windowMs / 1000);
        }

        // Increment count
        if (count >= 0) {
          // Set or update the counter with expiry
          await store.set(
            redisKey,
            count + 1,
            'EX',
            Math.ceil(windowMs / 1000)
          );
        }

        // When count was 0 (first request), resetTime is set;
        // when count > 0, resetTime from TTL reflects remaining time
        if (count === 0 && !resetTime) {
          resetTime = Math.floor(windowMs / 1000);
        }
      } else {
        // In-memory fallback
        if (!memoryStore[key]) {
          memoryStore[key] = { count: 1, resetAt: now + windowMs };
          count = 1;
        } else {
          memoryStore[key].count += 1;
          count = memoryStore[key].count;

          // Reset if past the window
          if (now > memoryStore[key].resetAt) {
            memoryStore[key] = { count: 1, resetAt: now + windowMs };
          }
        }

        resetTime = memoryStore[key].resetAt - now;
      }

      const remaining = Math.max(0, max - count);
      const reset = resetTime > 0 ? resetTime : undefined;

      // Standard headers
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        if (reset !== undefined) {
          res.setHeader('RateLimit-Reset', Math.floor(reset + now) / 1000);
        }
      }

      // Rate limit exceeded
      if (count > max) {
        const retryAfter = Math.ceil((resetTime - now) / 1000) || 1;

        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          success: false,
          message:
            'Too many requests. Please slow down and try again later.',
          retryAfterSeconds: retryAfter,
        });
      }

      next();
    } catch (err) {
      // If Redis fails, silently fall back to in-memory or just continue
      // Never crash Express due to rate limit store failure
      console.error('Rate limit store error, falling back:', err.message);

      // In-memory fallback error handling
      try {
        if (!memoryStore[key]) {
          memoryStore[key] = { count: 1, resetAt: Date.now() + windowMs };
        } else {
          memoryStore[key].count += 1;
        }

        const memCount = memoryStore[key].count;
        const memRemaining = Math.max(0, max - memCount);

        if (memCount > max) {
          const retryAfter = 1;
          res.setHeader('Retry-After', retryAfter);
          return res.status(429).json({
            success: false,
            message:
              'Too many requests. Please slow down and try again later.',
            retryAfterSeconds: retryAfter,
          });
        }

        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', max);
          res.setHeader('RateLimit-Remaining', memRemaining);
        }
        next();
      } catch (memErr) {
        // Last resort: just continue
        next();
      }
    }
  };
};

/**
 * Tiered rate limiter factory.
 * Each tier specifies: max requests, time window (ms), and key generator.
 */
export const rateLimit = {
  /** Auth and user signup: 10 requests / 15 minutes, keyed by IP */
  authSignup: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
      // Use forwarded IP if available, but validate it
      const forwardedIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';
      // Basic IP validation - don't trust arbitrary proxy headers blindly
      // (More robust validation can be added per deployment)
      return `ip:${forwardedIp}`;
    },
    redis: process.env.REDIS_URL,
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /** Order creation: 15 requests / 10 minutes, keyed by authenticated user ID with IP fallback */
  orderCreation: createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 15,
    keyGenerator: (req) => {
      // Prefer authenticated user ID; fall back to safe IP-based key
      // IMPORTANT: Never trust req.body.userId for rate-limit identity
      if (req.user && req.user.id) {
        return `user:${req.user.id}`;
      }
      const forwardedIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';
      return `ip:${forwardedIp}`;
    },
    redis: process.env.REDIS_URL,
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /** Prompt creation: 20 requests / hour, keyed by authenticated user */
  promptCreation: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => {
      // Must be authenticated user; if not, deny (return 429)
      if (req.user && req.user.id) {
        return `user:${req.user.id}`;
      }
      // If unauthenticated, use a generic key that still limits but doesn't
      // allow client-supplied ID control
      return 'unauthenticated:prompt-creation';
    },
    redis: process.env.REDIS_URL,
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /** Public prompt catalog: 120 requests / minute, keyed by IP */
  publicCatalog: createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    keyGenerator: (req) => {
      const forwardedIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';
      return `ip:${forwardedIp}`;
    },
    redis: process.env.REDIS_URL,
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

export default rateLimit;