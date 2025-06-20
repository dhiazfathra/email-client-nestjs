import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetEmailsDto } from './dto/get-emails.dto';
import { EmailService } from './email.service';

// Mock external modules
jest.mock('nodemailer');
jest.mock('imap');
jest.mock('poplib');
jest.mock('mailparser');

describe('EmailService - POP3 Tests', () => {
  let service: EmailService;
  let _prismaService: PrismaService;

  // Create mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    email: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('fetchEmailsPOP3', () => {
    it('should successfully fetch emails using POP3 with pagination', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.email.create.mockResolvedValue({} as Email);

      // Mock POP3Client
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(true, { count: 3, octets: 300 }), 10);
          } else if (event === 'retr') {
            // Will be handled by retr method
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        retr: jest.fn((msgNumber) => {
          setTimeout(() => {
            // Call the retr event handler with message data
            const handlers = mockClientInstance.on.mock.calls.filter(
              (call) => call[0] === 'retr',
            );
            if (handlers.length > 0) {
              handlers[0][1](true, msgNumber, [
                'From: sender@example.com',
                'To: recipient@example.com',
                'Subject: Test Email ' + msgNumber,
                '',
                'Email content ' + msgNumber,
              ]);
            }

            // If this is the last message, call quit
            if (msgNumber >= 3) {
              mockClientInstance.quit();
            }
          }, 10);
          return mockClientInstance;
        }),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      // Mock mailparser
      const mailparser = jest.requireMock('mailparser');
      mailparser.simpleParser = jest
        .fn()
        .mockImplementation((data, callback) => {
          callback(null, {
            messageId: `message-${Math.floor(Math.random() * 1000)}`,
            from: { text: 'sender@example.com' },
            to: { text: 'recipient@example.com' },
            cc: { text: 'cc@example.com' },
            bcc: { text: 'bcc@example.com' },
            subject: 'Test Email',
            text: 'Email content',
            html: '<p>Email content</p>',
            date: new Date(),
          });
        });

      // Mock saveEmailsToDatabase
      jest.spyOn(service, 'saveEmailsToDatabase').mockResolvedValue();

      const result = await service.fetchEmailsPOP3(userId, options);

      expect(result).toEqual({
        emails: expect.any(Array),
        total: 3,
        hasMore: false,
      });
      expect(mockClientInstance.login).toHaveBeenCalledWith(
        mockUser.emailUsername,
        mockUser.emailPassword,
      );
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.retr).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
      expect(service.saveEmailsToDatabase).toHaveBeenCalled();
    });

    it('should handle empty mailbox', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock POP3Client for empty mailbox
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(true, { count: 0, octets: 0 }), 10);
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      const result = await service.fetchEmailsPOP3(userId, options);

      expect(result).toEqual({
        emails: [],
        total: 0,
        hasMore: false,
      });
      expect(mockClientInstance.login).toHaveBeenCalled();
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
    });

    it('should handle stat command failure', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock POP3Client with stat failure
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(false), 10);
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'POP3 stat command failed',
      );

      expect(mockClientInstance.login).toHaveBeenCalled();
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
    });

    it('should handle email parsing errors', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock POP3Client
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(true, { count: 1, octets: 100 }), 10);
          } else if (event === 'retr') {
            // Will be handled by retr method
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        retr: jest.fn((msgNumber) => {
          setTimeout(() => {
            // Call the retr event handler with message data
            const handlers = mockClientInstance.on.mock.calls.filter(
              (call) => call[0] === 'retr',
            );
            if (handlers.length > 0) {
              handlers[0][1](true, msgNumber, ['Invalid email format']);
            }

            // Call quit after processing
            mockClientInstance.quit();
          }, 10);
          return mockClientInstance;
        }),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      // Mock mailparser with error
      const mailparser = jest.requireMock('mailparser');
      mailparser.simpleParser = jest
        .fn()
        .mockImplementation((data, callback) => {
          callback(new Error('Failed to parse email'), null);
        });

      // Mock saveEmailsToDatabase
      jest.spyOn(service, 'saveEmailsToDatabase').mockResolvedValue();

      const result = await service.fetchEmailsPOP3(userId, options);

      expect(result).toEqual({
        emails: [],
        total: 1,
        hasMore: false,
      });
      expect(mockClientInstance.login).toHaveBeenCalled();
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.retr).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
    });

    it('should handle retr command failure', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock POP3Client with retr failure
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(true, { count: 1, octets: 100 }), 10);
          } else if (event === 'retr') {
            // Will be handled by retr method
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        retr: jest.fn((msgNumber) => {
          setTimeout(() => {
            // Call the retr event handler with failure
            const handlers = mockClientInstance.on.mock.calls.filter(
              (call) => call[0] === 'retr',
            );
            if (handlers.length > 0) {
              handlers[0][1](false, msgNumber);
            }

            // Call quit after processing
            mockClientInstance.quit();
          }, 10);
          return mockClientInstance;
        }),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      // Mock saveEmailsToDatabase
      jest.spyOn(service, 'saveEmailsToDatabase').mockResolvedValue();

      const result = await service.fetchEmailsPOP3(userId, options);

      expect(result).toEqual({
        emails: [],
        total: 1,
        hasMore: false,
      });
      expect(mockClientInstance.login).toHaveBeenCalled();
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.retr).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
    });

    it('should handle saveEmailsToDatabase failure', async () => {
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
        imapEnabled: false,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock POP3Client
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 10);
          } else if (event === 'login') {
            setTimeout(() => callback(true), 10);
          } else if (event === 'stat') {
            setTimeout(() => callback(true, { count: 1, octets: 100 }), 10);
          } else if (event === 'retr') {
            // Will be handled by retr method
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        stat: jest.fn(),
        retr: jest.fn((msgNumber) => {
          setTimeout(() => {
            // Call the retr event handler with message data
            const handlers = mockClientInstance.on.mock.calls.filter(
              (call) => call[0] === 'retr',
            );
            if (handlers.length > 0) {
              handlers[0][1](true, msgNumber, [
                'From: sender@example.com',
                'Subject: Test Email',
                '',
                'Email content',
              ]);
            }

            // Call quit after processing
            mockClientInstance.quit();
          }, 10);
          return mockClientInstance;
        }),
        quit: jest.fn(),
      };

      POP3Client.mockImplementation(() => mockClientInstance);

      // Mock mailparser
      const mailparser = jest.requireMock('mailparser');
      mailparser.simpleParser = jest
        .fn()
        .mockImplementation((data, callback) => {
          callback(null, {
            messageId: 'message-1',
            from: { text: 'sender@example.com' },
            to: { text: 'recipient@example.com' },
            subject: 'Test Email',
            text: 'Email content',
            html: '<p>Email content</p>',
            date: new Date(),
          });
        });

      // Mock saveEmailsToDatabase with rejection
      jest
        .spyOn(service, 'saveEmailsToDatabase')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'Database error',
      );

      expect(mockClientInstance.login).toHaveBeenCalled();
      expect(mockClientInstance.stat).toHaveBeenCalled();
      expect(mockClientInstance.retr).toHaveBeenCalled();
      expect(mockClientInstance.quit).toHaveBeenCalled();
      expect(service.saveEmailsToDatabase).toHaveBeenCalled();
    });
  });
});
