import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';

describe('MicrosoftGraphEmailService', () => {
  let service: MicrosoftGraphEmailService;
  let _prismaService: PrismaService;
  let _configService: ConfigService;
  let _graphAuthService: MicrosoftGraphAuthService;

  // Mock GraphClient
  const mockGraphClient = {
    api: jest.fn().mockReturnThis(),
    post: jest.fn(),
    get: jest.fn(),
    select: jest.fn().mockReturnThis(),
    top: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    orderby: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
  };

  // Mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    email: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock MicrosoftGraphAuthService
  const mockGraphAuthService = {
    getAuthenticatedClient: jest.fn(),
    getAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGraphAuthService.getAuthenticatedClient.mockResolvedValue(
      mockGraphClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftGraphEmailService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MicrosoftGraphAuthService, useValue: mockGraphAuthService },
      ],
    }).compile();

    service = module.get<MicrosoftGraphEmailService>(
      MicrosoftGraphEmailService,
    );
    _prismaService = module.get<PrismaService>(PrismaService);
    _configService = module.get<ConfigService>(ConfigService);
    _graphAuthService = module.get<MicrosoftGraphAuthService>(
      MicrosoftGraphAuthService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully and save to database', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        text: 'Test Content',
        html: '<p>Test HTML Content</p>',
      };

      const mockUser = {
        id: userId,
        emailUsername: 'sender@example.com',
      };

      const mockSentEmail = {
        id: 'email-id',
        from: 'sender@example.com',
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        isSent: true,
        sentAt: expect.any(Date),
        folder: 'SENT',
        userId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.email.create.mockResolvedValue(mockSentEmail as Email);
      mockGraphClient.post.mockResolvedValue({});

      // Act
      const result = await service.sendEmail(userId, emailData);

      // Assert
      expect(result).toEqual(mockSentEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me/sendMail');
      expect(mockGraphClient.post).toHaveBeenCalledWith({
        message: {
          subject: emailData.subject,
          body: {
            contentType: 'HTML',
            content: emailData.html,
          },
          toRecipients: [
            { emailAddress: { address: 'recipient@example.com' } },
          ],
          ccRecipients: [{ emailAddress: { address: 'cc@example.com' } }],
          bccRecipients: [{ emailAddress: { address: 'bcc@example.com' } }],
        },
        saveToSentItems: true,
      });
      expect(mockPrismaService.email.create).toHaveBeenCalledWith({
        data: {
          from: mockUser.emailUsername,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
          isSent: true,
          sentAt: expect.any(Date),
          folder: 'SENT',
          userId: userId,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Content',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        `User with id ${userId} not found`,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(
        mockGraphAuthService.getAuthenticatedClient,
      ).not.toHaveBeenCalled();
    });

    it('should handle Graph API errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Content',
      };

      const mockUser = {
        id: userId,
        emailUsername: 'sender@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.post.mockRejectedValue(new Error('Graph API error'));

      // Act & Assert
      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        'Failed to send email via Microsoft Graph: Graph API error',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me/sendMail');
    });
  });

  describe('validateUserConfig', () => {
    it('should validate user config successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await service.validateUserConfig(userId);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        `User with id ${userId} not found`,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw BadRequestException when Microsoft Graph is not enabled', async () => {
      // Arrange
      const userId = 'test-user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        'Microsoft Graph is not enabled for this user',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(
        mockGraphAuthService.getAuthenticatedClient,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authentication fails', async () => {
      // Arrange
      const userId = 'test-user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphAuthService.getAuthenticatedClient.mockRejectedValue(
        new Error('Authentication failed'),
      );

      // Act & Assert
      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        'Microsoft Graph authentication failed',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });
  });

  describe('getMailFolders', () => {
    it('should return mail folders successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const mockFolders = [
        {
          id: 'inbox',
          displayName: 'Inbox',
          totalItemCount: 10,
          unreadItemCount: 5,
        },
        {
          id: 'sent',
          displayName: 'Sent Items',
          totalItemCount: 20,
          unreadItemCount: 0,
        },
      ];

      mockGraphClient.get.mockResolvedValue({ value: mockFolders });

      // Act
      const result = await service.getMailFolders(userId);

      // Assert
      expect(result).toEqual(mockFolders);
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me/mailFolders');
      expect(mockGraphClient.select).toHaveBeenCalledWith(
        'id,displayName,totalItemCount,unreadItemCount',
      );
    });

    it('should handle errors when getting mail folders', async () => {
      // Arrange
      const userId = 'test-user-id';
      mockGraphClient.get.mockRejectedValue(new Error('Failed to get folders'));

      // Act & Assert
      await expect(service.getMailFolders(userId)).rejects.toThrow(
        'Failed to get mail folders: Failed to get folders',
      );
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me/mailFolders');
    });
  });

  describe('getEmailById', () => {
    it('should return email from database when it exists', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailId = 'test-email-id';
      const mockEmail = {
        id: 'db-email-id',
        messageId: emailId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        userId,
      };

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);

      // Act
      const result = await service.getEmailById(userId, emailId);

      // Assert
      expect(result).toEqual(mockEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          userId: userId,
          messageId: emailId,
        },
      });
      expect(
        mockGraphAuthService.getAuthenticatedClient,
      ).not.toHaveBeenCalled();
    });

    it('should fetch email from Microsoft Graph when not in database', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailId = 'test-email-id';

      const mockGraphEmail = {
        id: emailId,
        subject: 'Test Subject',
        bodyPreview: 'Email content preview',
        body: { content: '<p>Email content</p>' },
        from: { emailAddress: { address: 'sender@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-01T12:00:00Z',
        sentDateTime: '2023-01-01T11:55:00Z',
        hasAttachments: false,
      };

      const mockSavedEmail = {
        id: 'db-email-id',
        messageId: emailId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        userId,
      };

      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockGraphClient.get.mockResolvedValue(mockGraphEmail);

      // Mock the private saveEmailsToDatabase method
      jest
        .spyOn(service as any, 'saveEmailsToDatabase')
        .mockResolvedValue([mockSavedEmail as Email]);

      // Act
      const result = await service.getEmailById(userId, emailId);

      // Assert
      expect(result).toEqual(mockSavedEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          userId: userId,
          messageId: emailId,
        },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        `/me/messages/${emailId}`,
      );
      expect(mockGraphClient.select).toHaveBeenCalledWith(
        'id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments',
      );
    });

    it('should throw NotFoundException when email not found in Graph API', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailId = 'non-existent-email';

      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockGraphClient.get.mockRejectedValue(new Error('Email not found'));

      // Act & Assert
      await expect(service.getEmailById(userId, emailId)).rejects.toThrow(
        `Email with ID ${emailId} not found`,
      );
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          userId: userId,
          messageId: emailId,
        },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });
  });

  describe('fetchEmails', () => {
    it('should fetch emails successfully with pagination', async () => {
      // Arrange
      const userId = 'test-user-id';
      const options: GetEmailsDto = {
        folder: 'inbox',
        page: 1,
        limit: 20,
      };

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
      };

      const mockGraphEmails = [
        {
          id: 'email-1',
          subject: 'Subject 1',
          bodyPreview: 'Content 1',
          from: { emailAddress: { address: 'sender1@example.com' } },
          toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
          ccRecipients: [],
          bccRecipients: [],
          receivedDateTime: '2023-01-01T12:00:00Z',
          hasAttachments: false,
          isRead: false,
          isDraft: false,
        },
        {
          id: 'email-2',
          subject: 'Subject 2',
          bodyPreview: 'Content 2',
          from: { emailAddress: { address: 'sender2@example.com' } },
          toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
          ccRecipients: [],
          bccRecipients: [],
          receivedDateTime: '2023-01-02T12:00:00Z',
          hasAttachments: true,
          isRead: true,
          isDraft: false,
        },
      ];

      const mockSavedEmails = [
        {
          id: 'db-email-1',
          messageId: 'email-1',
          subject: 'Subject 1',
          from: 'sender1@example.com',
          to: ['user@example.com'],
          receivedAt: new Date('2023-01-01T12:00:00Z'),
          folder: 'inbox',
          userId,
        },
        {
          id: 'db-email-2',
          messageId: 'email-2',
          subject: 'Subject 2',
          from: 'sender2@example.com',
          to: ['user@example.com'],
          receivedAt: new Date('2023-01-02T12:00:00Z'),
          folder: 'inbox',
          userId,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock the header method to return the client for chaining
      mockGraphClient.header.mockReturnValue(mockGraphClient);

      // Set up the mock implementation for the Graph client
      mockGraphClient.get
        .mockResolvedValueOnce('50') // First call returns count
        .mockResolvedValueOnce({ value: mockGraphEmails }); // Second call returns emails

      // Mock the saveEmailsToDatabase method
      jest
        .spyOn(service as any, 'saveEmailsToDatabase')
        .mockResolvedValue(mockSavedEmails as Email[]);
      mockPrismaService.email.findMany.mockResolvedValue(
        mockSavedEmails as Email[],
      );

      // Act
      const result = await service.fetchEmails(userId, options);

      // Assert
      expect(result).toEqual({
        emails: mockSavedEmails,
        total: 50,
        hasMore: true,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        '/me/mailFolders/inbox/messages/$count',
      );
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        '/me/mailFolders/inbox/messages',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const options: GetEmailsDto = {
        folder: 'inbox',
        page: 1,
        limit: 20,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.fetchEmails(userId, options)).rejects.toThrow(
        `User with id ${userId} not found`,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(
        mockGraphAuthService.getAuthenticatedClient,
      ).not.toHaveBeenCalled();
    });

    it('should handle Graph API errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      const options: GetEmailsDto = {
        folder: 'inbox',
        page: 1,
        limit: 20,
      };

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.get.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(service.fetchEmails(userId, options)).rejects.toThrow(
        'Failed to fetch emails via Microsoft Graph: API error',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });
  });

  describe('getEmailDetails', () => {
    it('should get email details and update existing email', async () => {
      // Arrange
      const userId = 'test-user-id';
      const messageId = 'test-email-id';

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
      };

      const mockGraphEmail = {
        id: messageId,
        subject: 'Test Subject',
        bodyPreview: 'Email content preview',
        body: { content: '<p>Email content</p>' },
        from: { emailAddress: { address: 'sender@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-01T12:00:00Z',
        hasAttachments: false,
        isRead: false,
        isDraft: false,
      };

      const existingEmail = {
        id: 'db-email-id',
        messageId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        userId,
      };

      const updatedEmail = {
        ...existingEmail,
        html: '<p>Email content</p>',
        isRead: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.get.mockResolvedValue(mockGraphEmail);
      mockPrismaService.email.findFirst.mockResolvedValue(
        existingEmail as Email,
      );
      mockPrismaService.email.update.mockResolvedValue(updatedEmail as Email);

      // Act
      const result = await service.getEmailDetails(userId, messageId);

      // Assert
      expect(result).toEqual(updatedEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        `/me/messages/${messageId}`,
      );
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          messageId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).toHaveBeenCalledWith({
        where: { id: existingEmail.id },
        data: {
          html: mockGraphEmail.body.content,
          isRead: true,
        },
      });
    });

    it('should get email details and create new email when not found', async () => {
      // Arrange
      const userId = 'test-user-id';
      const messageId = 'test-email-id';

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
      };

      const mockGraphEmail = {
        id: messageId,
        subject: 'Test Subject',
        bodyPreview: 'Email content preview',
        body: { content: '<p>Email content</p>' },
        from: { emailAddress: { address: 'sender@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-01T12:00:00Z',
        hasAttachments: false,
        isRead: false,
        isDraft: false,
      };

      const newEmail = {
        id: 'db-email-id',
        messageId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        html: '<p>Email content</p>',
        isRead: true,
        userId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.get.mockResolvedValue(mockGraphEmail);
      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockPrismaService.email.create.mockResolvedValue(newEmail as Email);

      // Act
      const result = await service.getEmailDetails(userId, messageId);

      // Assert
      expect(result).toEqual(newEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith(
        `/me/messages/${messageId}`,
      );
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          messageId,
          userId,
        },
      });
      expect(mockPrismaService.email.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId,
          from: 'sender@example.com',
          html: '<p>Email content</p>',
          isRead: true,
          userId,
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const messageId = 'test-email-id';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getEmailDetails(userId, messageId)).rejects.toThrow(
        `User with id ${userId} not found`,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(
        mockGraphAuthService.getAuthenticatedClient,
      ).not.toHaveBeenCalled();
    });

    it('should handle Graph API errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      const messageId = 'test-email-id';

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.get.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(service.getEmailDetails(userId, messageId)).rejects.toThrow(
        'Failed to get email details: API error',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });
  });
});
