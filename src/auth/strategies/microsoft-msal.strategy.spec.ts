// Extend express-session for testing
declare module 'express-session' {
  interface SessionData {
    pkceVerifier?: string;
    state?: string;
  }
}

import {
  ConfidentialClientApplication,
  CryptoProvider,
} from '@azure/msal-node';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { MicrosoftMsalStrategy } from './microsoft-msal.strategy';

// Mock MSAL classes
jest.mock('@azure/msal-node', () => {
  return {
    ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
      getAuthCodeUrl: jest.fn().mockResolvedValue('https://mock-auth-url.com'),
      acquireTokenByCode: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        account: { homeAccountId: 'mock-home-account-id' },
        expiresOn: new Date(Date.now() + 3600 * 1000),
      }),
    })),
    CryptoProvider: jest.fn().mockImplementation(() => ({
      generatePkceCodes: jest.fn().mockResolvedValue({
        verifier: 'mock-verifier',
        challenge: 'mock-challenge',
      }),
    })),
  };
});

describe('MicrosoftMsalStrategy', () => {
  let strategy: MicrosoftMsalStrategy;
  let _authService: AuthService; // Prefix with underscore to indicate it's unused
  let msalClient: ConfidentialClientApplication;
  let cryptoProvider: CryptoProvider;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuthService = {
    validateOrCreateMicrosoftUser: jest.fn(),
  };

  // Session types are declared at the top level of the file

  const mockRequest = {
    session: {
      pkceVerifier: 'mock-verifier',
      state: 'mock-state',
    },
    query: {
      code: 'mock-auth-code',
      state: 'mock-state',
    },
    res: {
      redirect: jest.fn(),
    },
  } as unknown as Request;

  beforeEach(async () => {
    // Set up configuration values for each test
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        MICROSOFT_REDIRECT_URI:
          'http://test-app.com/api/auth/microsoft/callback',
        MICROSOFT_TENANT_ID: 'test-tenant-id',
        MICROSOFT_CLIENT_ID: 'test-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-client-secret',
        SESSION_SECRET: 'test-session-secret',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftMsalStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<MicrosoftMsalStrategy>(MicrosoftMsalStrategy);
    _authService = module.get<AuthService>(AuthService);

    // Access private properties for testing
    msalClient = (strategy as any).msalClient;
    cryptoProvider = (strategy as any).cryptoProvider;

    // Mock Passport strategy methods
    (strategy as any).fail = jest.fn();
    (strategy as any).success = jest.fn();
    (strategy as any).redirect = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize MSAL client with correct configuration', () => {
      expect(ConfidentialClientApplication).toHaveBeenCalledWith({
        auth: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          authority: expect.stringContaining('test-tenant-id'),
        },
      });
      expect(CryptoProvider).toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('should initiate auth flow for new authentication requests', async () => {
      const requestWithoutCode = {
        ...mockRequest,
        query: {},
      } as unknown as Request;

      const spy = jest.spyOn(strategy as any, 'initiateAuthFlow');

      await strategy.authenticate(requestWithoutCode);

      expect(spy).toHaveBeenCalledWith(requestWithoutCode);
    });

    it('should handle callback for requests with auth code', async () => {
      const spy = jest.spyOn(strategy as any, 'handleCallback');

      await strategy.authenticate(mockRequest);

      expect(spy).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe.skip('initiateAuthFlow', () => {
    it('should generate PKCE codes and redirect to auth URL', async () => {
      // Mock the session object with proper structure
      const requestWithSession = {
        session: {},
        res: {
          redirect: jest.fn(),
        },
      } as unknown as Request;

      // Mock the cryptoProvider to set session properties
      (cryptoProvider.generatePkceCodes as jest.Mock).mockImplementation(() => {
        (requestWithSession.session as any).pkceVerifier = 'mock-verifier';
        (requestWithSession.session as any).state = 'mock-state';
        return { verifier: 'mock-verifier', challenge: 'mock-challenge' };
      });

      await (strategy as any).initiateAuthFlow(requestWithSession);

      // Check if PKCE codes were generated
      expect(cryptoProvider.generatePkceCodes).toHaveBeenCalled();

      // Check if session was updated with PKCE verifier and state
      expect((requestWithSession.session as any).pkceVerifier).toBe(
        'mock-verifier',
      );
      expect((requestWithSession.session as any).state).toBe('mock-state');

      // Check if getAuthCodeUrl was called with correct parameters
      expect(msalClient.getAuthCodeUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: expect.arrayContaining([
            'openid',
            'profile',
            'email',
            'User.Read',
          ]),
          redirectUri: 'http://test-app.com/api/auth/microsoft/callback',
          codeChallenge: 'mock-challenge',
          codeChallengeMethod: 'S256',
        }),
      );

      // Check if redirect was called
      expect(requestWithSession.res.redirect).toHaveBeenCalledWith(
        'https://mock-auth-url.com',
      );
    });
  });

  describe('handleCallback', () => {
    it.skip('should acquire token and validate user on successful callback', async () => {
      const mockRequest = {
        query: {
          code: 'mock-auth-code',
          state: 'mock-state',
        },
        session: {
          pkceVerifier: 'mock-verifier',
          state: 'mock-state',
        },
      } as unknown as Request;

      const mockTokenResponse = {
        accessToken: 'mock-access-token',
        idTokenClaims: {
          preferred_username: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          oid: '123456',
        },
        account: {
          homeAccountId: 'mock-refresh-token',
        },
        expiresOn: new Date(),
      };

      (msalClient.acquireTokenByCode as jest.Mock).mockResolvedValue(
        mockTokenResponse,
      );

      mockAuthService.validateOrCreateMicrosoftUser.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });

      // Mock success method
      const successSpy = jest.spyOn(strategy as any, 'success');

      await (strategy as any).handleCallback(mockRequest);

      // Check if acquireTokenByCode was called with correct parameters
      expect(msalClient.acquireTokenByCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'mock-auth-code',
          codeVerifier: 'mock-verifier',
          redirectUri: expect.any(String),
          scopes: expect.arrayContaining([
            'openid',
            'profile',
            'email',
            'User.Read',
          ]),
        }),
      );

      // Check if validateOrCreateMicrosoftUser was called with user object
      expect(
        mockAuthService.validateOrCreateMicrosoftUser,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          microsoftId: '123456',
          tokens: expect.any(Object),
        }),
      );

      // Check if success was called with validated user
      expect(successSpy).toHaveBeenCalledWith({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('should fail authentication if state does not match', async () => {
      const requestWithMismatchedState = {
        query: {
          code: 'mock-auth-code',
          state: 'different-state',
        },
        session: {
          pkceVerifier: 'mock-verifier',
          state: 'mock-state',
        },
      } as unknown as Request;

      const failSpy = jest.spyOn(strategy as any, 'fail');

      await (strategy as any).handleCallback(requestWithMismatchedState);

      expect(failSpy).toHaveBeenCalled();
      // We can't check the exact error message since it's created in the strategy
    });

    it('should fail authentication if code is missing', async () => {
      const requestWithoutCode = {
        query: {
          state: 'mock-state',
        },
        session: {
          pkceVerifier: 'mock-verifier',
          state: 'mock-state',
        },
      } as unknown as Request;

      const failSpy = jest.spyOn(strategy as any, 'fail');

      await (strategy as any).handleCallback(requestWithoutCode);

      expect(failSpy).toHaveBeenCalled();
      // We can't check the exact error message since it's created in the strategy
    });
  });

  describe('validate', () => {
    it('should return null as per implementation', async () => {
      const result = await strategy.validate();
      expect(result).toBeNull();
    });
  });
});
