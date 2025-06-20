import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CacheService } from '../cache/cache.service';

export class ToggleRedisDto {
  enabled: boolean;
}

export class SetChaosProbabilityDto {
  probability: number;
}

@ApiTags('Chaos Testing')
@Controller('chaos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ChaosController {
  constructor(private readonly cacheService: CacheService) {}

  @Post('toggle-redis')
  @ApiOperation({ summary: 'Toggle Redis cache on/off' })
  @ApiResponse({ status: 200, description: 'Redis cache toggled successfully' })
  async toggleRedis(@Body() dto: ToggleRedisDto) {
    await this.cacheService.toggleRedis(dto.enabled);
    return { message: `Redis cache ${dto.enabled ? 'enabled' : 'disabled'}` };
  }

  @Post('set-probability')
  @ApiOperation({ summary: 'Set Redis failure probability' })
  @ApiResponse({ status: 200, description: 'Probability set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid probability value' })
  async setProbability(@Body() dto: SetChaosProbabilityDto) {
    if (dto.probability < 0 || dto.probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    await this.cacheService.setChaosProbability(dto.probability);
    return { message: `Set Redis chaos probability to ${dto.probability}` };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current chaos testing status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getStatus() {
    return {
      message: 'Chaos testing status',
      redisEnabled: this.cacheService['isRedisEnabled'],
      chaosProbability: this.cacheService['chaosProbability'],
    };
  }
}
