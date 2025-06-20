import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrometheusController } from './prometheus.controller';
import { MetricsService } from './metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController, PrometheusController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class HealthModule {}
