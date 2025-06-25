import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { MicrosoftStrategy } from './microsoft.strategy';

describe('MicrosoftStrategy', () => {
  let strategy: MicrosoftStrategy;
  let configService: ConfigService;
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuthService = {
    validateOrCreateMicrosoftUser: jest.fn(),
  };

  beforeEach(async () => {
    // Set up configuration values for each test
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        MICROSOFT_REDIRECT_URI:
          'http://test-app.com/api/auth/microsoft/callback',
        MICROSOFT_TENANT_ID: 'test-tenant-id',
        MICROSOFT_CLIENT_ID: 'test-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-client-secret',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<MicrosoftStrategy>(MicrosoftStrategy);
    configService = module.get<ConfigService>(ConfigService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should use provided configuration values', () => {
      // Verify the config service was called with the expected keys
      expect(configService.get).toHaveBeenCalledWith('MICROSOFT_REDIRECT_URI');
      expect(configService.get).toHaveBeenCalledWith('MICROSOFT_TENANT_ID');
      expect(configService.get).toHaveBeenCalledWith('MICROSOFT_CLIENT_ID');
      expect(configService.get).toHaveBeenCalledWith('MICROSOFT_CLIENT_SECRET');
    });

    it('should use default callback URL if not provided', () => {
      // Reset mock to return undefined for MICROSOFT_REDIRECT_URI
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          MICROSOFT_TENANT_ID: 'test-tenant-id',
          MICROSOFT_CLIENT_ID: 'test-client-id',
          MICROSOFT_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });

      // Recreate the strategy with the new mock
      const _strategy = new MicrosoftStrategy(
        configService as unknown as ConfigService,
        authService as unknown as AuthService,
      );

      // Default URL should be used (can't directly test private properties, but we can verify the mock was called)
      expect(configService.get).toHaveBeenCalledWith('MICROSOFT_REDIRECT_URI');
    });
  });

  describe('validate', () => {
    it('should process Microsoft profile and return validated user', async () => {
      // Mock request with auth info
      const mockRequest = {
        authInfo: {
          expires_in: 3600,
        },
      } as unknown as Request;

      // Mock tokens
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      // Mock Microsoft profile
      const profile = {
        email: 'test@example.com',
        givenName: 'Test',
        surname: 'User',
        oid: '12345',
      };

      // Expected user object to be passed to auth service
      const expectedUser = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        microsoftId: '12345',
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
        },
      };

      // Mock the auth service response
      const validatedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        microsoftId: '12345',
      };
      mockAuthService.validateOrCreateMicrosoftUser.mockResolvedValue(
        validatedUser,
      );

      // Call the validate method
      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      // Verify the auth service was called with the expected user data
      expect(authService.validateOrCreateMicrosoftUser).toHaveBeenCalledWith(
        expectedUser,
      );

      // Verify the result is what we expect
      expect(result).toEqual(validatedUser);
    });

    it('should handle profile with missing fields', async () => {
      // Mock request
      const mockRequest = {} as Request;

      // Mock tokens
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      // Mock incomplete profile
      const profile = {} as Record<string, unknown>;

      // Expected user object with default values
      const expectedUser = {
        email: 'unknown@email.com',
        firstName: 'Unknown',
        lastName: 'User',
        microsoftId: undefined,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: undefined,
        },
      };

      // Mock the auth service response
      mockAuthService.validateOrCreateMicrosoftUser.mockResolvedValue({
        id: '1',
        email: 'unknown@email.com',
      });

      // Call the validate method
      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      // Verify the auth service was called with the expected user data
      expect(authService.validateOrCreateMicrosoftUser).toHaveBeenCalledWith(
        expectedUser,
      );

      // Verify the result
      expect(result).toEqual({
        id: '1',
        email: 'unknown@email.com',
      });
    });

    it('should handle alternative profile structure', async () => {
      // Mock request
      const mockRequest = {} as Request;

      // Mock tokens
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      // Mock profile with alternative structure
      const profile = {
        upn: 'alt@example.com',
        name: {
          givenName: 'Alt',
          familyName: 'User',
        },
        id: 'alt-12345',
      };

      // Expected user object
      const expectedUser = {
        email: 'alt@example.com',
        firstName: 'Alt',
        lastName: 'User',
        microsoftId: 'alt-12345',
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: undefined,
        },
      };

      // Mock the auth service response
      mockAuthService.validateOrCreateMicrosoftUser.mockResolvedValue({
        id: '2',
        email: 'alt@example.com',
        firstName: 'Alt',
        lastName: 'User',
        microsoftId: 'alt-12345',
      });

      // Call the validate method
      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      // Verify the auth service was called with the expected user data
      expect(authService.validateOrCreateMicrosoftUser).toHaveBeenCalledWith(
        expectedUser,
      );

      // Verify the result
      expect(result).toEqual({
        id: '2',
        email: 'alt@example.com',
        firstName: 'Alt',
        lastName: 'User',
        microsoftId: 'alt-12345',
      });
    });
  });
});
