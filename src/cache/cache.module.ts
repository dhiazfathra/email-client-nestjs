import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          ttl: configService.get('CACHE_TTL', 60 * 5), // Default TTL: 5 minutes
        }),
        isGlobal: true,
      }),
    }),
  ],
  providers: [CacheService, ConfigService],
  exports: [CacheModule, CacheService],
})
export class RedisCacheModule {}
