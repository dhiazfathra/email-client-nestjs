import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define Cache type for Deno compatibility
type Cache = {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
};

@Injectable()
export class DenoCacheService implements OnModuleInit {
  private readonly logger = new Logger(DenoCacheService.name);
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

  async reset(): Promise<void> {
    if (!this.isRedisEnabled || this.shouldSimulateFailure()) {
      this.logger.warn('[Chaos] Cache disabled for reset operation');
      return;
    }

    try {
      await this.cacheManager.reset();
    } catch (error) {
      this.logger.error('Failed to reset cache:', error);
    }
  }
}
