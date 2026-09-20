import rateLimit from 'express-rate-limit';

// Helper to exempt local development and loopback requests from strict rate limits
const isDevOrLocalhost = (req) => {
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_RATE_LIMIT !== 'true') {
    return true;
  }
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? String(forwarded).split(',')[0].trim() : req.ip) || req.socket?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.endsWith('127.0.0.1') ||
    ip === 'localhost'
  );
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: isDevOrLocalhost,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  skip: isDevOrLocalhost,
  message: { error: 'You are sending messages too fast. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  skip: isDevOrLocalhost,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  skip: isDevOrLocalhost,
  message: { error: 'Upload rate limit exceeded. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

