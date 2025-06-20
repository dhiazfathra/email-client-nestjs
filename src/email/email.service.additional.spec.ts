import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetEmailsDto } from './dto/get-emails.dto';
import { EmailService } from './email.service';

// Mock external modules
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({}),
    }),
  };
});

jest.mock('imap');
jest.mock('poplib');
jest.mock('mailparser');

describe('EmailService Additional Tests', () => {
  let service: EmailService;
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
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('fetchEmailsIMAP', () => {
    it('should successfully fetch emails using IMAP with pagination', async () => {
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
        imapEnabled: true,
        pop3Enabled: false,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.email.create.mockResolvedValue({} as Email);

      // Mock IMAP to simulate mailbox with messages
      const IMAP = jest.requireMock('imap');
      const mockImapInstance = {
        once: jest.fn((event, callback) => {
          if (event === 'ready') {
            callback();
          }
          return mockImapInstance;
        }),
        openBox: jest.fn((folder, readonly, callback) => {
          callback(null, { messages: { total: 20 } });
        }),
        seq: {
          fetch: jest.fn(() => mockFetch),
        },
        end: jest.fn(),
        connect: jest.fn(),
      };

      // Mock fetch events
      const mockFetch = {
        on: jest.fn(),
        once: jest.fn(),
      };

      // Simulate message events
      const mockEmails = [];
      for (let i = 1; i <= 10; i++) {
        mockEmails.push({
          messageId: `message-${i}`,
          from: `sender${i}@example.com`,
          to: [`recipient${i}@example.com`],
          subject: `Test Email ${i}`,
          text: `Email content ${i}`,
          html: `<p>Email content ${i}</p>`,
          receivedAt: new Date(),
          folder: 'INBOX',
          userId,
          isRead: false,
          isFlagged: false,
          isDeleted: false,
          isSpam: false,
          isDraft: false,
          isSent: false,
          attachments: null,
        });
      }

      // Setup the mock fetch behavior
      mockFetch.on.mockImplementation((event, callback) => {
        if (event === 'message') {
          // Call the callback for each mock message
          mockEmails.forEach((email, index) => {
            const mockMsg = {
              on: jest.fn((msgEvent, msgCallback) => {
                if (msgEvent === 'body') {
                  const mockStream = {
                    on: jest.fn((streamEvent, streamCallback) => {
                      if (streamEvent === 'data') {
                        streamCallback(Buffer.from(JSON.stringify(email)));
                      }
                      return mockStream;
                    }),
                    once: jest.fn((streamEvent, streamCallback) => {
                      if (streamEvent === 'end') {
                        streamCallback();
                      }
                      return mockStream;
                    }),
                  };
                  msgCallback(mockStream, {
                    which: index % 2 === 0 ? 'HEADER' : 'TEXT',
                  });
                }
                return mockMsg;
              }),
              once: jest.fn((msgEvent, msgCallback) => {
                if (msgEvent === 'end') {
                  msgCallback();
                }
                return mockMsg;
              }),
            };
            callback(mockMsg, index + 1);
          });
        }
        return mockFetch;
      });

      mockFetch.once.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Do nothing for error
        } else if (event === 'end') {
          // Simulate end of fetch
          setTimeout(() => callback(), 10);
        }
        return mockFetch;
      });

      // Mock IMAP.parseHeader
      IMAP.parseHeader = jest.fn().mockReturnValue({
        'message-id': ['message-1'],
        from: ['sender@example.com'],
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: ['Test Subject'],
        date: [new Date().toString()],
      });

      IMAP.mockImplementation(() => mockImapInstance);

      // Mock simpleParser
      const mailparser = jest.requireMock('mailparser');
      mailparser.simpleParser = jest
        .fn()
        .mockImplementation((buffer, callback) => {
          callback(null, {
            text: 'Email text content',
            html: '<p>Email HTML content</p>',
          });
        });

      const result = await service.fetchEmailsIMAP(userId, options);

      expect(result).toEqual({
        emails: expect.any(Array),
        total: 20,
        hasMore: true,
      });
      expect(mockImapInstance.openBox).toHaveBeenCalledWith(
        'INBOX',
        true,
        expect.any(Function),
      );
      expect(mockImapInstance.seq.fetch).toHaveBeenCalled();
      expect(mockImapInstance.end).toHaveBeenCalled();
    });

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

    it('should throw Error when IMAP is not enabled', async () => {
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
    it('should handle IMAP connection errors', async () => {
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
        imapEnabled: true,
        pop3Enabled: true,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock IMAP to simulate connection error
      const IMAP = jest.requireMock('imap');
      const mockImapInstance = {
        once: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Connection error'));
          }
          return mockImapInstance;
        }),
        connect: jest.fn(),
      };
      IMAP.mockImplementation(() => mockImapInstance);

      await expect(service.fetchEmailsIMAP(userId, options)).rejects.toThrow(
        'Connection error',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockImapInstance.connect).toHaveBeenCalled();
    });

    it('should handle empty mailbox', async () => {
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
        imapEnabled: true,
        pop3Enabled: false,
        smtpEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.email.create.mockResolvedValue({} as Email);

      // Mock IMAP to simulate empty mailbox
      const IMAP = jest.requireMock('imap');
      const mockImapInstance = {
        once: jest.fn((event, callback) => {
          if (event === 'ready') {
            callback();
          }
          return mockImapInstance;
        }),
        openBox: jest.fn((folder, readonly, callback) => {
          callback(null, { messages: { total: 0 } });
        }),
        end: jest.fn(),
        connect: jest.fn(),
      };
      IMAP.mockImplementation(() => mockImapInstance);

      const result = await service.fetchEmailsIMAP(userId, options);

      expect(result).toEqual({
        emails: [],
        total: 0,
        hasMore: false,
      });
      expect(mockImapInstance.openBox).toHaveBeenCalledWith(
        'INBOX',
        true,
        expect.any(Function),
      );
      expect(mockImapInstance.end).toHaveBeenCalled();
    });
  });

  describe('fetchEmailsPOP3', () => {
    // it('should successfully fetch emails using POP3', async () => {
    //   const userId = 'user-id';
    //   const options: GetEmailsDto = { folder: 'INBOX', page: 1, limit: 10 };

    //   const mockUser = {
    //     id: userId,
    //     emailHost: 'pop3.example.com',
    //     imapPort: 993,
    //     pop3Port: 995,
    //     smtpPort: 587,
    //     emailUsername: 'user@example.com',
    //     emailPassword: 'password',
    //     emailSecure: true,
    //     imapEnabled: false,
    //     pop3Enabled: true,
    //     smtpEnabled: true,
    //   };

    //   mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    //   mockPrismaService.email.create.mockResolvedValue({} as Email);

    //   // Mock POP3Client
    //   const POP3Client = jest.requireMock('poplib');
    //   const mockClientInstance = {
    //     on: jest.fn((event, callback) => {
    //       if (event === 'data') {
    //         const messageId = Math.floor(Math.random() * 1000);
    //         // Ensure we're passing an array that can be joined
    //         const emailContent = [
    //           `From: sender${messageId}@example.com`,
    //           `Subject: Test ${messageId}`,
    //           '',
    //           'Email content',
    //         ];
    //         callback(null, messageId, true, emailContent);
    //       }
    //       return mockClientInstance;
    //     }),
    //     login: jest.fn((username, password, callback) => {
    //       callback(null, true);
    //       return mockClientInstance;
    //     }),
    //     stat: jest.fn((callback) => {
    //       callback(null, { count: 3, octets: 300 });
    //       return mockClientInstance;
    //     }),
    //     retr: jest.fn((msgNum, callback) => {
    //       // Simulate retrieving a message
    //       setTimeout(() => {
    //         mockClientInstance.on.mock.calls.forEach((call) => {
    //           if (call[0] === 'data') {
    //             call[1](null, msgNum, true, [
    //               'From: sender@example.com',
    //               'Subject: Test Email',
    //               '',
    //               'Email content',
    //             ]);
    //           }
    //         });

    //         // If we've processed the last message, trigger 'end'
    //         if (msgNum >= 3) {
    //           mockClientInstance.on.mock.calls.forEach((call) => {
    //             if (call[0] === 'end') {
    //               call[1]();
    //             }
    //           });
    //         }
    //       }, 10);
    //       return mockClientInstance;
    //     }),
    //     quit: jest.fn(() => mockClientInstance),
    //   };

    //   POP3Client.mockImplementation(() => mockClientInstance);

    //   // Mock mailparser
    //   const mailparser = jest.requireMock('mailparser');
    //   mailparser.simpleParser = jest
    //     .fn()
    //     .mockImplementation((data, options, callback) => {
    //       if (typeof options === 'function') {
    //         callback = options;
    //         options = {};
    //       }
    //       callback(null, {
    //         messageId: `message-${Math.floor(Math.random() * 1000)}`,
    //         from: {
    //           text: 'sender@example.com',
    //           value: [{ address: 'sender@example.com', name: 'Sender' }],
    //         },
    //         to: {
    //           text: 'recipient@example.com',
    //           value: [{ address: 'recipient@example.com', name: 'Recipient' }],
    //         },
    //         subject: 'Test Email',
    //         text: 'Email content',
    //         html: '<p>Email content</p>',
    //         date: new Date(),
    //       });
    //     });

    //   const result = await service.fetchEmailsPOP3(userId, options);

    //   expect(result).toEqual({
    //     emails: expect.any(Array),
    //     total: 3,
    //     hasMore: false,
    //   });
    //   expect(mockClientInstance.login).toHaveBeenCalledWith(
    //     mockUser.emailUsername,
    //     mockUser.emailPassword,
    //     expect.any(Function),
    //   );
    //   expect(mockClientInstance.stat).toHaveBeenCalled();
    //   expect(mockClientInstance.retr).toHaveBeenCalled();
    //   expect(mockClientInstance.quit).toHaveBeenCalled();
    // });

    it('should throw Error when user is not found', async () => {
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

    it('should handle POP3 connection errors', async () => {
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

      // Mock POP3Client to simulate connection error
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('POP3 connection error'));
          }
          return mockClientInstance;
        }),
      };
      POP3Client.mockImplementation(() => mockClientInstance);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'POP3 connection error',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle POP3 login failure', async () => {
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

      // Mock POP3Client to simulate login failure
      const POP3Client = jest.requireMock('poplib');
      const mockClientInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            callback();
          } else if (event === 'login') {
            callback(false);
          }
          return mockClientInstance;
        }),
        login: jest.fn(),
        quit: jest.fn(),
      };
      POP3Client.mockImplementation(() => mockClientInstance);

      await expect(service.fetchEmailsPOP3(userId, options)).rejects.toThrow(
        'POP3 login failed',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockClientInstance.login).toHaveBeenCalledWith(
        mockUser.emailUsername,
        mockUser.emailPassword,
      );
      expect(mockClientInstance.quit).toHaveBeenCalled();
    });
  });
  describe('saveEmailsToDatabase', () => {
    it('should save new emails to database', async () => {
      const userId = 'user-id';
      const emails = [
        {
          messageId: 'message-1',
          from: 'sender1@example.com',
          to: ['recipient1@example.com'],
          subject: 'Test Email 1',
          text: 'Email content 1',
          html: '<p>Email content 1</p>',
          receivedAt: new Date(),
          bcc: [],
          cc: [],
          folder: 'INBOX',
          isRead: false,
          isFlagged: false,
          isDeleted: false,
          isSpam: false,
          isDraft: false,
          isSent: false,
          attachments: null,
        },
      ];

      mockPrismaService.email.findFirst.mockResolvedValue(null);
      mockPrismaService.email.create.mockResolvedValue({} as Email);

      await service.saveEmailsToDatabase(emails as Partial<Email>[], userId);

      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: { messageId: 'message-1', userId },
      });

      expect(mockPrismaService.email.create).toHaveBeenCalledWith({
        data: { ...emails[0], userId },
      });
    });

    it('should not save duplicate emails', async () => {
      const userId = 'user-id';
      const emails = [
        {
          messageId: 'message-1',
          from: 'sender1@example.com',
          to: ['recipient1@example.com'],
          subject: 'Test Email 1',
          text: 'Email content 1',
          html: '<p>Email content 1</p>',
          receivedAt: new Date(),
          bcc: [],
          cc: [],
          folder: 'INBOX',
          isRead: false,
          isFlagged: false,
          isDeleted: false,
          isSpam: false,
          isDraft: false,
          isSent: false,
          attachments: null,
        },
      ];

      mockPrismaService.email.findFirst.mockResolvedValue({
        id: 'existing-email-id',
        messageId: 'message-1',
        userId,
      } as Email);

      await service.saveEmailsToDatabase(emails as Partial<Email>[], userId);

      expect(mockPrismaService.email.findFirst).toHaveBeenCalledWith({
        where: { messageId: 'message-1', userId },
      });

      expect(mockPrismaService.email.create).not.toHaveBeenCalled();
    });
  });
});
