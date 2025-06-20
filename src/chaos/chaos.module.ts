import { Module } from '@nestjs/common';
import { ChaosController } from './chaos.controller';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [RedisCacheModule],
  controllers: [ChaosController],
})
export class ChaosModule {}
