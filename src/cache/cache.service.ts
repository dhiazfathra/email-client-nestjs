import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private isRedisEnabled = true;
  private chaosProbability = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

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
        `[Chaos] Cache disabled for delete operation on key ${key}`,
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
