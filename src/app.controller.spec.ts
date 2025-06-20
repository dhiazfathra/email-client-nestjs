import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status object', () => {
      // Mock date for consistent testing
      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockDate as unknown as Date);

      const result = appController.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      // Restore original Date implementation
      jest.restoreAllMocks();
    });

    it('should return current timestamp', () => {
      const result = appController.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
