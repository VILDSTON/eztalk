/**
 * EzTalk Rate Limiter Middleware
 * Memory-efficient, zero-dependency sliding window rate limiter
 * Protects auth endpoints against brute force and APIs against spam.
 */

export function createRateLimiter({
  windowMs = 60 * 1000, // 1 minute window
  max = 10,              // max requests per window
  message = 'Too many requests, please try again later.',
  statusCode = 429,
  keyGenerator = (req) => {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  },
} = {}) {
  const requests = new Map();

  // Periodic cleanup of stale entries every 60 seconds to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
      if (now - record.startTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60 * 1000);

  // Allow process to exit cleanly without keeping event loop alive solely for cleanup
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = requests.get(key);

    if (!record || now - record.startTime > windowMs) {
      // New window
      record = {
        startTime: now,
        count: 1,
      };
      requests.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const resetTime = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', resetTime);
      return res.status(statusCode).json({
        error: message,
        retryAfterSeconds: resetTime,
      });
    }

    next();
  };
}

// Pre-configured rate limiters for EzTalk
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 attempts per minute per IP
  message: 'Too many authentication attempts. Please wait a minute before trying again.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 uploads per minute per IP
  message: 'Upload rate limit exceeded. Please wait a minute.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 10 * 1000, // 10 seconds
  max: 30,             // 30 requests per 10s
  message: 'Too many requests. Please slow down.',
});
