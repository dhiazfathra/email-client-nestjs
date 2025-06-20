import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../cache/cache.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
