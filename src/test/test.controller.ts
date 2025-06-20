import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('test')
@Controller('test')
export class TestController {
  @Get('rate-limit')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 10000 } }) // Strict rate limit for testing: 3 requests per 10 seconds
  @ApiOperation({ summary: 'Test endpoint for rate limiting' })
  @ApiResponse({ status: 200, description: 'Returns a test message' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  testRateLimit(): { message: string } {
    return { message: 'Rate limit test endpoint' };
  }
}
