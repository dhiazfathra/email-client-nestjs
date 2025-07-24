import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Minimal application module for Deno compatibility
 * This is a stripped-down version that excludes all modules that might
 * transitively import cache-manager or other Node.js-specific features
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
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

    // No feature modules to avoid potential cache-manager dependencies
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
export class DenoMinimalAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Add simplified middleware configuration for Deno
    // No metrics or tracing middleware for Deno version
    consumer.apply().forRoutes('*');
  }
}
