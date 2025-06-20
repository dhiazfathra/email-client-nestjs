import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaHealthIndicator: PrismaHealthIndicator;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaHealthIndicator = module.get<PrismaHealthIndicator>(
      PrismaHealthIndicator,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return the health check result', async () => {
      // Create a proper mock health check result
      const mockDbResult: HealthIndicatorResult = {
        database: { status: 'up' },
      };

      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: mockDbResult,
        details: mockDbResult,
        error: {},
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(expectedResult);
      jest
        .spyOn(prismaHealthIndicator, 'pingCheck')
        .mockResolvedValue(mockDbResult);

      const result = await controller.check();

      expect(result).toBe(expectedResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);

      // Call the health check function passed to check
      const healthCheckFn = (healthCheckService.check as jest.Mock).mock
        .calls[0][0][0];
      await healthCheckFn();

      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'database',
        prismaService,
      );
    });
  });
});
