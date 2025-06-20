import { Test, TestingModule } from '@nestjs/testing';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { MetricsService, register } from './metrics.service';

// Mock prom-client
jest.mock('prom-client', () => {
  const mockInc = jest.fn();
  const mockDec = jest.fn();
  const mockObserve = jest.fn();

  return {
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn().mockImplementation(() => ({
      inc: mockInc,
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      inc: mockInc,
      dec: mockDec,
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: mockObserve,
    })),
    Registry: jest.fn().mockImplementation(() => ({
      setDefaultLabels: jest.fn(),
    })),
  };
});

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize metrics and registry', () => {
      expect(Registry).toHaveBeenCalled();
      expect(Counter).toHaveBeenCalledWith({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [expect.any(Object)],
      });
      expect(Histogram).toHaveBeenCalledWith({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        registers: [expect.any(Object)],
      });
      expect(Gauge).toHaveBeenCalledWith({
        name: 'http_requests_in_progress',
        help: 'Number of HTTP requests currently in progress',
        labelNames: ['method', 'route'],
        registers: [expect.any(Object)],
      });
    });
  });

  describe('onModuleInit', () => {
    it('should set default labels', () => {
      service.onModuleInit();
      expect(register.setDefaultLabels).toHaveBeenCalledWith({
        app: 'email-client-nestjs',
      });
    });
  });

  describe('incrementHttpRequestCounter', () => {
    it('should increment the HTTP request counter with correct labels', () => {
      const method = 'GET';
      const route = '/api';
      const statusCode = 200;

      service.incrementHttpRequestCounter(method, route, statusCode);

      expect(service['httpRequestsCounter'].inc).toHaveBeenCalledWith({
        method,
        route,
        status_code: statusCode,
      });
    });
  });

  describe('observeHttpRequestDuration', () => {
    it('should observe the HTTP request duration with correct labels', () => {
      const method = 'GET';
      const route = '/api';
      const statusCode = 200;
      const duration = 0.1;

      service.observeHttpRequestDuration(method, route, statusCode, duration);

      expect(service['httpRequestDuration'].observe).toHaveBeenCalledWith(
        { method, route, status_code: statusCode },
        duration,
      );
    });
  });

  describe('incrementHttpRequestsInProgress', () => {
    it('should increment the in-progress requests gauge with correct labels', () => {
      const method = 'GET';
      const route = '/api';

      service.incrementHttpRequestsInProgress(method, route);

      expect(service['httpRequestsInProgress'].inc).toHaveBeenCalledWith({
        method,
        route,
      });
    });
  });

  describe('decrementHttpRequestsInProgress', () => {
    it('should decrement the in-progress requests gauge with correct labels', () => {
      const method = 'GET';
      const route = '/api';

      service.decrementHttpRequestsInProgress(method, route);

      expect(service['httpRequestsInProgress'].dec).toHaveBeenCalledWith({
        method,
        route,
      });
    });
  });
});
