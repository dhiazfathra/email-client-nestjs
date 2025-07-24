/**
 * Complete mock implementation of the cache module for Deno compatibility
 * This file provides a fully self-contained cache implementation without any external dependencies
 */

import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define the Cache interface that matches what's expected by the application
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}

// Create a mock cache implementation
const createMemoryCache = (): Cache => {
  // In-memory storage
  const storage = new Map<string, { value: unknown; expires: number | null }>();
  const defaultTtl = 30; // Default TTL in seconds

  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      console.log(`[Deno Cache] Get: ${key}`);
      const item = storage.get(key);

      if (!item) {
        return undefined;
      }

      // Check if expired
      if (item.expires && item.expires < Date.now()) {
        storage.delete(key);
        return undefined;
      }

      return item.value as T;
    },

    set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
      console.log(`[Deno Cache] Set: ${key}, TTL: ${ttl ?? defaultTtl}`);
      const expires = ttl ? Date.now() + ttl * 1000 : null;
      storage.set(key, { value, expires });
    },

    del: async (key: string): Promise<void> => {
      console.log(`[Deno Cache] Delete: ${key}`);
      storage.delete(key);
    },

    reset: async (): Promise<void> => {
      console.log('[Deno Cache] Reset');
      storage.clear();
    },
  };
};

// Create the cache manager token
export const CACHE_MANAGER = 'CACHE_MANAGER';

// Create the cache service implementation
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private isRedisEnabled = true;
  private chaosProbability = 0;
  private readonly cacheManager: Cache;

  constructor(private readonly configService: ConfigService) {
    this.cacheManager = createMemoryCache();
  }

  async onModuleInit(): Promise<void> {
    this.chaosProbability = this.configService.get<number>(
      'CHAOS_REDIS_PROBABILITY',
      0,
    );
  }

  private shouldSimulateFailure(): boolean {
    return this.chaosProbability > 0 && Math.random() < this.chaosProbability;
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn(
        `[Chaos] Cache disabled for get operation on key ${key}`,
      );
      return undefined;
    }

    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn(
        `[Chaos] Cache disabled for set operation on key ${key}`,
      );
      return;
    }

    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn(
        `[Chaos] Cache disabled for del operation on key ${key}`,
      );
      return;
    }

    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn(
        `[Chaos] Cache disabled, directly executing factory for key ${key}`,
      );
      return factory();
    }

    const cachedValue = await this.get<T>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    try {
      const newValue = await factory();
      await this.set(key, newValue, ttl);
      return newValue;
    } catch (error) {
      this.logger.error(
        `Failed to execute factory function for cache key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async toggleRedis(enabled: boolean): Promise<void> {
    this.isRedisEnabled = enabled;
    this.logger.log(`Redis cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  async setChaosProbability(probability: number): Promise<void> {
    this.chaosProbability = probability;
    this.logger.log(`Set Redis chaos probability to ${probability}`);
  }
}

// Create the cache module
@Global()
@Module({
  providers: [
    {
      provide: CACHE_MANAGER,
      useFactory: () => createMemoryCache(),
    },
    CacheService,
  ],
  exports: [CacheService, CACHE_MANAGER],
})
export class CacheModule {}
