/**
 * Additional tests for MicrosoftGraphEmailService
 *
 * This file contains additional test cases that should be added to the existing
 * microsoft-graph-email.service.spec.ts file to improve test coverage.
 */

// Add these tests after the existing getEmailById tests

describe('fetchEmails', () => {
  it('should fetch emails successfully with pagination', async () => {
    const userId = 'user-id';
    const options = { folder: 'inbox', page: 1, limit: 20 };
    const mockUser = { id: userId, emailUsername: 'user@example.com' };
    const mockTotalCount = '50';
    const mockEmails = [
      {
        id: 'email-1',
        subject: 'Subject 1',
        bodyPreview: 'Body preview 1',
        from: { emailAddress: { address: 'sender1@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient1@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-01T12:00:00Z',
        hasAttachments: false,
        isRead: false,
        isDraft: false,
      },
      {
        id: 'email-2',
        subject: 'Subject 2',
        bodyPreview: 'Body preview 2',
        from: { emailAddress: { address: 'sender2@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient2@example.com' } }],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: '2023-01-02T12:00:00Z',
        hasAttachments: true,
        isRead: true,
        isDraft: false,
      },
    ];

    const savedEmails = [
      {
        id: 'db-email-1',
        messageId: 'email-1',
        from: 'sender1@example.com',
        to: ['recipient1@example.com'],
        subject: 'Subject 1',
        text: 'Body preview 1',
        receivedAt: new Date('2023-01-01T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: false,
        isDraft: false,
      },
      {
        id: 'db-email-2',
        messageId: 'email-2',
        from: 'sender2@example.com',
        to: ['recipient2@example.com'],
        subject: 'Subject 2',
        text: 'Body preview 2',
        receivedAt: new Date('2023-01-02T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: true,
        isDraft: false,
      },
    ];

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

    // Mock the count response
    mockGraphClient.get.mockImplementation((path) => {
      if (path.includes('$count')) {
        return Promise.resolve(mockTotalCount);
      }
      return Promise.resolve({ value: mockEmails });
    });

    // Mock the saveEmailsToDatabase private method
    jest.spyOn(service as any, 'saveEmailsToDatabase').mockResolvedValue();

    mockPrismaService.email.findMany.mockResolvedValue(savedEmails);

    const result = await service.fetchEmails(userId, options);

    expect(result).toEqual({
      emails: savedEmails,
      total: 50,
      hasMore: true,
    });

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/me/mailFolders/inbox/messages/$count',
    );
    expect(mockGraphClient.header).toHaveBeenCalledWith(
      'ConsistencyLevel',
      'eventual',
    );
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/me/mailFolders/inbox/messages',
    );
    expect(mockGraphClient.select).toHaveBeenCalledWith(
      'id,subject,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,hasAttachments,isRead,isDraft',
    );
    expect(mockGraphClient.top).toHaveBeenCalledWith(20);
    expect(mockGraphClient.skip).toHaveBeenCalledWith(0);
    expect(mockGraphClient.orderby).toHaveBeenCalledWith(
      'receivedDateTime DESC',
    );
  });

  it('should throw NotFoundException when user is not found', async () => {
    const userId = 'non-existent-id';
    const options = { folder: 'inbox', page: 1, limit: 20 };

    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.fetchEmails(userId, options)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should handle errors when fetching emails fails', async () => {
    const userId = 'user-id';
    const options = { folder: 'inbox', page: 1, limit: 20 };
    const mockUser = { id: userId, emailUsername: 'user@example.com' };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockGraphClient.get.mockRejectedValue(new Error('API error'));

    await expect(service.fetchEmails(userId, options)).rejects.toThrow(
      'Failed to fetch emails via Microsoft Graph: API error',
    );
  });
});

describe('getEmailDetails', () => {
  it('should get email details successfully', async () => {
    const userId = 'user-id';
    const messageId = 'email-id';
    const mockUser = { id: userId, emailUsername: 'user@example.com' };
    const mockGraphEmail = {
      id: messageId,
      subject: 'Test Subject',
      body: { content: '<p>Email body content</p>' },
      bodyPreview: 'Email body preview',
      from: { emailAddress: { address: 'sender@example.com' } },
      toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
      ccRecipients: [],
      bccRecipients: [],
      receivedDateTime: '2023-01-01T12:00:00Z',
      hasAttachments: false,
      isRead: false,
      isDraft: false,
    };

    // Existing email in database
    const existingEmail = {
      id: 'db-email-id',
      messageId,
      from: 'sender@example.com',
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      text: 'Email body preview',
      html: null,
      receivedAt: new Date('2023-01-01T12:00:00Z'),
      folder: 'inbox',
      userId,
      isRead: false,
    };

    // Updated email after fetching details
    const updatedEmail = {
      ...existingEmail,
      html: '<p>Email body content</p>',
      isRead: true,
    };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.email.findFirst.mockResolvedValue(existingEmail);
    mockPrismaService.email.update.mockResolvedValue(updatedEmail);
    mockGraphClient.get.mockResolvedValue(mockGraphEmail);

    const result = await service.getEmailDetails(userId, messageId);

    expect(result).toEqual(updatedEmail);
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      `/me/messages/${messageId}`,
    );
    expect(mockGraphClient.select).toHaveBeenCalledWith(
      'id,subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,hasAttachments,isRead,isDraft',
    );
    expect(mockPrismaService.email.update).toHaveBeenCalledWith({
      where: { id: existingEmail.id },
      data: {
        html: mockGraphEmail.body.content,
        isRead: true,
      },
    });
  });

  it('should create new email if not found in database', async () => {
    const userId = 'user-id';
    const messageId = 'email-id';
    const mockUser = { id: userId, emailUsername: 'user@example.com' };
    const mockGraphEmail = {
      id: messageId,
      subject: 'Test Subject',
      body: { content: '<p>Email body content</p>' },
      bodyPreview: 'Email body preview',
      from: { emailAddress: { address: 'sender@example.com' } },
      toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
      ccRecipients: [],
      bccRecipients: [],
      receivedDateTime: '2023-01-01T12:00:00Z',
      hasAttachments: false,
      isRead: false,
      isDraft: false,
    };

    // New email created in database
    const newEmail = {
      id: 'db-email-id',
      messageId,
      from: 'sender@example.com',
      to: ['recipient@example.com'],
      cc: [],
      bcc: [],
      subject: 'Test Subject',
      text: 'Email body preview',
      html: '<p>Email body content</p>',
      receivedAt: new Date('2023-01-01T12:00:00Z'),
      folder: 'inbox',
      userId,
      isRead: true,
      isDraft: false,
      isFlagged: false,
      isDeleted: false,
      isSpam: false,
      isSent: false,
      attachments: null,
    };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.email.findFirst.mockResolvedValue(null);
    mockPrismaService.email.create.mockResolvedValue(newEmail);
    mockGraphClient.get.mockResolvedValue(mockGraphEmail);

    const result = await service.getEmailDetails(userId, messageId);

    expect(result).toEqual(newEmail);
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(mockGraphAuthService.getAuthenticatedClient).toHaveBeenCalled();
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      `/me/messages/${messageId}`,
    );
    expect(mockPrismaService.email.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        messageId,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        html: '<p>Email body content</p>',
        userId,
        isRead: true,
      }),
    });
  });

  it('should throw NotFoundException when user is not found', async () => {
    const userId = 'non-existent-id';
    const messageId = 'email-id';

    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.getEmailDetails(userId, messageId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should handle errors when getting email details fails', async () => {
    const userId = 'user-id';
    const messageId = 'email-id';
    const mockUser = { id: userId, emailUsername: 'user@example.com' };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockGraphClient.get.mockRejectedValue(new Error('API error'));

    await expect(service.getEmailDetails(userId, messageId)).rejects.toThrow(
      'Failed to get email details: API error',
    );
  });
});
