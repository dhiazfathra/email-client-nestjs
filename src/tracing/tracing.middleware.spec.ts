import { SpanStatusCode, trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { TracingMiddleware } from './tracing.middleware';

// Mock the OpenTelemetry trace API
jest.mock('@opentelemetry/api', () => {
  const originalModule = jest.requireActual('@opentelemetry/api');

  // Create a mock span
  const mockSpan = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  };

  // Create a mock tracer
  const mockTracer = {
    startSpan: jest.fn().mockReturnValue(mockSpan),
  };

  return {
    ...originalModule,
    trace: {
      ...originalModule.trace,
      getTracer: jest.fn().mockReturnValue(mockTracer),
    },
    SpanStatusCode: originalModule.SpanStatusCode,
  };
});

describe('TracingMiddleware', () => {
  let middleware: TracingMiddleware;

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & { end: jest.Mock };
  let mockNext: jest.Mock;
  let mockTracer: {
    startSpan: jest.Mock;
  };
  let mockSpan: {
    setAttributes: jest.Mock;
    setStatus: jest.Mock;
    end: jest.Mock;
  };

  beforeEach(async () => {
    middleware = new TracingMiddleware();

    // Reset mocks
    mockTracer = trace.getTracer('nestjs-http') as unknown as {
      startSpan: jest.Mock;
    };
    mockSpan = mockTracer.startSpan('test');

    // Mock request
    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': 'test-id',
      },
    } as Partial<Request>;

    // Mock response
    mockResponse = {
      statusCode: 200,
      end: jest.fn(),
    } as Partial<Response> & { end: jest.Mock };

    // Mock next function
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should create a span with request attributes', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext as NextFunction,
      );

      // Verify span was created with correct name
      expect(mockTracer.startSpan).toHaveBeenCalledWith('HTTP GET /test');

      // Verify attributes were set
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.method': 'GET',
        'http.url': '/test',
        'http.client_ip': '127.0.0.1',
        'http.user_agent': 'test-agent',
        'http.request_id': 'test-id',
      });

      // Verify next was called
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing headers gracefully', () => {
      const requestWithoutHeaders = {
        ...mockRequest,
        headers: {},
      } as Partial<Request>;

      middleware.use(
        requestWithoutHeaders as Request,
        mockResponse as unknown as Response,
        mockNext as NextFunction,
      );

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.user_agent': '',
          'http.request_id': '',
        }),
      );
    });

    it('should override response.end to capture response data', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext as NextFunction,
      );

      // Original end function should be replaced
      expect(mockResponse.end).not.toBe(jest.fn());

      // Call the new end function
      const args = ['test-response'];
      mockResponse.end(...args);

      // Verify response attributes were set
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.status_code': 200,
      });

      // Verify span was ended
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should mark span as error for 4xx status codes', () => {
      mockResponse.statusCode = 404;

      middleware.use(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext as NextFunction,
      );
      mockResponse.end();

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'HTTP Error 404',
      });
    });

    it('should mark span as error for 5xx status codes', () => {
      mockResponse.statusCode = 500;

      middleware.use(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext as NextFunction,
      );
      mockResponse.end();

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'HTTP Error 500',
      });
    });
  });
});
