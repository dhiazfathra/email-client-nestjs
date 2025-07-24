import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Deno-compatible cache service implementation
 * This service provides a simple in-memory cache without relying on cache-manager
 */
@Injectable()
export class DenoCacheService implements OnModuleInit {
  private readonly logger = new Logger(DenoCacheService.name);
  private isRedisEnabled = true;
  private chaosProbability = 0;

  // In-memory storage
  private storage = new Map<
    string,
    { value: unknown; expires: number | null }
  >();
  private defaultTtl = 30; // Default TTL in seconds

  constructor(private readonly configService: ConfigService) {}

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
      const item = this.storage.get(key);

      if (!item) {
        return undefined;
      }

      // Check if expired
      if (item.expires && item.expires < Date.now()) {
        this.storage.delete(key);
        return undefined;
      }

      return item.value as T;
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
      const expires = ttl ? Date.now() + ttl * 1000 : null;
      this.storage.set(key, { value, expires });
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
      this.storage.delete(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn('[Chaos] Cache disabled for reset operation');
      return;
    }

    try {
      this.storage.clear();
    } catch (error) {
      this.logger.error('Failed to reset cache:', error);
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
