import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip rate limiting for specific routes or controllers.
 * Can be applied to either individual methods or entire controller classes.
 *
 * @example
 * // Skip throttling for a specific route
 * @SkipThrottle()
 * @Get('health')
 * checkHealth() { ... }
 *
 * @example
 * // Skip throttling for an entire controller
 * @SkipThrottle()
 * @Controller('health')
 * export class HealthController { ... }
 */
export const SkipThrottle = () => SetMetadata('skipThrottle', true);
