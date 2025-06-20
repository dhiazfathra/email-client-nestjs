import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RedisCacheModule } from './cache/cache.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { MetricsMiddleware } from './health/metrics.middleware';
import { TracingModule } from './tracing/tracing.module';
import { TracingMiddleware } from './tracing/tracing.middleware';
import { ChaosModule } from './chaos/chaos.module';
import { TestModule } from './test/test.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // time to live in seconds
        limit: 10, // the maximum number of requests within the TTL
      },
    ]),
    RedisCacheModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    TracingModule,
    ChaosModule,
    TestModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, TracingMiddleware).forRoutes('*');
  }
}
