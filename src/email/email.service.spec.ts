import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailConfigDto } from './dto/email-config.dto';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';

// Mock external modules
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({}),
    }),
  };
});

// Mock DOMPurify
jest.mock('dompurify', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      sanitize: jest.fn((html) => html),
    })),
  };
});

// Get the mocked functions for use in tests
const nodemailer = jest.requireMock('nodemailer');
const mockCreateTransport = nodemailer.createTransport;
const mockSendMail = mockCreateTransport().sendMail;
jest.mock('imap');
jest.mock('poplib');
jest.mock('mailparser');

describe('EmailService', () => {
  let service: EmailService;
  let prismaService: PrismaService;

  // Create mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    email: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserEmailConfig', () => {
    it('should return user email configuration', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        emailHost: 'smtp.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'test@example.com',
        emailPassword: 'password',
        emailSecure: true,
        imapEnabled: true,
        smtpEnabled: true,
        pop3Enabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserEmailConfig(userId);

      expect(result).toEqual({
        emailHost: mockUser.emailHost,
        imapPort: mockUser.imapPort,
        pop3Port: mockUser.pop3Port,
        smtpPort: mockUser.smtpPort,
        emailUsername: mockUser.emailUsername,
        emailPassword: mockUser.emailPassword,
        emailSecure: mockUser.emailSecure,
        imapEnabled: mockUser.imapEnabled,
        smtpEnabled: mockUser.smtpEnabled,
        pop3Enabled: mockUser.pop3Enabled,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        select: {
          emailHost: true,
          emailPassword: true,
          emailSecure: true,
          emailUsername: true,
          imapEnabled: true,
          imapPort: true,
          pop3Enabled: true,
          pop3Port: true,
          smtpEnabled: true,
          smtpPort: true,
        },
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'non-existent-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserEmailConfig(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        select: {
          emailHost: true,
          emailPassword: true,
          emailSecure: true,
          emailUsername: true,
          imapEnabled: true,
          imapPort: true,
          pop3Enabled: true,
          pop3Port: true,
          smtpEnabled: true,
          smtpPort: true,
        },
        where: { id: userId },
      });
    });
  });

  describe('updateUserEmailConfig', () => {
    it('should update user email configuration', async () => {
      const userId = 'user-id';
      const emailConfig = new EmailConfigDto();
      emailConfig.emailHost = 'smtp.updated.com';
      emailConfig.imapPort = 993;
      emailConfig.pop3Port = 995;
      emailConfig.smtpPort = 465;
      emailConfig.emailUsername = 'updated@example.com';
      emailConfig.emailPassword = 'newpassword';
      emailConfig.emailSecure = true;
      emailConfig.imapEnabled = true;
      emailConfig.smtpEnabled = true;
      emailConfig.pop3Enabled = true;

      const updatedUser = {
        id: userId,
        ...emailConfig,
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserEmailConfig(userId, emailConfig);

      expect(result).toEqual(emailConfig);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: emailConfig,
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email and save it to database', async () => {
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
        emailHost: 'smtp.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'sender@example.com',
        emailPassword: 'password',
        emailSecure: true,
        smtpEnabled: true,
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
        sentAt: new Date(),
        folder: 'SENT',
        userId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.email.create.mockResolvedValue(mockSentEmail as Email);

      const result = await service.sendEmail(userId, emailData);

      expect(result).toEqual(mockSentEmail);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockSendMail).toHaveBeenCalledWith({
        from: mockUser.emailUsername,
        to: emailData.to.join(','),
        cc: emailData.cc?.join(','),
        bcc: emailData.bcc?.join(','),
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });
      expect(prismaService.email.create).toHaveBeenCalledWith({
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
          userId,
        },
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'non-existent-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when SMTP is not enabled', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };

      const mockUser = {
        id: userId,
        emailHost: 'smtp.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'sender@example.com',
        emailPassword: 'password',
        emailSecure: true,
        smtpEnabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw Error when email configuration is incomplete', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };

      const mockUser = {
        id: userId,
        emailHost: null,
        imapPort: null,
        pop3Port: null,
        smtpPort: null,
        emailUsername: null,
        emailPassword: null,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        'Email configuration is incomplete',
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle errors during email sending', async () => {
      const userId = 'user-id';
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      };

      const mockUser = {
        id: userId,
        emailHost: 'smtp.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'sender@example.com',
        emailPassword: 'password',
        emailSecure: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
        'Failed to send email: SMTP error',
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('getEmailsFromDatabase', () => {
    it('should return emails from database with pagination', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };

      const mockEmails: Partial<Email>[] = [
        {
          id: 'email-1',
          subject: 'Test Email 1',
          from: 'sender1@example.com',
          to: ['recipient1@example.com'],
        },
        {
          id: 'email-2',
          subject: 'Test Email 2',
          from: 'sender2@example.com',
          to: ['recipient2@example.com'],
        },
      ];

      const totalCount = 20;

      mockPrismaService.email.findMany.mockResolvedValue(mockEmails as Email[]);
      mockPrismaService.email.count.mockResolvedValue(totalCount);

      const result = await service.getEmailsFromDatabase(userId, options);

      expect(result).toEqual({
        emails: mockEmails,
        total: totalCount,
        hasMore: true,
      });
      expect(prismaService.email.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          folder: options.folder,
          isDeleted: false,
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: {
          receivedAt: 'desc',
        },
      });
      expect(prismaService.email.count).toHaveBeenCalledWith({
        where: {
          userId,
          folder: options.folder,
          isDeleted: false,
        },
      });
    });

    it('should use default values when options are not provided', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = {};

      const mockEmails: Partial<Email>[] = [];
      const totalCount = 0;

      mockPrismaService.email.findMany.mockResolvedValue(mockEmails as Email[]);
      mockPrismaService.email.count.mockResolvedValue(totalCount);

      const result = await service.getEmailsFromDatabase(userId, options);

      expect(result).toEqual({
        emails: mockEmails,
        total: totalCount,
        hasMore: false,
      });
      expect(prismaService.email.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          folder: 'INBOX',
          isDeleted: false,
        },
        skip: 0,
        take: 20,
        orderBy: {
          receivedAt: 'desc',
        },
      });
    });
  });

  describe('markEmailAsRead', () => {
    it('should mark email as read', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      const existingEmail: Partial<Email> = {
        id: emailId,
        isRead: false,
      };

      const mockEmail: Partial<Email> = {
        id: emailId,
        isRead: true,
      };

      mockPrismaService.email.findFirst.mockResolvedValue(
        existingEmail as Email,
      );
      mockPrismaService.email.update.mockResolvedValue(mockEmail as Email);

      const result = await service.markEmailAsRead(userId, emailId);

      expect(result).toEqual(mockEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(service.markEmailAsRead(userId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('markEmailAsDeleted', () => {
    it('should mark email as deleted', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const mockEmail = {
        id: emailId,
        userId,
        isDeleted: true,
      };

      const existingEmail = {
        id: emailId,
        userId,
        isDeleted: false,
        folder: 'TRASH',
      };

      mockPrismaService.email.findFirst.mockResolvedValue(
        existingEmail as Email,
      );
      mockPrismaService.email.update.mockResolvedValue(mockEmail as Email);

      const result = await service.markEmailAsDeleted(userId, emailId);

      expect(result).toEqual(mockEmail);
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { isDeleted: true },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(service.markEmailAsDeleted(userId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('moveEmailToFolder', () => {
    it('should move email to specified folder', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const folder = 'ARCHIVE';

      const mockEmail: Partial<Email> = {
        id: emailId,
        folder: 'INBOX', // Original folder
      };

      const updatedMockEmail: Partial<Email> = {
        id: emailId,
        folder, // New folder
      };

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);
      mockPrismaService.email.update.mockResolvedValue(
        updatedMockEmail as Email,
      );

      const result = await service.moveEmailToFolder(userId, emailId, folder);

      expect(result).toEqual(updatedMockEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { folder },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const folder = 'ARCHIVE';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(
        service.moveEmailToFolder(userId, emailId, folder),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('markEmailAsRead', () => {
    it('should mark email as read', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      const existingEmail: Partial<Email> = {
        id: emailId,
        isRead: false,
      };

      const mockEmail: Partial<Email> = {
        id: emailId,
        isRead: true,
      };

      mockPrismaService.email.findFirst.mockResolvedValue(
        existingEmail as Email,
      );
      mockPrismaService.email.update.mockResolvedValue(mockEmail as Email);

      const result = await service.markEmailAsRead(userId, emailId);

      expect(result).toEqual(mockEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(service.markEmailAsRead(userId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('markEmailAsDeleted', () => {
    it('should mark email as deleted', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const mockEmail = {
        id: emailId,
        userId,
        isDeleted: true,
      };

      const existingEmail = {
        id: emailId,
        userId,
        isDeleted: false,
        folder: 'TRASH',
      };

      mockPrismaService.email.findFirst.mockResolvedValue(
        existingEmail as Email,
      );
      mockPrismaService.email.update.mockResolvedValue(mockEmail as Email);

      const result = await service.markEmailAsDeleted(userId, emailId);

      expect(result).toEqual(mockEmail);
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { isDeleted: true },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(service.markEmailAsDeleted(userId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('moveEmailToFolder', () => {
    it('should move email to specified folder', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const folder = 'ARCHIVE';

      const mockEmail: Partial<Email> = {
        id: emailId,
        folder: 'INBOX', // Original folder
      };

      const updatedMockEmail: Partial<Email> = {
        id: emailId,
        folder, // New folder
      };

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);
      mockPrismaService.email.update.mockResolvedValue(
        updatedMockEmail as Email,
      );

      const result = await service.moveEmailToFolder(userId, emailId, folder);

      expect(result).toEqual(updatedMockEmail);
      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { folder },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';
      const folder = 'ARCHIVE';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(
        service.moveEmailToFolder(userId, emailId, folder),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(mockPrismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('fetchEmailsIMAP', () => {
    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.fetchEmailsIMAP(userId, options)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when IMAP is not enabled', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      const mockUser = {
        id: userId,
        emailHost: 'imap.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'user@example.com',
        emailPassword: 'password',
        emailSecure: true,
        imapEnabled: false, // IMAP not enabled
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.fetchEmailsIMAP(userId, options)).rejects.toThrow(
        'User not found or IMAP not enabled',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw Error when email configuration is incomplete', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      const mockUser = {
        id: userId,
        emailHost: '', // Missing host
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'user@example.com',
        emailPassword: 'password',
        emailSecure: true,
        imapEnabled: true,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.fetchEmailsIMAP(userId, options)).rejects.toThrow(
        'Email configuration is incomplete',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('fetchEmailsPOP3', () => {
    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'POP3 is not enabled for this user',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw Error when POP3 is not enabled', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      const mockUser = {
        id: userId,
        emailHost: 'pop.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'user@example.com',
        emailPassword: 'password',
        emailSecure: true,
        imapEnabled: true,
        pop3Enabled: false, // POP3 not enabled
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'POP3 is not enabled for this user',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw Error when email configuration is incomplete', async () => {
      const userId = 'user-id';
      const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

      const mockUser = {
        id: userId,
        emailHost: '', // Missing host
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'user@example.com',
        emailPassword: 'password',
        emailSecure: true,
        imapEnabled: true,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'Failed to fetch emails: POP3 configuration is incomplete',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('saveEmailsToDatabase', () => {
    it('should save emails to database', async () => {
      const userId = 'user-id';
      const emails: Partial<Email>[] = [
        {
          messageId: 'message-id-1',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          text: 'Test content',
          html: '<p>Test content</p>',
          receivedAt: new Date(),
          folder: 'INBOX',
        },
      ];

      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockPrismaService.email.create.mockResolvedValue({} as Email);

      await service.saveEmailsToDatabase(emails as Partial<Email>[], userId);

      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          messageId: 'message-id-1',
          userId,
        },
      });
      expect(mockPrismaService.email.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: 'message-id-1',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          text: 'Test content',
          html: '<p>Test content</p>',
          folder: 'INBOX',
          userId,
        }),
      });
    });
  });
});
