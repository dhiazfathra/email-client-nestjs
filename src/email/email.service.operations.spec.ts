import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Email } from '@prisma/client';
import { MicrosoftGraphEmailService } from '../microsoft-graph/microsoft-graph-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

describe('EmailService - Operations', () => {
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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  // Create mock MicrosoftGraphEmailService
  const mockMicrosoftGraphEmailService = {
    sendEmail: jest.fn(),
    fetchEmails: jest.fn(),
    markEmailAsRead: jest.fn(),
    markEmailAsDeleted: jest.fn(),
    moveEmailToFolder: jest.fn(),
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
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('markEmailAsRead', () => {
    it('should mark email as read', async () => {
      const userId = 'user-id';
      const emailId = 'email-id';

      const mockEmail: Partial<Email> = {
        id: emailId,
        userId,
        subject: 'Test Email',
        isRead: false,
      };

      const updatedEmail = { ...mockEmail, isRead: true } as Email;

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);
      mockPrismaService.email.update.mockResolvedValue(updatedEmail);

      const result = await service.markEmailAsRead(userId, emailId);

      expect(result).toEqual(updatedEmail);
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'non-existent-email-id';

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

      const mockEmail: Partial<Email> = {
        id: emailId,
        userId,
        subject: 'Test Email',
        isDeleted: false,
      };

      const updatedEmail = { ...mockEmail, isDeleted: true } as Email;

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);
      mockPrismaService.email.update.mockResolvedValue(updatedEmail);

      const result = await service.markEmailAsDeleted(userId, emailId);

      expect(result).toEqual(updatedEmail);
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
      const emailId = 'non-existent-email-id';

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
        userId,
        subject: 'Test Email',
        folder: 'INBOX',
      };

      const updatedEmail = { ...mockEmail, folder } as Email;

      mockPrismaService.email.findFirst.mockResolvedValue(mockEmail as Email);
      mockPrismaService.email.update.mockResolvedValue(updatedEmail);

      const result = await service.moveEmailToFolder(userId, emailId, folder);

      expect(result).toEqual(updatedEmail);
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { folder },
      });
    });

    it('should throw NotFoundException when email is not found', async () => {
      const userId = 'user-id';
      const emailId = 'non-existent-email-id';
      const folder = 'ARCHIVE';

      mockPrismaService.email.findFirst.mockResolvedValue(null);

      await expect(
        service.moveEmailToFolder(userId, emailId, folder),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          userId,
        },
      });
      expect(prismaService.email.update).not.toHaveBeenCalled();
    });
  });

  describe('saveEmailsToDatabase', () => {
    it('should save new emails to database', async () => {
      const userId = 'user-id';
      const emails: Partial<Email>[] = [
        {
          messageId: 'message-1',
          from: 'sender1@example.com',
          to: ['recipient1@example.com'],
          subject: 'Test Email 1',
          text: 'Email content 1',
          html: '<p>Email content 1</p>',
          receivedAt: new Date(),
          folder: 'INBOX',
        },
        {
          messageId: 'message-2',
          from: 'sender2@example.com',
          to: ['recipient2@example.com'],
          subject: 'Test Email 2',
          text: 'Email content 2',
          html: '<p>Email content 2</p>',
          receivedAt: new Date(),
          folder: 'INBOX',
        },
      ];

      // Mock findFirst to return null (email doesn't exist)
      mockPrismaService.email.findFirst.mockResolvedValue(null);

      // Mock create to return the created email
      mockPrismaService.email.create.mockImplementation((data) =>
        Promise.resolve({ ...data.data, id: `generated-id-${Math.random()}` }),
      );

      await service.saveEmailsToDatabase(emails, userId);

      expect(prismaService.email.findFirst).toHaveBeenCalledTimes(2);
      expect(prismaService.email.create).toHaveBeenCalledTimes(2);

      // Verify first email creation
      expect(prismaService.email.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: emails[0].messageId,
          from: emails[0].from,
          to: emails[0].to,
          subject: emails[0].subject,
          text: emails[0].text,
          html: emails[0].html,
          folder: emails[0].folder,
          userId,
        }),
      });

      // Verify second email creation
      expect(prismaService.email.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: emails[1].messageId,
          from: emails[1].from,
          to: emails[1].to,
          subject: emails[1].subject,
          text: emails[1].text,
          html: emails[1].html,
          folder: emails[1].folder,
          userId,
        }),
      });
    });

    it('should skip emails that already exist in the database', async () => {
      const userId = 'user-id';
      const emails: Partial<Email>[] = [
        {
          messageId: 'existing-message',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Existing Email',
          text: 'Email content',
          html: '<p>Email content</p>',
          receivedAt: new Date(),
          folder: 'INBOX',
        },
      ];

      // Mock findFirst to return an existing email
      mockPrismaService.email.findFirst.mockResolvedValue({
        id: 'existing-id',
        ...emails[0],
        userId,
      } as Email);

      await service.saveEmailsToDatabase(emails, userId);

      expect(prismaService.email.findFirst).toHaveBeenCalledTimes(1);
      expect(prismaService.email.findFirst).toHaveBeenCalledWith({
        where: {
          messageId: emails[0].messageId,
          userId,
        },
      });
      expect(prismaService.email.create).not.toHaveBeenCalled();
    });

    it('should skip emails without messageId', async () => {
      const userId = 'user-id';
      const emails: Partial<Email>[] = [
        {
          // No messageId
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Email without messageId',
          text: 'Email content',
          html: '<p>Email content</p>',
          receivedAt: new Date(),
          folder: 'INBOX',
        },
      ];

      await service.saveEmailsToDatabase(emails, userId);

      expect(prismaService.email.findFirst).not.toHaveBeenCalled();
      expect(prismaService.email.create).not.toHaveBeenCalled();
    });
  });
});
