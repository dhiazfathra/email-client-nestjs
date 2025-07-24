import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { MicrosoftGraphModule } from './microsoft-graph/microsoft-graph.module';
import { UsersModule } from './users/users.module';
import { DenoCacheModule } from './cache/deno-cache.module';
// Import Deno-compatible modules only
// Exclude modules that depend on Node.js-specific features like RedisCacheModule, PrismaModule, etc.

/**
 * Main application module for Deno compatibility
 * This is a modified version of AppModule that uses DenoCacheService
 * and excludes Node.js-specific modules
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Cache configuration
    DenoCacheModule,

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

    // Feature modules - only include Deno-compatible modules
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
  ],
})
export class DenoAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Add simplified middleware configuration for Deno
    // No metrics or tracing middleware for Deno version
    consumer.apply().forRoutes('*');
  }
}
