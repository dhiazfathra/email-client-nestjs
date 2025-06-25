/**
 * Tests for the private saveEmailsToDatabase method in MicrosoftGraphEmailService
 *
 * These tests should be added to the existing test file to improve coverage
 * for the private saveEmailsToDatabase method.
 */

describe('saveEmailsToDatabase (private method)', () => {
  it('should save emails to database successfully', async () => {
    const userId = 'user-id';
    const mockGraphEmails = [
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
      },
      {
        id: 'email-2',
        subject: 'Subject 2',
        bodyPreview: 'Body preview 2',
        from: { emailAddress: { address: 'sender2@example.com' } },
        toRecipients: [{ emailAddress: { address: 'recipient2@example.com' } }],
        ccRecipients: [{ emailAddress: { address: 'cc@example.com' } }],
        bccRecipients: [{ emailAddress: { address: 'bcc@example.com' } }],
        receivedDateTime: '2023-01-02T12:00:00Z',
        hasAttachments: true,
        isRead: true,
      },
    ];

    const savedEmails = [
      {
        id: 'db-email-1',
        messageId: 'email-1',
        from: 'sender1@example.com',
        to: ['recipient1@example.com'],
        cc: [],
        bcc: [],
        subject: 'Subject 1',
        text: 'Body preview 1',
        receivedAt: new Date('2023-01-01T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: false,
      },
      {
        id: 'db-email-2',
        messageId: 'email-2',
        from: 'sender2@example.com',
        to: ['recipient2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Subject 2',
        text: 'Body preview 2',
        receivedAt: new Date('2023-01-02T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: true,
      },
    ];

    mockPrismaService.email.create.mockImplementation((data) => {
      if (data.data.messageId === 'email-1') {
        return Promise.resolve(savedEmails[0]);
      } else {
        return Promise.resolve(savedEmails[1]);
      }
    });

    // Call the private method directly using type casting
    const result = await (service as any).saveEmailsToDatabase(
      mockGraphEmails,
      userId,
      'inbox',
    );

    expect(result).toEqual(savedEmails);
    expect(mockPrismaService.email.create).toHaveBeenCalledTimes(2);

    // Verify first email creation
    expect(mockPrismaService.email.create).toHaveBeenCalledWith({
      data: {
        messageId: 'email-1',
        from: 'sender1@example.com',
        to: ['recipient1@example.com'],
        cc: [],
        bcc: [],
        subject: 'Subject 1',
        text: 'Body preview 1',
        receivedAt: new Date('2023-01-01T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: false,
      },
    });

    // Verify second email creation
    expect(mockPrismaService.email.create).toHaveBeenCalledWith({
      data: {
        messageId: 'email-2',
        from: 'sender2@example.com',
        to: ['recipient2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Subject 2',
        text: 'Body preview 2',
        receivedAt: new Date('2023-01-02T12:00:00Z'),
        folder: 'inbox',
        userId,
        isRead: true,
      },
    });
  });

  it('should handle empty email arrays', async () => {
    const userId = 'user-id';
    const mockGraphEmails = [];

    // Call the private method directly using type casting
    const result = await (service as any).saveEmailsToDatabase(
      mockGraphEmails,
      userId,
      'inbox',
    );

    expect(result).toEqual([]);
    expect(mockPrismaService.email.create).not.toHaveBeenCalled();
  });

  it('should handle database errors when saving emails', async () => {
    const userId = 'user-id';
    const mockGraphEmails = [
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
      },
    ];

    mockPrismaService.email.create.mockRejectedValue(
      new Error('Database error'),
    );

    // We expect the method to log the error but still continue without throwing
    const result = await (service as any).saveEmailsToDatabase(
      mockGraphEmails,
      userId,
      'inbox',
    );

    // The method should return an empty array if all saves fail
    expect(result).toEqual([]);
    expect(mockPrismaService.email.create).toHaveBeenCalledTimes(1);
  });
});
