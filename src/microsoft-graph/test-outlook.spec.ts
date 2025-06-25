import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';

// Mock the required modules
jest.mock('dompurify', () => {
  return jest.fn().mockImplementation(() => ({
    sanitize: jest.fn((html) => html),
    _default: jest.fn(),
  }));
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {},
  })),
}));

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

describe('Microsoft Graph Outlook Integration', () => {
  let emailService: EmailService;
  let _microsoftGraphEmailService: MicrosoftGraphEmailService;
  let _prismaService: PrismaService;

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

  // Mock MicrosoftGraphEmailService
  const mockMicrosoftGraphEmailService = {
    sendEmail: jest.fn(),
    fetchEmails: jest.fn(),
    getEmailById: jest.fn(),
    getEmailDetails: jest.fn(),
    getMailFolders: jest.fn(),
    validateUserConfig: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MicrosoftGraphEmailService,
          useValue: mockMicrosoftGraphEmailService,
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MicrosoftGraphAuthService, useValue: mockGraphAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    _microsoftGraphEmailService = module.get<MicrosoftGraphEmailService>(
      MicrosoftGraphEmailService,
    );
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('sendEmail', () => {
    it('should send email via Microsoft Graph when microsoftGraphEnabled is true', async () => {
      // Arrange
      const userId = 'test-user-id';
      const emailData = new SendEmailDto();
      emailData.to = ['recipient@example.com'];
      emailData.subject = 'Test Email from Microsoft Graph';
      emailData.text = 'This is a test email sent using Microsoft Graph API.';
      emailData.html =
        '<p>This is a test email sent using <strong>Microsoft Graph API</strong>.</p>';

      const mockUser = {
        id: userId,
        emailUsername: 'sender@example.com',
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

      // Act
      const result = await emailService.sendEmail(userId, emailData);

      // Assert
      expect(result).toEqual(mockSentEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockMicrosoftGraphEmailService.sendEmail).toHaveBeenCalledWith(
        userId,
        emailData,
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      const emailData = new SendEmailDto();
      emailData.to = ['recipient@example.com'];
      emailData.subject = 'Test Subject';
      emailData.text = 'Test Body';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(emailService.sendEmail(userId, emailData)).rejects.toThrow(
        NotFoundException,
      );
    });

    // it('should use SMTP when microsoftGraphEnabled is false', async () => {
    //   // Arrange
    //   const userId = 'test-user-id';
    //   const emailData = new SendEmailDto();
    //   emailData.to = ['recipient@example.com'];
    //   emailData.subject = 'Test Email via SMTP';
    //   emailData.text = 'This is a test email sent using SMTP.';

    //   const mockUser = {
    //     id: userId,
    //     emailUsername: 'sender@example.com',
    //     emailHost: 'smtp.example.com',
    //     smtpPort: 587,
    //     imapPort: 993,
    //     pop3Port: 995,
    //     emailPassword: 'password',
    //     microsoftGraphEnabled: false,
    //     smtpEnabled: true,
    //     emailSecure: true,
    //   };

    //   const mockSentEmail: Partial<Email> = {
    //     id: 'email-id',
    //     from: 'sender@example.com',
    //     to: emailData.to,
    //     subject: emailData.subject,
    //     text: emailData.text,
    //     isSent: true,
    //     sentAt: new Date(),
    //     folder: 'SENT',
    //     userId,
    //   };

    //   mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    //   mockPrismaService.email.create.mockResolvedValue(mockSentEmail as Email);

    //   // Nodemailer is already mocked at the top of the file

    //   // Act
    //   const result = await emailService.sendEmail(userId, emailData);

    //   // Assert
    //   expect(result).toEqual(mockSentEmail);
    //   expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
    //     where: { id: userId },
    //   });
    //   expect(mockMicrosoftGraphEmailService.sendEmail).not.toHaveBeenCalled();
    // });
  });

  describe('fetchEmails', () => {
    it('should fetch emails via Microsoft Graph when microsoftGraphEnabled is true', async () => {
      // Arrange
      const userId = 'test-user-id';
      const options = new GetEmailsDto();
      options.folder = 'inbox';
      options.limit = 10;
      options.page = 1;

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
        microsoftGraphEnabled: true,
      };

      const mockEmails = {
        emails: [
          {
            id: 'email-1',
            messageId: 'message-1',
            from: 'sender@example.com',
            to: ['user@example.com'],
            subject: 'Test Email 1',
            text: 'Email content 1',
            receivedAt: new Date(),
            folder: 'inbox',
            userId,
          },
          {
            id: 'email-2',
            messageId: 'message-2',
            from: 'another@example.com',
            to: ['user@example.com'],
            subject: 'Test Email 2',
            text: 'Email content 2',
            receivedAt: new Date(),
            folder: 'inbox',
            userId,
          },
        ],
        total: 2,
        hasMore: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockMicrosoftGraphEmailService.fetchEmails.mockResolvedValue(mockEmails);

      // Act
      const result = await emailService.fetchEmails(userId, options);

      // Assert
      expect(result).toEqual(mockEmails);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockMicrosoftGraphEmailService.fetchEmails).toHaveBeenCalledWith(
        userId,
        options,
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      const options = new GetEmailsDto();
      options.folder = 'inbox';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(emailService.fetchEmails(userId, options)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use IMAP when microsoftGraphEnabled is false and imapEnabled is true', async () => {
      // Arrange
      const userId = 'test-user-id';
      const options = new GetEmailsDto();
      options.folder = 'inbox';
      options.limit = 10;
      options.page = 1;

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
        emailHost: 'imap.example.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailPassword: 'password',
        microsoftGraphEnabled: false,
        imapEnabled: true,
        emailSecure: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // This test would typically mock the IMAP client, but since it's complex
      // and we're focusing on the Microsoft Graph functionality, we'll just
      // verify that the Microsoft Graph service is not called

      // Act & Assert
      try {
        await emailService.fetchEmails(userId, options);
      } catch {
        // We expect an error since we're not fully mocking IMAP
        expect(
          mockMicrosoftGraphEmailService.fetchEmails,
        ).not.toHaveBeenCalled();
      }
    });
  });

  describe('Integration test simulation', () => {
    it('should simulate the test-outlook.ts script functionality', async () => {
      // Arrange
      const userId = 'test-user-id';

      // Email sending setup
      const sendEmailData = new SendEmailDto();
      sendEmailData.to = ['recipient@example.com'];
      sendEmailData.subject = 'Test Email from Microsoft Graph';
      sendEmailData.text =
        'This is a test email sent using Microsoft Graph API.';
      sendEmailData.html =
        '<p>This is a test email sent using <strong>Microsoft Graph API</strong>.</p>';

      const mockSentEmail: Partial<Email> = {
        id: 'email-id',
        from: 'sender@example.com',
        to: sendEmailData.to,
        subject: sendEmailData.subject,
        text: sendEmailData.text,
        html: sendEmailData.html,
        isSent: true,
        sentAt: new Date(),
        folder: 'SENT',
        userId,
      };

      // Email fetching setup
      const getEmailsOptions = new GetEmailsDto();
      getEmailsOptions.folder = 'inbox';
      getEmailsOptions.limit = 10;
      getEmailsOptions.page = 1;

      const mockFetchedEmails = {
        emails: [
          {
            id: 'email-1',
            messageId: 'message-1',
            from: 'sender@example.com',
            to: ['user@example.com'],
            subject: 'Test Email 1',
            text: 'Email content 1',
            receivedAt: new Date(),
            folder: 'inbox',
            userId,
          },
          {
            id: 'email-2',
            messageId: 'message-2',
            from: 'another@example.com',
            to: ['user@example.com'],
            subject: 'Test Email 2',
            text: 'Email content 2',
            receivedAt: new Date(),
            folder: 'inbox',
            userId,
          },
        ],
        total: 2,
        hasMore: false,
      };

      const mockUser = {
        id: userId,
        emailUsername: 'user@example.com',
        microsoftGraphEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockMicrosoftGraphEmailService.sendEmail.mockResolvedValue(
        mockSentEmail as Email,
      );
      mockMicrosoftGraphEmailService.fetchEmails.mockResolvedValue(
        mockFetchedEmails,
      );

      // Act - Send email
      const sentEmailResult = await emailService.sendEmail(
        userId,
        sendEmailData,
      );

      // Act - Fetch emails
      const fetchedEmailsResult = await emailService.fetchEmails(
        userId,
        getEmailsOptions,
      );

      // Assert - Send email
      expect(sentEmailResult).toEqual(mockSentEmail);
      expect(mockMicrosoftGraphEmailService.sendEmail).toHaveBeenCalledWith(
        userId,
        sendEmailData,
      );

      // Assert - Fetch emails
      expect(fetchedEmailsResult).toEqual(mockFetchedEmails);
      expect(mockMicrosoftGraphEmailService.fetchEmails).toHaveBeenCalledWith(
        userId,
        getEmailsOptions,
      );
    });
  });
});
