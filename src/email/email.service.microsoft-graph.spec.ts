import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { MicrosoftGraphEmailService } from '../microsoft-graph/microsoft-graph-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';

describe('EmailService - Microsoft Graph Integration', () => {
  let service: EmailService;
  let _microsoftGraphEmailService: MicrosoftGraphEmailService;
  let _prismaService: PrismaService;

  // Create mock PrismaService
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
  };

  // Create mock MicrosoftGraphEmailService
  const mockMicrosoftGraphEmailService = {
    sendEmail: jest.fn(),
    fetchEmails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: MicrosoftGraphEmailService,
          useValue: mockMicrosoftGraphEmailService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    _microsoftGraphEmailService = module.get<MicrosoftGraphEmailService>(
      MicrosoftGraphEmailService,
    );
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('sendEmail with Microsoft Graph', () => {
    it('should use Microsoft Graph API when microsoftGraphEnabled is true', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Content',
        html: '<p>Test HTML Content</p>',
      };

      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      const mockSentEmail: Partial<Email> = {
        id: 'email-id',
        from: 'sender@example.com',
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        isSent: true,
        sentAt: new Date(),
        folder: 'SENT',
        userId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockMicrosoftGraphEmailService.sendEmail.mockResolvedValue(
        mockSentEmail as Email,
      );

      const result = await service.sendEmail(userId, emailData);

      expect(result).toEqual(mockSentEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockMicrosoftGraphEmailService.sendEmail).toHaveBeenCalledWith(
        userId,
        emailData,
      );
    });
  });

  describe('fetchEmails with Microsoft Graph', () => {
    it('should use Microsoft Graph API when microsoftGraphEnabled is true', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };

      const mockUser = {
        id: userId,
        microsoftGraphEnabled: true,
      };

      const mockEmailsResponse = {
        emails: [
          {
            id: 'email-1',
            subject: 'Test Email 1',
            from: 'sender1@example.com',
            to: ['recipient1@example.com'],
          },
        ] as Email[],
        total: 1,
        hasMore: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockMicrosoftGraphEmailService.fetchEmails.mockResolvedValue(
        mockEmailsResponse,
      );

      const result = await service.fetchEmails(userId, options);

      expect(result).toEqual(mockEmailsResponse);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockMicrosoftGraphEmailService.fetchEmails).toHaveBeenCalledWith(
        userId,
        options,
      );
    });
  });
});
