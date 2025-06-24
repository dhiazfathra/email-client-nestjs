import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';

// Mock ConfidentialClientApplication
jest.mock('@azure/msal-node', () => {
  return {
    ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
      acquireTokenByClientCredential: jest.fn(),
    })),
  };
});

// Mock Client from microsoft-graph-client
jest.mock('@microsoft/microsoft-graph-client', () => {
  return {
    Client: {
      init: jest.fn().mockReturnValue({}),
    },
  };
});

describe('MicrosoftGraphAuthService', () => {
  let service: MicrosoftGraphAuthService;
  let _configService: ConfigService;

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  // Get mocked modules
  const msalNode = jest.requireMock('@azure/msal-node');
  const mockAcquireToken = jest.fn();
  const mockMsalClient = {
    acquireTokenByClientCredential: mockAcquireToken,
  };
  msalNode.ConfidentialClientApplication.mockImplementation(
    () => mockMsalClient,
  );

  const graphClient = jest.requireMock('@microsoft/microsoft-graph-client');
  const mockClientInit = graphClient.Client.init;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default mock values
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        MICROSOFT_CLIENT_ID: 'test-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-client-secret',
        MICROSOFT_TENANT_ID: 'test-tenant-id',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftGraphAuthService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MicrosoftGraphAuthService>(MicrosoftGraphAuthService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeMsalClient', () => {
    it('should initialize MSAL client with correct config', () => {
      expect(msalNode.ConfidentialClientApplication).toHaveBeenCalledWith({
        auth: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          authority: 'https://login.microsoftonline.com/test-tenant-id',
        },
      });
    });

    // it('should log error when Microsoft Graph credentials are not configured', async () => {
    //   jest.clearAllMocks();
    //   mockConfigService.get.mockReturnValue(null);

    //   const loggerSpy = jest.spyOn(service['logger'], 'error');

    //   // Re-initialize the service to trigger the error
    //   await Test.createTestingModule({
    //     providers: [
    //       MicrosoftGraphAuthService,
    //       { provide: ConfigService, useValue: mockConfigService },
    //     ],
    //   }).compile();

    //   expect(loggerSpy).toHaveBeenCalledWith(
    //     'Microsoft Graph credentials are not properly configured',
    //   );
    // });
  });

  describe('getAccessToken', () => {
    it('should return access token when successful', async () => {
      mockAcquireToken.mockResolvedValue({
        accessToken: 'test-access-token',
      });

      const result = await service.getAccessToken();

      expect(result).toBe('test-access-token');
      expect(mockAcquireToken).toHaveBeenCalledWith({
        scopes: ['https://graph.microsoft.com/.default'],
      });
    });

    it('should throw error when token acquisition fails', async () => {
      mockAcquireToken.mockRejectedValue(new Error('Token acquisition failed'));

      await expect(service.getAccessToken()).rejects.toThrow(
        'Authentication failed: Token acquisition failed',
      );
    });

    it('should throw error when access token is not returned', async () => {
      mockAcquireToken.mockResolvedValue({});

      await expect(service.getAccessToken()).rejects.toThrow(
        'Authentication failed: Failed to acquire access token',
      );
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should return authenticated client when successful', async () => {
      mockAcquireToken.mockResolvedValue({
        accessToken: 'test-access-token',
      });

      await service.getAuthenticatedClient();

      expect(mockClientInit).toHaveBeenCalledWith({
        authProvider: expect.any(Function),
      });

      // Test the authProvider function
      const authProvider = mockClientInit.mock.calls[0][0].authProvider;
      const doneMock = jest.fn();
      authProvider(doneMock);
      expect(doneMock).toHaveBeenCalledWith(null, 'test-access-token');
    });

    it('should throw error when token acquisition fails', async () => {
      mockAcquireToken.mockRejectedValue(new Error('Token acquisition failed'));

      await expect(service.getAuthenticatedClient()).rejects.toThrow(
        'Failed to create authenticated client: Authentication failed: Token acquisition failed',
      );
    });
  });
});
