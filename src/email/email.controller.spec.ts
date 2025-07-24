import { Test, TestingModule } from '@nestjs/testing';
import { Email, Role } from '@prisma/client';
import { EmailConfigDto } from './dto/email-config.dto';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;
  let emailService: EmailService;

  const mockEmailService = {
    getUserEmailConfig: jest.fn(),
    updateUserEmailConfig: jest.fn(),
    sendEmail: jest.fn(),
    fetchEmails: jest.fn(),
    fetchEmailsIMAP: jest.fn(),
    fetchEmailsPOP3: jest.fn(),
    getEmailsFromDatabase: jest.fn(),
    markEmailAsRead: jest.fn(),
    markEmailAsDeleted: jest.fn(),
    moveEmailToFolder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEmailConfig', () => {
    it('should return user email configuration', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const mockConfig: EmailConfigDto = {
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
        getEmailPassword: function () {
          return this.emailPassword;
        },
      };

      mockEmailService.getUserEmailConfig.mockResolvedValue(mockConfig);

      const result = await controller.getEmailConfig(mockUser);

      expect(result).toEqual(mockConfig);
      expect(emailService.getUserEmailConfig).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateEmailConfig', () => {
    it('should update and return user email configuration', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const emailConfig: EmailConfigDto = {
        emailHost: 'smtp.updated.com',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailUsername: 'updated@example.com',
        emailPassword: 'newpassword',
        emailSecure: true,
        imapEnabled: true,
        smtpEnabled: true,
        pop3Enabled: true,
        getEmailPassword: function () {
          return this.emailPassword;
        },
      };

      mockEmailService.updateUserEmailConfig.mockResolvedValue(emailConfig);

      const result = await controller.updateEmailConfig(mockUser, emailConfig);

      expect(result).toEqual(emailConfig);
      expect(emailService.updateUserEmailConfig).toHaveBeenCalledWith(
        mockUser.id,
        emailConfig,
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email and return result', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const emailData: SendEmailDto = {
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
        html: '<p>Test HTML Body</p>',
      };

      const mockSentEmail: Partial<Email> = {
        id: 'email-id',
        from: 'test@example.com',
        to: emailData.to,
        subject: emailData.subject,
      };

      mockEmailService.sendEmail.mockResolvedValue(mockSentEmail);

      const result = await controller.sendEmail(mockUser, emailData);

      expect(result).toEqual(mockSentEmail);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        mockUser.id,
        emailData,
      );
    });
  });

  describe('fetchEmailsIMAP', () => {
    it('should fetch emails using IMAP', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        emails: [{ id: 'email-1', subject: 'Test Email' }],
        total: 1,
        hasMore: false,
      };

      mockEmailService.fetchEmails.mockResolvedValue(mockResponse);

      const result = await controller.fetchEmailsIMAP(mockUser, options);

      expect(result).toEqual(mockResponse);
      expect(emailService.fetchEmails).toHaveBeenCalledWith(
        mockUser.id,
        options,
      );
    });
  });

  describe('fetchEmailsPOP3', () => {
    it('should fetch emails using POP3', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        emails: [{ id: 'email-1', subject: 'Test Email' }],
        total: 1,
        hasMore: false,
      };

      mockEmailService.fetchEmails.mockResolvedValue(mockResponse);

      const result = await controller.fetchEmailsPOP3(mockUser, options);

      expect(result).toEqual(mockResponse);
      expect(emailService.fetchEmails).toHaveBeenCalledWith(
        mockUser.id,
        options,
      );
    });
  });

  describe('getEmails', () => {
    it('should get emails from database', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const options: GetEmailsDto = {
        folder: 'INBOX',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        emails: [{ id: 'email-1', subject: 'Test Email' }],
        total: 1,
        hasMore: false,
      };

      mockEmailService.getEmailsFromDatabase.mockResolvedValue(mockResponse);

      const result = await controller.getEmails(mockUser, options);

      expect(result).toEqual(mockResponse);
      expect(emailService.getEmailsFromDatabase).toHaveBeenCalledWith(
        mockUser.id,
        options,
      );
    });
  });

  describe('markEmailAsRead', () => {
    it('should mark email as read', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const emailId = 'email-id';
      const mockEmail = { id: emailId, isRead: true };

      mockEmailService.markEmailAsRead.mockResolvedValue(mockEmail);

      const result = await controller.markEmailAsRead(mockUser, emailId);

      expect(result).toEqual(mockEmail);
      expect(emailService.markEmailAsRead).toHaveBeenCalledWith(
        mockUser.id,
        emailId,
      );
    });
  });

  describe('markEmailAsDeleted', () => {
    it('should mark email as deleted', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const emailId = 'email-id';
      const mockEmail = { id: emailId, isDeleted: true, folder: 'TRASH' };

      mockEmailService.markEmailAsDeleted.mockResolvedValue(mockEmail);

      const result = await controller.markEmailAsDeleted(mockUser, emailId);

      expect(result).toEqual(mockEmail);
      expect(emailService.markEmailAsDeleted).toHaveBeenCalledWith(
        mockUser.id,
        emailId,
      );
    });
  });

  describe('moveEmailToFolder', () => {
    it('should move email to folder', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        roles: [],
      };
      const emailId = 'email-id';
      const folder = 'ARCHIVE';
      const mockEmail = { id: emailId, folder };

      mockEmailService.moveEmailToFolder.mockResolvedValue(mockEmail);

      const result = await controller.moveEmailToFolder(
        mockUser,
        emailId,
        folder,
      );

      expect(result).toEqual(mockEmail);
      expect(emailService.moveEmailToFolder).toHaveBeenCalledWith(
        mockUser.id,
        emailId,
        folder,
      );
    });
  });
});
