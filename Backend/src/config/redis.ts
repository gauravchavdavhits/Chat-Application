import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisPubClient: Redis | null = null;
let redisSubClient: Redis | null = null;
let isRedisConnected = false;

// Initialize Redis client only if explicitly enabled
if (config.redisEnabled) {
  try {
    redisClient = new Redis(config.redisUri, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 2) {
          logger.warn('⚠️ Redis unreachable. Operating in fallback local-cache mode.');
          return null;
        }
        return Math.min(times * 1000, 2000);
      },
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('⚡ Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      logger.warn(`⚠️ Redis Connection warning: ${err.message}`);
    });

    // Dedicated Pub & Sub clients for Socket.IO Redis adapter
    redisPubClient = redisClient.duplicate();
    redisSubClient = redisClient.duplicate();
  } catch (err: any) {
    logger.warn(`⚠️ Failed to initialize Redis: ${err.message}`);
  }
} else {
  logger.info('ℹ️ Redis is disabled. Operating in fast in-memory mode.');
}

/**
 * Cache helper functions that safely fall back to in-memory/no-op if Redis is offline
 */
export const redisCache = {
  /**
   * Set a key with TTL (seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } catch (err: any) {
      logger.warn(`Redis set error for key [${key}]: ${err.message}`);
    }
  },

  /**
   * Get a cached value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!redisClient || !isRedisConnected) return null;
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (err: any) {
      logger.warn(`Redis get error for key [${key}]: ${err.message}`);
      return null;
    }
  },

  /**
   * Delete a key or pattern from cache
   */
  async del(key: string): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      await redisClient.del(key);
    } catch (err: any) {
      logger.warn(`Redis del error for key [${key}]: ${err.message}`);
    }
  },

  /**
   * Delete multiple keys matching a pattern (e.g. "users:*")
   */
  async delPattern(pattern: string): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err: any) {
      logger.warn(`Redis delPattern error: ${err.message}`);
    }
  },

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return isRedisConnected;
  },
};

export { redisClient, redisPubClient, redisSubClient };
