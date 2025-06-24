import { Test, TestingModule } from '@nestjs/testing';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';
import { MicrosoftGraphController } from './microsoft-graph.controller';

describe('MicrosoftGraphController', () => {
  let controller: MicrosoftGraphController;
  let _microsoftGraphEmailService: MicrosoftGraphEmailService;

  // Mock MicrosoftGraphEmailService
  const mockMicrosoftGraphEmailService = {
    sendEmail: jest.fn(),
    fetchEmails: jest.fn(),
    getEmailById: jest.fn(),
    validateUserConfig: jest.fn(),
    getMailFolders: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MicrosoftGraphController],
      providers: [
        {
          provide: MicrosoftGraphEmailService,
          useValue: mockMicrosoftGraphEmailService,
        },
      ],
    }).compile();

    controller = module.get<MicrosoftGraphController>(MicrosoftGraphController);
    _microsoftGraphEmailService = module.get<MicrosoftGraphEmailService>(
      MicrosoftGraphEmailService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should call microsoftGraphEmailService.sendEmail with correct parameters', async () => {
      const userId = 'test-user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };
      const expectedResult = { id: 'email-id' };

      mockMicrosoftGraphEmailService.sendEmail.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.sendEmail(userId, emailData);

      expect(result).toBe(expectedResult);
      expect(mockMicrosoftGraphEmailService.sendEmail).toHaveBeenCalledWith(
        userId,
        emailData,
      );
    });
  });

  describe('getEmails', () => {
    it('should call microsoftGraphEmailService.fetchEmails with correct parameters', async () => {
      const userId = 'test-user-id';
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };
      const expectedResult = {
        emails: [],
        total: 0,
        hasMore: false,
      };

      mockMicrosoftGraphEmailService.fetchEmails.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getEmails(userId, options);

      expect(result).toBe(expectedResult);
      expect(mockMicrosoftGraphEmailService.fetchEmails).toHaveBeenCalledWith(
        userId,
        options,
      );
    });
  });

  describe('getEmailById', () => {
    it('should call microsoftGraphEmailService.getEmailById with correct parameters', async () => {
      const userId = 'test-user-id';
      const emailId = 'test-email-id';
      const expectedResult = { id: 'email-id' };

      mockMicrosoftGraphEmailService.getEmailById.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getEmailById(userId, emailId);

      expect(result).toBe(expectedResult);
      expect(mockMicrosoftGraphEmailService.getEmailById).toHaveBeenCalledWith(
        userId,
        emailId,
      );
    });
  });

  describe('getStatus', () => {
    it('should return connected status when validation succeeds', async () => {
      const userId = 'test-user-id';

      mockMicrosoftGraphEmailService.validateUserConfig.mockResolvedValue(
        undefined,
      );

      const result = await controller.getStatus(userId);

      expect(result).toEqual({
        status: 'connected',
        message: 'Microsoft Graph API is connected',
      });
      expect(
        mockMicrosoftGraphEmailService.validateUserConfig,
      ).toHaveBeenCalledWith(userId);
    });

    it('should return error status when validation fails', async () => {
      const userId = 'test-user-id';
      const errorMessage = 'Authentication failed';

      mockMicrosoftGraphEmailService.validateUserConfig.mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await controller.getStatus(userId);

      expect(result).toEqual({
        status: 'error',
        message: `Microsoft Graph API connection failed: ${errorMessage}`,
      });
      expect(
        mockMicrosoftGraphEmailService.validateUserConfig,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('getFolders', () => {
    it('should call microsoftGraphEmailService.getMailFolders with correct parameters', async () => {
      const userId = 'test-user-id';
      const expectedResult = [
        {
          id: 'folder-id',
          displayName: 'Inbox',
          totalItemCount: 10,
          unreadItemCount: 5,
        },
      ];

      mockMicrosoftGraphEmailService.getMailFolders.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getFolders(userId);

      expect(result).toBe(expectedResult);
      expect(
        mockMicrosoftGraphEmailService.getMailFolders,
      ).toHaveBeenCalledWith(userId);
    });
  });
});
