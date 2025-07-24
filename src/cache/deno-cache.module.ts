import { Global, Module } from '@nestjs/common';
import { DenoCacheService } from './deno-cache.service';

/**
 * A simplified cache module for Deno that doesn't rely on cache-manager
 */
@Global()
@Module({
  providers: [
    {
      provide: 'CACHE_MANAGER',
      useValue: {
        get: async <T>(key: string): Promise<T | undefined> => {
          console.log(`[Deno Cache] Get: ${key}`);
          return undefined;
        },
        set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
          console.log(`[Deno Cache] Set: ${key}, TTL: ${ttl || 'default'}`);
        },
        del: async (key: string): Promise<void> => {
          console.log(`[Deno Cache] Delete: ${key}`);
        },
        reset: async (): Promise<void> => {
          console.log('[Deno Cache] Reset');
        },
      },
    },
    DenoCacheService,
  ],
  exports: [DenoCacheService, 'CACHE_MANAGER'],
})
export class DenoCacheModule {}
