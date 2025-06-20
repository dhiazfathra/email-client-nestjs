import { Test, TestingModule } from '@nestjs/testing';
import { TracingController } from './tracing.controller';

describe('TracingController', () => {
  let controller: TracingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TracingController],
    }).compile();

    controller = module.get<TracingController>(TracingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTracingInfo', () => {
    it('should return tracing information', () => {
      const result = controller.getTracingInfo();

      expect(result).toEqual({
        service: 'Jaeger',
        description: 'Distributed tracing system',
        uiUrl: 'http://localhost:16686',
        status: 'active',
        endpoints: {
          jaegerUI: 'http://localhost:16686',
          jaegerCollector: 'http://localhost:14268',
          jaegerAgent: 'http://localhost:6831 (UDP)',
          zipkin: 'http://localhost:9411',
        },
      });
    });
  });
});
