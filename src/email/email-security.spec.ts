import { Test, TestingModule } from '@nestjs/testing';
import { instanceToPlain } from 'class-transformer';
import { EncryptionService } from '../encryption/encryption.service';
import { MicrosoftGraphEmailService } from '../microsoft-graph/microsoft-graph-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailConfigDto } from './dto/email-config.dto';
import { EmailService } from './email.service';

describe('Email Security Tests', () => {
  let emailService: EmailService;
  let _prismaService: PrismaService; // Prefixed with underscore to indicate it's used indirectly
  let _encryptionService: EncryptionService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailHost: 'smtp.example.com',
    emailUsername: 'test@example.com',
    emailPassword: 'securePassword123',
    imapPort: 993,
    pop3Port: 995,
    smtpPort: 587,
    emailSecure: true,
    imapEnabled: true,
    pop3Enabled: false,
    smtpEnabled: true,
  };

  beforeEach(async () => {
    const mockMicrosoftGraphEmailService = {
      getEmails: jest.fn(),
      getEmailDetails: jest.fn(),
      saveEmailsToDatabase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockImplementation((args) => {
                return {
                  ...mockUser,
                  ...args.data,
                };
              }),
            },
          },
        },
        {
          provide: MicrosoftGraphEmailService,
          useValue: mockMicrosoftGraphEmailService,
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest
              .fn()
              .mockImplementation((value) => `encrypted:${value}`),
            decrypt: jest.fn().mockImplementation((value) => {
              if (value.startsWith('encrypted:')) {
                return value.substring(10);
              }
              return value;
            }),
          },
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('Email Password Security', () => {
    it('should exclude emailPassword from serialized response', async () => {
      // Get the email config
      const config = await emailService.getUserEmailConfig(mockUser.id);

      // Convert to plain object (simulates API response serialization)
      const serialized = instanceToPlain(config);

      // Password should exist in the DTO but not in serialized response
      expect(config.emailPassword).toBeDefined();
      expect(serialized.emailPassword).toBeUndefined();
    });

    it('should allow access to password via getter method', async () => {
      const config = await emailService.getUserEmailConfig(mockUser.id);

      // Password should be accessible via getter
      expect(config.getEmailPassword()).toBe(mockUser.emailPassword);
    });

    it('should keep password secure when updating config', async () => {
      // Create config with new password
      const newConfig = new EmailConfigDto();
      newConfig.emailHost = mockUser.emailHost;
      newConfig.emailUsername = mockUser.emailUsername;
      newConfig.emailPassword = 'newSecurePassword';
      newConfig.imapPort = mockUser.imapPort;
      newConfig.pop3Port = mockUser.pop3Port;
      newConfig.smtpPort = mockUser.smtpPort;
      newConfig.emailSecure = mockUser.emailSecure;
      newConfig.imapEnabled = mockUser.imapEnabled;
      newConfig.pop3Enabled = mockUser.pop3Enabled;
      newConfig.smtpEnabled = mockUser.smtpEnabled;

      // Update the config
      const updatedConfig = await emailService.updateUserEmailConfig(
        mockUser.id,
        newConfig,
      );

      // Verify the updated config has the password but it's not exposed in serialization
      expect(updatedConfig.getEmailPassword()).toBe('newSecurePassword');
      const serialized = instanceToPlain(updatedConfig);
      expect(serialized.emailPassword).toBeUndefined();
    });
  });
});
