import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusController } from './prometheus.controller';
import { Response } from 'express';
import { register } from 'prom-client';

jest.mock('prom-client', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4',
    metrics: jest.fn().mockResolvedValue('metrics data'),
  },
}));

describe('PrometheusController', () => {
  let controller: PrometheusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrometheusController],
    }).compile();

    controller = module.get<PrometheusController>(PrometheusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics data with proper content type', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4',
      );
      expect(mockResponse.send).toHaveBeenCalledWith('metrics data');
      expect(register.metrics).toHaveBeenCalled();
    });
  });
});
