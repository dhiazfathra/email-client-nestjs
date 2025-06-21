import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MicrosoftGraphEmailService } from '../microsoft-graph/microsoft-graph-email.service';
import { PrismaService } from '../prisma/prisma.service';
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

describe('EmailService - sendEmail', () => {
  let service: EmailService;

  // Create mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    email: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockMicrosoftGraphEmailService = {
      getEmails: jest.fn(),
      getEmailDetails: jest.fn(),
      saveEmailsToDatabase: jest.fn(),
    };

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
  });

  it('should throw Error when email configuration is incomplete', async () => {
    const userId = 'user-id';
    const emailData: SendEmailDto = {
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      text: 'Test Content',
      html: '<p>Test HTML Content</p>',
    };

    // Mock user with incomplete email configuration (missing emailPassword)
    const mockUser = {
      id: userId,
      emailHost: 'smtp.example.com',
      imapPort: 993,
      pop3Port: 995,
      smtpPort: 587,
      emailUsername: 'user@example.com',
      emailPassword: null, // Missing password
      emailSecure: true,
      smtpEnabled: true,
    };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

    await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
      'Email configuration is incomplete',
    );

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
  });

  it('should throw NotFoundException when user is not found', async () => {
    const userId = 'user-id';
    const emailData: SendEmailDto = {
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      text: 'Test Content',
      html: '<p>Test HTML Content</p>',
    };

    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
  });

  it('should throw NotFoundException when SMTP is not enabled', async () => {
    const userId = 'user-id';
    const emailData: SendEmailDto = {
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      text: 'Test Content',
      html: '<p>Test HTML Content</p>',
    };

    const mockUser = {
      id: userId,
      emailHost: 'smtp.example.com',
      imapPort: 993,
      pop3Port: 995,
      smtpPort: 587,
      emailUsername: 'user@example.com',
      emailPassword: 'password',
      emailSecure: true,
      smtpEnabled: false, // SMTP not enabled
    };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

    await expect(service.sendEmail(userId, emailData)).rejects.toThrow(
      'SMTP not enabled',
    );

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
  });
});
