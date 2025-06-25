import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';

// Mock the Microsoft Graph Client
const mockGraphClient = {
  api: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  top: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  orderby: jest.fn().mockReturnThis(),
  header: jest.fn().mockReturnThis(),
  get: jest.fn(),
  post: jest.fn(),
};

describe('MicrosoftGraphEmailService', () => {
  let service: MicrosoftGraphEmailService;
  let _prismaService: PrismaService;
  let _graphAuthService: MicrosoftGraphAuthService;
  let _configService: ConfigService;

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
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock MicrosoftGraphAuthService
  const mockGraphAuthService = {
    getAccessToken: jest.fn(),
    getAuthenticatedClient: jest.fn().mockResolvedValue(mockGraphClient),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftGraphEmailService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MicrosoftGraphAuthService, useValue: mockGraphAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MicrosoftGraphEmailService>(
      MicrosoftGraphEmailService,
    );
    _prismaService = module.get<PrismaService>(PrismaService);
    _graphAuthService = module.get<MicrosoftGraphAuthService>(
      MicrosoftGraphAuthService,
    );
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMailFolders', () => {
    it('should return mail folders successfully', async () => {
      const userId = 'user-id';
      const mockFolders = [
        {
          id: 'folder-1',
          displayName: 'Inbox',
          totalItemCount: 10,
          unreadItemCount: 5,
        },
        {
          id: 'folder-2',
          displayName: 'Sent Items',
          totalItemCount: 20,
          unreadItemCount: 0,
        },
      ];

      mockGraphClient.get.mockResolvedValue({ value: mockFolders });

      const result = await service.getMailFolders(userId);

      expect(result).toEqual(mockFolders);
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me/mailFolders');
      expect(mockGraphClient.select).toHaveBeenCalledWith(
        'id,displayName,totalItemCount,unreadItemCount',
      );
      expect(mockGraphClient.get).toHaveBeenCalled();
    });

    it('should handle errors when getting mail folders fails', async () => {
      const userId = 'user-id';

      mockGraphClient.get.mockRejectedValue(new Error('API error'));

      await expect(service.getMailFolders(userId)).rejects.toThrow(
        'Failed to get mail folders: API error',
      );
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });
  });

  describe('getEmailById', () => {
    it('should return email from database if it exists', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const mockEmail = {
        id: 'db-email-id',
        messageId: emailId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        userId,
      };

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail);

      const result = await service.getEmailById(userId, emailId);

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

    it('should fetch email from Microsoft Graph if not in database', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const mockGraphEmail = {
        id: emailId,
        subject: 'Test Subject',
        bodyPreview: 'Email body preview',
        body: { content: '<p>Email body</p>' },
        from: { emailAddress: { address: 'sender@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-01T12:00:00Z',
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

      // Mock the saveEmailsToDatabase private method
      jest
        .spyOn(service as any, 'saveEmailsToDatabase')
        .mockResolvedValue([mockSavedEmail]);

      const result = await service.getEmailById(userId, emailId);

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
      expect(mockGraphClient.get).toHaveBeenCalled();
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'non-existent-email-id';

      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockGraphClient.get.mockRejectedValue(new Error('Email not found'));

      await expect(service.getEmailById(userId, emailId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email using Microsoft Graph API and save to database', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
        html: '<p>Test HTML Body</p>',
      };

      const mockUser = {
        id: userId,
        emailUsername: 'sender@example.com',
      };

      const mockSentEmail: Partial<Email> = {
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

      const result = await service.sendEmail(userId, emailData);

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
            content: emailData.html || emailData.text,
          },
          toRecipients: emailData.to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients: emailData.cc?.map((email) => ({
            emailAddress: { address: email },
          })),
          bccRecipients: emailData.bcc?.map((email) => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: true,
      });
      expect(mockPrismaService.email.create).toHaveBeenCalledWith({
        data: {
          from: mockUser.emailUsername,
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
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

    // it('should throw NotFoundException when user is not found', async () => {
    //   const userId = 'non-existent-id';
    //   const emailData: SendEmailDto = {
    //     to: ['recipient@example.com'],
    //     subject: 'Test Subject',
    //     text: 'Test Body',
    //   };

    //   mockPrismaService.user.findUnique.mockResolvedValue(null);

    //   await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
    //     NotFoundException,
    //   );
    // });

    it('should handle errors when sending email fails', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };

      const mockUser = {
        id: userId,
        emailUsername: 'sender@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphClient.post.mockRejectedValue(new Error('API error'));

      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        'Failed to send email via Microsoft Graph: API error',
      );
    });
  });

  describe('validateUserConfig', () => {
    it('should validate user configuration successfully', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.validateUserConfig(userId)).resolves.not.toThrow();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'non-existent-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when Microsoft Graph is not enabled', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when authentication fails', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockGraphAuthService.getAuthenticatedClient.mockRejectedValue(
        new Error('Auth failed'),
      );

      await expect(service.validateUserConfig(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
