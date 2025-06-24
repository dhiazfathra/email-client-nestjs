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
