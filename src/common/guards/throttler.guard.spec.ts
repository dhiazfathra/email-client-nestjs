import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerException } from '@nestjs/throttler';
import { RateLimitGuard } from './throttler.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let _reflector: Reflector;

  // Mock current time for consistent tests
  const originalDateNow = Date.now;
  let mockedTime = 1000000000000; // Starting timestamp

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    _reflector = module.get<Reflector>(Reflector);

    // Mock Date.now to return controlled timestamps
    Date.now = jest.fn(() => mockedTime);
  });

  afterEach(() => {
    // Restore original Date.now implementation
    Date.now = originalDateNow;
  });

  function createMockExecutionContext(
    ip: string = '127.0.0.1',
    path: string = '/test',
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          path,
        }),
      }),
    } as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow requests within rate limit', async () => {
    const context = createMockExecutionContext();

    // Make multiple requests but stay under the limit (default is 10)
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  function createMockExecutionContextWithoutIp(
    path: string = '/test',
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          undefined,
          path,
        }),
      }),
    } as ExecutionContext;
  }

  it('should allow requests within rate limit with undefined ip', async () => {
    const context = createMockExecutionContextWithoutIp();

    // Make multiple requests but stay under the limit (default is 10)
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  it('should block requests that exceed rate limit', async () => {
    const context = createMockExecutionContext();

    // Make requests up to the limit (default is 10)
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }

    // The next request should be blocked
    await expect(guard.canActivate(context)).rejects.toThrow(
      ThrottlerException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Too many requests',
    );
  });

  it('should track different IP addresses separately', async () => {
    const context1 = createMockExecutionContext('192.168.1.1');
    const context2 = createMockExecutionContext('192.168.1.2');

    // Make requests for first IP up to the limit
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context1);
      expect(result).toBe(true);
    }

    // First IP should be blocked now
    await expect(guard.canActivate(context1)).rejects.toThrow(
      ThrottlerException,
    );

    // Second IP should still be allowed
    const result = await guard.canActivate(context2);
    expect(result).toBe(true);
  });

  it('should track different paths separately', async () => {
    const context1 = createMockExecutionContext('127.0.0.1', '/path1');
    const context2 = createMockExecutionContext('127.0.0.1', '/path2');

    // Make requests for first path up to the limit
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context1);
      expect(result).toBe(true);
    }

    // First path should be blocked now
    await expect(guard.canActivate(context1)).rejects.toThrow(
      ThrottlerException,
    );

    // Second path should still be allowed
    const result = await guard.canActivate(context2);
    expect(result).toBe(true);
  });

  it('should handle undefined IP address', async () => {
    const context = createMockExecutionContext(undefined, '/test');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reset counter after the time window passes', async () => {
    const context = createMockExecutionContext();

    // Make requests up to the limit
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }

    // The next request should be blocked
    await expect(guard.canActivate(context)).rejects.toThrow(
      ThrottlerException,
    );

    // Move time forward past the TTL window (default is 60000ms = 1 minute)
    mockedTime += 61000;

    // Request should be allowed again
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should handle concurrent requests correctly', async () => {
    const context = createMockExecutionContext();

    // Simulate concurrent requests by not awaiting them initially
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(guard.canActivate(context));
    }

    // All should resolve to true
    const results = await Promise.all(promises);
    expect(results.every((result) => result === true)).toBe(true);

    // The next request should be blocked
    await expect(guard.canActivate(context)).rejects.toThrow(
      ThrottlerException,
    );
  });

  it('should partially reset the counter for partial time window', async () => {
    const context = createMockExecutionContext();

    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await guard.canActivate(context);
    }

    // Move time forward past the TTL window
    mockedTime += 61000;

    // Make more requests up to the limit
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }

    // The next request should be blocked
    await expect(guard.canActivate(context)).rejects.toThrow(
      ThrottlerException,
    );
  });
});
