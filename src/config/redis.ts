// src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis ready');
});

// Cache helper functions
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Redis GET error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: string,
  expirySeconds: number = 300
): Promise<void> => {
  try {
    await redisClient.setex(key, expirySeconds, value);
  } catch (error) {
    logger.error('Redis SET error:', error);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis DEL error:', error);
  }
};

export const cacheGetJSON = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis GET JSON error:', error);
    return null;
  }
};

export const cacheSetJSON = async (
  key: string,
  value: any,
  expirySeconds: number = 300
): Promise<void> => {
  try {
    await redisClient.setex(key, expirySeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis SET JSON error:', error);
  }
};
