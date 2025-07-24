import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DenoCacheService } from './deno-cache.service';

describe('DenoCacheService', () => {
  let service: DenoCacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DenoCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              if (key === 'CHAOS_REDIS_PROBABILITY') {
                return 0.2; // Return test value for chaos probability
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DenoCacheService>(DenoCacheService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should set chaos probability from config', async () => {
      await service.onModuleInit();
      expect(configService.get).toHaveBeenCalledWith(
        'CHAOS_REDIS_PROBABILITY',
        0,
      );
    });
  });

  describe('get', () => {
    it('should return undefined when cache is disabled', async () => {
      await service.toggleRedis(false);
      const result = await service.get('test-key');
      expect(result).toBeUndefined();
    });

    it('should return undefined when chaos is triggered', async () => {
      // Force chaos to trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Less than the 0.2 probability

      const result = await service.get('test-key');
      expect(result).toBeUndefined();
    });

    it('should return undefined when key not found', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const result = await service.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should return value when key exists and not expired', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should return undefined and delete key when expired', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'expired-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 1; // 1 second TTL

      await service.set(key, value, ttl);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const mockNow = jest.fn().mockReturnValue(originalNow() + 2000); // 2 seconds later
      global.Date.now = mockNow;

      const result = await service.get(key);

      expect(result).toBeUndefined();

      // Restore original Date.now
      global.Date.now = originalNow;
    });

    it('should handle errors and return undefined', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      // Force an error
      jest.spyOn(service['storage'], 'get').mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await service.get('error-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should not set value when cache is disabled', async () => {
      await service.toggleRedis(false);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Re-enable cache to check if value was set
      await service.toggleRedis(true);
      const result = await service.get(key);

      expect(result).toBeUndefined();
    });

    it('should not set value when chaos is triggered', async () => {
      // Force chaos to trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Mock storage.get to verify the value wasn't set
      const spy = jest.spyOn(service['storage'], 'get');
      spy.mockReturnValue(undefined);

      // Reset chaos to check if value was set
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = await service.get(key);

      expect(result).toBeUndefined();
    });

    it('should set value with default TTL when not specified', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      const result = await service.get(key);
      expect(result).toEqual(value);
    });

    it('should set value with specified TTL', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 300;

      await service.set(key, value, ttl);

      const result = await service.get(key);
      expect(result).toEqual(value);
    });

    it('should handle errors when setting value', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      // Force an error
      jest.spyOn(service['storage'], 'set').mockImplementation(() => {
        throw new Error('Test error');
      });

      const key = 'error-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Verify the error was logged
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should not delete when cache is disabled', async () => {
      // Ensure chaos doesn't trigger for initial set
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Disable cache and try to delete
      await service.toggleRedis(false);
      await service.del(key);

      // Re-enable cache and check if value still exists
      await service.toggleRedis(true);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should not delete when chaos is triggered', async () => {
      // Ensure chaos doesn't trigger for initial set
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Force chaos to trigger for delete
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      await service.del(key);

      // Mock storage.get to simulate the value still existing
      const spy = jest.spyOn(service['storage'], 'get');
      spy.mockReturnValue({ value, expires: null });

      // Reset chaos and check if value still exists
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should delete key when it exists', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);
      await service.del(key);

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should handle errors when deleting key', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      // Force an error
      jest.spyOn(service['storage'], 'delete').mockImplementation(() => {
        throw new Error('Test error');
      });

      await service.del('error-key');

      // Verify the error was logged
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should not reset when cache is disabled', async () => {
      // Ensure chaos doesn't trigger for initial set
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Disable cache and try to reset
      await service.toggleRedis(false);
      await service.reset();

      // Re-enable cache and check if value still exists
      await service.toggleRedis(true);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should not reset when chaos is triggered', async () => {
      // Ensure chaos doesn't trigger for initial set
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      // Force chaos to trigger for reset
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      await service.reset();

      // Mock storage.get to simulate the value still existing
      const spy = jest.spyOn(service['storage'], 'get');
      spy.mockReturnValue({ value, expires: null });

      // Reset chaos and check if value still exists
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should clear all keys when reset is called', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key1 = 'test-key-1';
      const value1 = { id: '1', name: 'Test 1' };
      const key2 = 'test-key-2';
      const value2 = { id: '2', name: 'Test 2' };

      await service.set(key1, value1);
      await service.set(key2, value2);
      await service.reset();

      const result1 = await service.get(key1);
      const result2 = await service.get(key2);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('should handle errors when resetting cache', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      // Force an error
      jest.spyOn(service['storage'], 'clear').mockImplementation(() => {
        throw new Error('Test error');
      });

      await service.reset();

      // Verify the error was logged
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should execute factory and not cache when cache is disabled', async () => {
      await service.toggleRedis(false);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const factory = jest.fn().mockResolvedValue(value);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(value);
      expect(factory).toHaveBeenCalled();

      // Re-enable cache and check if value was cached
      await service.toggleRedis(true);
      const cachedResult = await service.get(key);

      expect(cachedResult).toBeUndefined();
    });

    it('should execute factory and not cache when chaos is triggered', async () => {
      // Force chaos to trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const factory = jest.fn().mockResolvedValue(value);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(value);
      expect(factory).toHaveBeenCalled();

      // Mock storage.get to verify the value wasn't cached
      const spy = jest.spyOn(service['storage'], 'get');
      spy.mockReturnValue(undefined);

      // Reset chaos and check if value was cached
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const cachedResult = await service.get(key);

      expect(cachedResult).toBeUndefined();
    });

    it('should return cached value when it exists', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      const factory = jest.fn();
      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(value);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should execute factory and cache result when key does not exist', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const factory = jest.fn().mockResolvedValue(value);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(value);
      expect(factory).toHaveBeenCalled();

      const cachedResult = await service.get(key);
      expect(cachedResult).toEqual(value);
    });

    it('should execute factory with custom TTL', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 300;
      const factory = jest.fn().mockResolvedValue(value);

      const result = await service.getOrSet(key, factory, ttl);

      expect(result).toEqual(value);
      expect(factory).toHaveBeenCalled();

      const cachedResult = await service.get(key);
      expect(cachedResult).toEqual(value);
    });

    it('should throw error when factory fails', async () => {
      // Ensure chaos doesn't trigger
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const key = 'error-key';
      const error = new Error('Factory error');
      const factory = jest.fn().mockRejectedValue(error);

      await expect(service.getOrSet(key, factory)).rejects.toThrow(
        'Factory error',
      );
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('toggleRedis', () => {
    it('should enable Redis cache', async () => {
      await service.toggleRedis(true);
      expect(service['isRedisEnabled']).toBe(true);
    });

    it('should disable Redis cache', async () => {
      await service.toggleRedis(false);
      expect(service['isRedisEnabled']).toBe(false);
    });
  });

  describe('setChaosProbability', () => {
    it('should set chaos probability', async () => {
      const probability = 0.5;
      await service.setChaosProbability(probability);
      expect(service['chaosProbability']).toBe(probability);
    });
  });
});
