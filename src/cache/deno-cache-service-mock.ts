/**
 * Mock implementation of cache.service.ts for Deno compatibility
 * This file redirects imports of the original cache.service.ts to our Deno-compatible implementation
 */

// Re-export DenoCacheService as CacheService
export { DenoCacheService as CacheService } from './deno-cache.service.ts';
