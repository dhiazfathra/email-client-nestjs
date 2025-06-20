import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Cache;
  let _configService: ConfigService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
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

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
    _configService = module.get(ConfigService);

    // Mock the logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value when found', async () => {
      const key = 'test-key';
      const cachedValue = { id: '1', name: 'Test' };

      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.get(key);

      expect(result).toEqual(cachedValue);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return undefined when cache key not found', async () => {
      const key = 'non-existent-key';

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should handle errors and return undefined', async () => {
      const key = 'error-key';

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe('set', () => {
    it('should set value in cache with ttl', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 300;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should set value in cache without ttl', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should handle errors when setting cache', async () => {
      const key = 'error-key';
      const value = { id: '1', name: 'Test' };

      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors when deleting from cache', async () => {
      const key = 'error-key';

      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      await service.del(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when found', async () => {
      const key = 'test-key';
      const cachedValue = { id: '1', name: 'Test' };
      const factory = jest.fn();

      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result when key not found', async () => {
      const key = 'new-key';
      const newValue = { id: '2', name: 'New Test' };
      const factory = jest.fn().mockResolvedValue(newValue);
      const ttl = 300;

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, factory, ttl);

      expect(result).toEqual(newValue);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(key, newValue, ttl);
    });

    it('should propagate factory errors', async () => {
      const key = 'error-key';
      const error = new Error('Factory error');
      const factory = jest.fn().mockRejectedValue(error);

      mockCacheManager.get.mockResolvedValue(undefined);

      await expect(service.getOrSet(key, factory)).rejects.toThrow(error);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Chaos Testing', () => {
    it('should bypass cache when Redis is disabled', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await service.toggleRedis(false);

      const result = await service.get('test-key');

      expect(result).toBeUndefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Redis cache disabled');
    });

    it('should simulate failure based on probability', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      await service.setChaosProbability(0.2);

      const result = await service.get('test-key');
      expect(result).toBeUndefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('should execute factory directly when Redis is disabled', async () => {
      await service.toggleRedis(false);
      const factory = jest.fn().mockResolvedValue('value');

      const result = await service.getOrSet('test-key', factory);
      expect(result).toBe('value');
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('should initialize chaos probability from config on module init', async () => {
      await service.onModuleInit();
      expect(service['chaosProbability']).toBe(0.2);
    });

    it('should log warning and skip set operation when Redis is disabled', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      await service.toggleRedis(false);

      await service.set('test-key', 'test-value');

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Chaos] Cache disabled for set operation on key test-key',
      );
    });

    it('should log warning and skip delete operation when Redis is disabled', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      await service.toggleRedis(false);

      await service.del('test-key');

      expect(cacheManager.del).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Chaos] Cache disabled for delete operation on key test-key',
      );
    });

    it('should log warning and skip set operation when chaos is triggered', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      await service.setChaosProbability(0.2);

      await service.set('test-key', 'test-value');

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Chaos] Cache disabled for set operation on key test-key',
      );
    });

    it('should log warning and skip delete operation when chaos is triggered', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      await service.setChaosProbability(0.2);

      await service.del('test-key');

      expect(cacheManager.del).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Chaos] Cache disabled for delete operation on key test-key',
      );
    });

    it('should enable Redis cache and log the status', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await service.toggleRedis(true);

      expect(service['isRedisEnabled']).toBe(true);
      expect(loggerSpy).toHaveBeenCalledWith('Redis cache enabled');
    });
  });
});
