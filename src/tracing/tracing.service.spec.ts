import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TracingService } from './tracing.service';

// Mock OpenTelemetry modules
jest.mock('@opentelemetry/sdk-node', () => {
  return {
    NodeSDK: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('@opentelemetry/exporter-jaeger', () => {
  return {
    JaegerExporter: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('@opentelemetry/auto-instrumentations-node', () => {
  return {
    getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
  };
});

jest.mock('@opentelemetry/api', () => {
  return {
    diag: {
      setLogger: jest.fn(),
    },
    DiagConsoleLogger: jest.fn(),
    DiagLogLevel: {
      INFO: 'INFO',
    },
  };
});

describe('TracingService', () => {
  let service: TracingService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const config = {
                JAEGER_HOST: 'localhost',
                JAEGER_PORT: 6831,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TracingService>(TracingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize the SDK with correct configuration', () => {
      // Verify diag logger was set
      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.INFO,
      );

      // Verify JaegerExporter was created with correct config
      expect(JaegerExporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6831,
      });

      // Verify NodeSDK was created
      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: 'email-client-nestjs',
        }),
      );
    });

    it('should use default values when config is missing', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key, defaultValue) => defaultValue);

      new TracingService(configService);

      expect(JaegerExporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6831,
      });
    });

    it('should parse port correctly when provided as a string', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key, defaultValue) => {
          if (key === 'JAEGER_PORT') {
            return '8432';
          }
          return defaultValue;
        });

      new TracingService(configService);

      expect(JaegerExporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 8432,
      });
    });

    it('should handle port string with protocol or host information', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key, defaultValue) => {
          if (key === 'JAEGER_PORT') {
            return 'localhost:9432';
          }
          return defaultValue;
        });

      new TracingService(configService);

      expect(JaegerExporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9432,
      });
    });

    it('should use port directly when provided as a number', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key, defaultValue) => {
          if (key === 'JAEGER_PORT') {
            return 7432; // Numeric port
          }
          return defaultValue;
        });

      new TracingService(configService);

      expect(JaegerExporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 7432,
      });
    });
  });

  describe('onModuleInit', () => {
    it('should start the SDK', async () => {
      await service.onModuleInit();

      // Access private property for testing
      const sdk = (service as unknown as { sdk: NodeSDK }).sdk;
      expect(sdk.start).toHaveBeenCalled();
    });

    it('should handle errors when starting the SDK', async () => {
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock SDK start to throw an error
      type ServiceWithSdk = {
        sdk: {
          start: {
            mockRejectedValueOnce: (error: Error) => void;
          };
        };
      };
      const sdk = (service as unknown as ServiceWithSdk).sdk;
      sdk.start.mockRejectedValueOnce(new Error('Test error'));

      // Spy on logger
      type ServiceWithLogger = {
        logger: {
          error: (message: string, error: Error) => void;
        };
      };
      const loggerErrorSpy = jest.spyOn(
        (service as unknown as ServiceWithLogger).logger,
        'error',
      );

      await service.onModuleInit();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error initializing Jaeger tracing',
        expect.any(Error),
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('onApplicationShutdown', () => {
    it('should shutdown the SDK', async () => {
      await service.onApplicationShutdown();

      type ServiceWithSdk = {
        sdk: {
          shutdown: jest.Mock;
        };
      };
      const sdk = (service as unknown as ServiceWithSdk).sdk;
      expect(sdk.shutdown).toHaveBeenCalled();
    });

    it('should handle errors when shutting down the SDK', async () => {
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock SDK shutdown to throw an error
      type ServiceWithSdk = {
        sdk: {
          shutdown: {
            mockRejectedValueOnce: (error: Error) => void;
          };
        };
      };
      const sdk = (service as unknown as ServiceWithSdk).sdk;
      sdk.shutdown.mockRejectedValueOnce(new Error('Test error'));

      // Spy on logger
      type ServiceWithLogger = {
        logger: {
          error: (message: string, error: Error) => void;
        };
      };
      const loggerErrorSpy = jest.spyOn(
        (service as unknown as ServiceWithLogger).logger,
        'error',
      );

      await service.onApplicationShutdown();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error shutting down Jaeger tracing',
        expect.any(Error),
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
