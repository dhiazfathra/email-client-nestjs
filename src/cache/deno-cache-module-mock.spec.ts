import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CacheModule as DenoCacheModule,
  CacheService as DenoCacheService,
} from './deno-cache-module-mock';

describe('DenoCacheModuleMock', () => {
  describe('createMemoryCache', () => {
    let originalConsoleLog: any;

    beforeEach(() => {
      originalConsoleLog = console.log;
      console.log = jest.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it.skip('should register CacheService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [DenoCacheModule],
      }).compile();

      const service = module.get(DenoCacheService);
      expect(service).toBeDefined();
    });
  });

  describe('CacheService', () => {
    let service: DenoCacheService;
    let configService: ConfigService;
    let cacheManager: any;

    beforeEach(async () => {
      // Create mock cache manager with jest functions
      cacheManager = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        reset: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DenoCacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key) => {
                if (key === 'CHAOS_REDIS_PROBABILITY') {
                  return 0.5; // 50% chance of chaos
                }
                return null;
              }),
            },
          },
          {
            provide: CACHE_MANAGER,
            useValue: cacheManager,
          },
        ],
      }).compile();

      service = module.get<DenoCacheService>(DenoCacheService);
      configService = module.get<ConfigService>(ConfigService);

      // Mock the logger to avoid console output during tests
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
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

      it('should handle errors and return undefined', async () => {
        // Ensure chaos doesn't trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        // Mock the cacheManager.get to throw an error
        jest
          .spyOn(service['cacheManager'], 'get')
          .mockRejectedValue(new Error('Test error'));

        const result = await service.get('error-key');

        expect(result).toBeUndefined();
        expect(Logger.prototype.error).toHaveBeenCalled();
      });

      it('should handle errors when getting value', async () => {
        const error = new Error('Test error');
        jest.spyOn(service['cacheManager'], 'get').mockRejectedValue(error);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

        const result = await service.get('test-key');

        expect(result).toBeUndefined();
      });
    });

    describe('set', () => {
      it('should not set value when cache is disabled', async () => {
        await service.toggleRedis(false);

        const spy = jest.spyOn(service['cacheManager'], 'set');
        await service.set('test-key', { id: '1' });

        expect(spy).not.toHaveBeenCalled();
      });

      it('should not set value when chaos is triggered', async () => {
        // Force chaos to trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.1);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

        const key = 'test-key';
        const value = { id: '1' };

        // Mock cacheManager.set to reset call history
        cacheManager.set.mockReset();

        await service.set(key, value);

        // Verify cacheManager.set was not called
        expect(cacheManager.set).not.toHaveBeenCalled();
      });

      it('should handle errors when setting value', async () => {
        // Ensure chaos doesn't trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        // Mock the cacheManager.set to throw an error
        jest.spyOn(service['cacheManager'], 'set').mockImplementation(() => {
          throw new Error('Test error');
        });

        await service.set('error-key', { id: '1' });

        expect(Logger.prototype.error).toHaveBeenCalled();
      });
    });

    describe('del', () => {
      it('should not delete when cache is disabled', async () => {
        await service.toggleRedis(false);

        const spy = jest.spyOn(service['cacheManager'], 'del');
        await service.del('test-key');

        expect(spy).not.toHaveBeenCalled();
      });

      it('should not delete when chaos is triggered', async () => {
        // Force chaos to trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.1);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

        const key = 'test-key';

        // Mock cacheManager.del to reset call history
        cacheManager.del.mockReset();

        await service.del(key);

        // Verify cacheManager.del was not called
        expect(cacheManager.del).not.toHaveBeenCalled();
      });

      it('should handle errors when deleting key', async () => {
        // Ensure chaos doesn't trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        // Mock the cacheManager.del to throw an error
        jest.spyOn(service['cacheManager'], 'del').mockImplementation(() => {
          throw new Error('Test error');
        });

        await service.del('error-key');

        expect(Logger.prototype.error).toHaveBeenCalled();
      });
    });

    describe('getOrSet', () => {
      it('should execute factory and not cache when cache is disabled', async () => {
        await service.toggleRedis(false);

        const value = { id: '1', name: 'Test' };
        const factory = jest.fn().mockResolvedValue(value);

        const result = await service.getOrSet('test-key', factory);

        expect(result).toEqual(value);
        expect(factory).toHaveBeenCalled();
      });

      it('should execute factory and not cache when chaos is triggered', async () => {
        // Force chaos to trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.1);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

        const key = 'test-key';
        const value = { id: '1' };
        const factory = jest.fn().mockResolvedValue(value);

        // Mock cacheManager.set to reset call history
        cacheManager.set.mockReset();

        const result = await service.getOrSet(key, factory);

        expect(result).toEqual(value);
        expect(factory).toHaveBeenCalled();

        // Verify cacheManager.set was not called
        expect(cacheManager.set).not.toHaveBeenCalled();
      });

      it('should throw error when factory fails', async () => {
        // Ensure chaos doesn't trigger
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        const error = new Error('Factory error');
        const factory = jest.fn().mockRejectedValue(error);

        await expect(service.getOrSet('error-key', factory)).rejects.toThrow(
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
});
