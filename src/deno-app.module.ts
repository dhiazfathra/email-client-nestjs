import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DenoCacheService } from './cache/deno-cache.service';
import { EmailModule } from './email/email.module';
import { MicrosoftGraphModule } from './microsoft-graph/microsoft-graph.module';
import { UsersModule } from './users/users.module';

/**
 * Main application module for Deno compatibility
 * This is a modified version of AppModule that uses DenoCacheService
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Cache configuration
    CacheModule.register({
      isGlobal: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60),
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    EmailModule,
    MicrosoftGraphModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Use Deno-compatible cache service
    DenoCacheService,
  ],
  exports: [DenoCacheService],
})
export class DenoAppModule {}
