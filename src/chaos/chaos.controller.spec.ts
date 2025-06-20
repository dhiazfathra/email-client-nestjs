import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CacheService } from '../cache/cache.service';
import { ChaosController } from './chaos.controller';

describe('ChaosController', () => {
  let controller: ChaosController;
  let cacheService: {
    toggleRedis: jest.Mock;
    setChaosProbability: jest.Mock;
    isRedisEnabled: boolean;
    chaosProbability: number;
  };

  beforeEach(async () => {
    cacheService = {
      toggleRedis: jest.fn(),
      setChaosProbability: jest.fn(),
      isRedisEnabled: true,
      chaosProbability: 0,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChaosController],
      providers: [{ provide: CacheService, useValue: cacheService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChaosController>(ChaosController);
  });

  describe('toggleRedis', () => {
    it('should toggle Redis status to disabled', async () => {
      const dto = { enabled: false };
      const result = await controller.toggleRedis(dto);

      expect(result).toEqual({ message: 'Redis cache disabled' });
      expect(cacheService.toggleRedis).toHaveBeenCalledWith(false);
    });

    it('should toggle Redis status to enabled', async () => {
      const dto = { enabled: true };
      const result = await controller.toggleRedis(dto);

      expect(result).toEqual({ message: 'Redis cache enabled' });
      expect(cacheService.toggleRedis).toHaveBeenCalledWith(true);
    });
  });

  describe('setProbability', () => {
    it('should set chaos probability', async () => {
      const dto = { probability: 0.5 };
      const result = await controller.setProbability(dto);

      expect(result).toEqual({ message: 'Set Redis chaos probability to 0.5' });
      expect(cacheService.setChaosProbability).toHaveBeenCalledWith(0.5);
    });

    it('should reject invalid probability values', async () => {
      const dto = { probability: 1.5 };
      await expect(controller.setProbability(dto)).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return current chaos status', async () => {
      cacheService.isRedisEnabled = false;
      cacheService.chaosProbability = 0.3;

      const result = await controller.getStatus();

      expect(result).toEqual({
        message: 'Chaos testing status',
        redisEnabled: false,
        chaosProbability: 0.3,
      });
    });
  });
});
