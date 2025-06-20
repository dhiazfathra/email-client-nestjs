import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  // Create a mock for EncryptionService
  const mockEncryptionService = {
    encrypt: jest.fn((text) => `encrypted_${text}`),
    decrypt: jest.fn((text) => text.replace('encrypted_', '')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock the Prisma client methods
    jest.spyOn(service, '$connect').mockImplementation(jest.fn());
    jest.spyOn(service, '$disconnect').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });

  describe('createEncryptionMiddleware', () => {
    let middleware: (
      params: Prisma.MiddlewareParams,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (params: Prisma.MiddlewareParams) => Promise<any>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Promise<any>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();

      // Get the middleware function
      middleware = service['createEncryptionMiddleware']();
      mockNext = jest.fn().mockImplementation(async (params) => {
        // Simple implementation to simulate database operations
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          return { id: 1, emailPassword: 'encrypted_password' };
        } else if (params.action === 'findMany') {
          return [
            { id: 1, emailPassword: 'encrypted_password1' },
            { id: 2, emailPassword: 'encrypted_password2' },
          ];
        }
        return params.args.data;
      });
    });

    it('should pass through for non-User models', async () => {
      const params = {
        model: 'Email',
        action: 'create',
        args: { data: { subject: 'Test' } },
      } as Prisma.MiddlewareParams;

      await middleware(params, mockNext);
      expect(mockNext).toHaveBeenCalledWith(params);
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    describe('User model operations', () => {
      describe('Create operations', () => {
        it('should encrypt emailPassword for create operation', async () => {
          const params = {
            model: 'User',
            action: 'create',
            args: {
              data: { email: 'test@example.com', emailPassword: 'password123' },
            },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'password123',
          );
          expect(params.args.data.emailPassword).toBe('encrypted_password123');
          expect(mockNext).toHaveBeenCalledWith(params);
        });

        it('should not encrypt if emailPassword is not provided', async () => {
          const params = {
            model: 'User',
            action: 'create',
            args: { data: { email: 'test@example.com' } },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
          expect(mockNext).toHaveBeenCalledWith(params);
        });
      });

      describe('Update operations', () => {
        it('should encrypt emailPassword for update operation', async () => {
          const params = {
            model: 'User',
            action: 'update',
            args: {
              where: { id: 1 },
              data: { emailPassword: 'newpassword' },
            },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'newpassword',
          );
          expect(params.args.data.emailPassword).toBe('encrypted_newpassword');
          expect(mockNext).toHaveBeenCalledWith(params);
        });
      });

      describe('Upsert operations', () => {
        it('should encrypt emailPassword in create data for upsert operation', async () => {
          const params = {
            model: 'User',
            action: 'upsert',
            args: {
              where: { email: 'test@example.com' },
              create: {
                email: 'test@example.com',
                emailPassword: 'createpass',
              },
              update: {},
              // Add data property to match middleware implementation
              data: {},
            },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'createpass',
          );
          expect(params.args.create.emailPassword).toBe('encrypted_createpass');
          expect(mockNext).toHaveBeenCalledWith(params);
        });

        it('should encrypt emailPassword in update data for upsert operation', async () => {
          const params = {
            model: 'User',
            action: 'upsert',
            args: {
              where: { email: 'test@example.com' },
              create: { email: 'test@example.com' },
              update: { emailPassword: 'updatepass' },
              // Add data property to match middleware implementation
              data: {},
            },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'updatepass',
          );
          expect(params.args.update.emailPassword).toBe('encrypted_updatepass');
          expect(mockNext).toHaveBeenCalledWith(params);
        });

        it('should encrypt emailPassword in both create and update data', async () => {
          const params = {
            model: 'User',
            action: 'upsert',
            args: {
              where: { email: 'test@example.com' },
              create: {
                email: 'test@example.com',
                emailPassword: 'createpass',
              },
              update: { emailPassword: 'updatepass' },
              // Add data property to match middleware implementation
              data: {},
            },
          } as Prisma.MiddlewareParams;

          await middleware(params, mockNext);

          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'createpass',
          );
          expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
            'updatepass',
          );
          expect(params.args.create.emailPassword).toBe('encrypted_createpass');
          expect(params.args.update.emailPassword).toBe('encrypted_updatepass');
          expect(mockNext).toHaveBeenCalledWith(params);
        });
      });

      describe('Find operations', () => {
        it('should decrypt emailPassword for findUnique operation', async () => {
          const params = {
            model: 'User',
            action: 'findUnique',
            args: { where: { id: 1 } },
          } as Prisma.MiddlewareParams;

          const result = await middleware(params, mockNext);

          expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
            'encrypted_password',
          );
          expect(result.emailPassword).toBe('password');
        });

        it('should decrypt emailPassword for findFirst operation', async () => {
          const params = {
            model: 'User',
            action: 'findFirst',
            args: { where: { email: 'test@example.com' } },
          } as Prisma.MiddlewareParams;

          const result = await middleware(params, mockNext);

          expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
            'encrypted_password',
          );
          expect(result.emailPassword).toBe('password');
        });

        it('should decrypt emailPassword for all items in findMany operation', async () => {
          const params = {
            model: 'User',
            action: 'findMany',
            args: {},
          } as Prisma.MiddlewareParams;

          const results = await middleware(params, mockNext);

          expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
            'encrypted_password1',
          );
          expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
            'encrypted_password2',
          );
          expect(results[0].emailPassword).toBe('password1');
          expect(results[1].emailPassword).toBe('password2');
        });
      });
    });
  });
});
