// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const rateLimiter = (maxRequests: number = 100, windowMinutes: number = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: {
      status: 'error',
      message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later',
      });
    },
  });
};

// Specific rate limiters for different endpoints
export const authLimiter = rateLimiter(5, 15); // 5 requests per 15 minutes
export const apiLimiter = rateLimiter(100, 15); // 100 requests per 15 minutes
export const strictLimiter = rateLimiter(3, 15); // 3 requests per 15 minutes
