import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsMiddleware,
        {
          provide: MetricsService,
          useValue: {
            incrementHttpRequestsInProgress: jest.fn(),
            observeHttpRequestDuration: jest.fn(),
            incrementHttpRequestCounter: jest.fn(),
            decrementHttpRequestsInProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<MetricsMiddleware>(MetricsMiddleware);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should track request metrics and call next', () => {
      // Mock date for consistent testing
      const now = Date.now();
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 100);

      const req = {
        method: 'GET',
        path: '/api',
      } as Request;

      const res = {
        statusCode: 200,
        on: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);

      // Should increment in-progress counter
      expect(
        metricsService.incrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('GET', '/api');

      // Should call next
      expect(next).toHaveBeenCalled();

      // Should register finish listener
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

      // Simulate response finish
      const finishCallback = (res.on as jest.Mock).mock.calls[0][1];
      finishCallback();

      // Should record metrics on finish
      expect(metricsService.observeHttpRequestDuration).toHaveBeenCalledWith(
        'GET',
        '/api',
        200,
        0.1, // 100ms = 0.1s
      );
      expect(metricsService.incrementHttpRequestCounter).toHaveBeenCalledWith(
        'GET',
        '/api',
        200,
      );
      expect(
        metricsService.decrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('GET', '/api');
    });
  });
});
