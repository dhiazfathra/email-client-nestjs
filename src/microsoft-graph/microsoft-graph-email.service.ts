import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Email } from '@prisma/client';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';

@Injectable()
export class MicrosoftGraphEmailService {
  private readonly logger = new Logger(MicrosoftGraphEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly graphAuthService: MicrosoftGraphAuthService,
  ) {}

  /**
   * Send email using Microsoft Graph API
   */
  async sendEmail(userId: string, emailData: SendEmailDto): Promise<Email> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      // Get authenticated Microsoft Graph client
      const graphClient = await this.graphAuthService.getAuthenticatedClient();

      // Prepare email message
      const message = {
        message: {
          subject: emailData.subject,
          body: {
            contentType: 'HTML',
            content: emailData.html || emailData.text,
          },
          toRecipients: emailData.to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients:
            emailData.cc?.map((email) => ({
              emailAddress: { address: email },
            })) || [],
          bccRecipients:
            emailData.bcc?.map((email) => ({
              emailAddress: { address: email },
            })) || [],
        },
        saveToSentItems: true,
      };

      // Send email using Microsoft Graph API
      await graphClient.api('/me/sendMail').post(message);

      // Save the sent email to the database
      const sentEmail = await this.prisma.email.create({
        data: {
          from: user.emailUsername,
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
          isSent: true,
          sentAt: new Date(),
          folder: 'SENT',
          userId: userId,
        },
      });

      return sentEmail;
    } catch (error) {
      this.logger.error(
        `Failed to send email via Microsoft Graph: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to send email via Microsoft Graph: ${error.message}`,
      );
    }
  }

  /**
   * Validate user configuration for Microsoft Graph
   */
  async validateUserConfig(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (!user.microsoftGraphEnabled) {
      throw new BadRequestException(
        'Microsoft Graph is not enabled for this user',
      );
    }

    // Test authentication by getting a client
    try {
      await this.graphAuthService.getAuthenticatedClient();
    } catch (error) {
      this.logger.error(
        `Microsoft Graph authentication failed: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Microsoft Graph authentication failed');
    }
  }

  /**
   * Get mail folders from Microsoft Graph API
   */
  async getMailFolders(_userId: string): Promise<
    {
      id: string;
      displayName: string;
      totalItemCount: number;
      unreadItemCount: number;
    }[]
  > {
    const client = await this.graphAuthService.getAuthenticatedClient();

    try {
      const response = await client
        .api('/me/mailFolders')
        .select('id,displayName,totalItemCount,unreadItemCount')
        .get();

      return response.value;
    } catch (error) {
      this.logger.error(
        `Failed to get mail folders: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get mail folders: ${error.message}`);
    }
  }

  /**
   * Get a specific email by ID
   */
  async getEmailById(userId: string, emailId: string): Promise<Email> {
    // First check if we have this email in our database
    const existingEmail = await this.prisma.email.findFirst({
      where: {
        userId: userId,
        messageId: emailId,
      },
    });

    if (existingEmail) {
      return existingEmail;
    }

    // If not found in database, fetch from Microsoft Graph
    const client = await this.graphAuthService.getAuthenticatedClient();

    try {
      const response = await client
        .api(`/me/messages/${emailId}`)
        .select(
          'id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments',
        )
        .get();

      // Convert to our Email model format
      const emails = await this.saveEmailsToDatabase([response], userId);
      return emails[0];
    } catch (error) {
      this.logger.error(
        `Failed to get email by ID: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException(`Email with ID ${emailId} not found`);
    }
  }

  /**
   * Fetch emails using Microsoft Graph API with pagination
   */
  async fetchEmails(
    userId: string,
    options: GetEmailsDto,
  ): Promise<{ emails: Email[]; total: number; hasMore: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const folder = options.folder || 'inbox';
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      // Get authenticated Microsoft Graph client
      const graphClient = await this.graphAuthService.getAuthenticatedClient();

      // Count total emails in the folder
      const countResponse = await graphClient
        .api(`/me/mailFolders/${folder}/messages/$count`)
        .header('ConsistencyLevel', 'eventual')
        .get();

      const total = parseInt(countResponse, 10);

      // Fetch emails with pagination
      const response = await graphClient
        .api(`/me/mailFolders/${folder}/messages`)
        .select(
          'id,subject,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,hasAttachments,isRead,isDraft',
        )
        .top(limit)
        .skip(skip)
        .orderby('receivedDateTime DESC')
        .get();

      const fetchedEmails = response.value || [];

      // Transform Microsoft Graph emails to our Email model
      const emails: Partial<Email>[] = fetchedEmails.map((email) => ({
        messageId: email.id,
        from: email.from?.emailAddress?.address || '',
        to: email.toRecipients?.map((r) => r.emailAddress.address) || [],
        cc: email.ccRecipients?.map((r) => r.emailAddress.address) || [],
        bcc: email.bccRecipients?.map((r) => r.emailAddress.address) || [],
        subject: email.subject || null,
        text: email.bodyPreview || null,
        receivedAt: email.receivedDateTime
          ? new Date(email.receivedDateTime)
          : null,
        folder: folder,
        userId: userId,
        isRead: email.isRead || false,
        isDraft: email.isDraft || false,
        isFlagged: false,
        isDeleted: false,
        isSpam: folder.toLowerCase() === 'junk' || false,
        isSent: folder.toLowerCase() === 'sentitems' || false,
        attachments: email.hasAttachments ? [] : null,
      }));

      // Save fetched emails to database
      await this.saveEmailsToDatabase(emails, userId);

      // Fetch the saved emails from the database to return with proper IDs
      const savedEmails = await this.prisma.email.findMany({
        where: {
          userId,
          folder,
          messageId: {
            in: emails.filter((e) => e.messageId).map((e) => e.messageId),
          },
        },
        orderBy: { receivedAt: 'desc' },
        take: limit,
      });

      return {
        emails: savedEmails,
        total,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch emails via Microsoft Graph: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to fetch emails via Microsoft Graph: ${error.message}`,
      );
    }
  }

  /**
   * Get email details including full body content
   */
  async getEmailDetails(userId: string, messageId: string): Promise<Email> {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      // Get authenticated Microsoft Graph client
      const graphClient = await this.graphAuthService.getAuthenticatedClient();

      // Fetch email details
      const email = await graphClient
        .api(`/me/messages/${messageId}`)
        .select(
          'id,subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,hasAttachments,isRead,isDraft',
        )
        .get();

      if (!email) {
        throw new NotFoundException(`Email with id ${messageId} not found`);
      }

      // Find existing email with messageId and userId
      const existingDbEmail = await this.prisma.email.findFirst({
        where: {
          messageId: email.id,
          userId,
        },
      });

      // Update or create email in database
      const updatedEmail = existingDbEmail
        ? await this.prisma.email.update({
            where: { id: existingDbEmail.id },
            data: {
              html: email.body.content,
              isRead: true,
            },
          })
        : await this.prisma.email.create({
            data: {
              messageId: email.id,
              from: email.from?.emailAddress?.address || '',
              to: email.toRecipients?.map((r) => r.emailAddress.address) || [],
              cc: email.ccRecipients?.map((r) => r.emailAddress.address) || [],
              bcc:
                email.bccRecipients?.map((r) => r.emailAddress.address) || [],
              subject: email.subject || null,
              text: email.bodyPreview || null,
              html: email.body.content,
              receivedAt: email.receivedDateTime
                ? new Date(email.receivedDateTime)
                : null,
              folder: 'inbox',
              userId: userId,
              isRead: true,
              isDraft: email.isDraft || false,
              isFlagged: false,
              isDeleted: false,
              isSpam: false,
              isSent: false,
              attachments: email.hasAttachments ? [] : null,
            },
          });

      return updatedEmail;
    } catch (error) {
      this.logger.error(
        `Failed to get email details: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get email details: ${error.message}`);
    }
  }

  /**
   * Save fetched emails to database
   */
  private async saveEmailsToDatabase(
    emails: Partial<Email>[],
    userId: string,
  ): Promise<void> {
    try {
      // Build an array of Prisma operations without executing them immediately
      const operations = [];

      for (const email of emails) {
        if (!email.messageId) {
          // Handle emails without messageId - create them directly
          operations.push(
            this.prisma.email.create({
              data: {
                from: email.from,
                to: email.to,
                cc: email.cc || [],
                bcc: email.bcc || [],
                subject: email.subject,
                text: email.text,
                html: email.html,
                receivedAt: email.receivedAt,
                folder: email.folder,
                userId: userId,
                isRead: email.isRead || false,
                isFlagged: email.isFlagged || false,
                isDeleted: email.isDeleted || false,
                isSpam: email.isSpam || false,
                isDraft: email.isDraft || false,
                isSent: email.isSent || false,
                attachments: email.attachments,
              },
            }),
          );
          continue;
        }

        // For emails with messageId, first create a find operation
        operations.push(
          this.prisma.$transaction(async (tx) => {
            // Check if email exists
            const existingEmail = await tx.email.findFirst({
              where: {
                messageId: email.messageId,
                userId: userId,
              },
            });

            if (existingEmail) {
              // Update existing email
              return tx.email.update({
                where: { id: existingEmail.id },
                data: {
                  isRead: email.isRead,
                  isFlagged: email.isFlagged,
                  isDeleted: email.isDeleted,
                  isSpam: email.isSpam,
                },
              });
            } else {
              // Create new email
              return tx.email.create({
                data: {
                  messageId: email.messageId,
                  from: email.from,
                  to: email.to,
                  cc: email.cc || [],
                  bcc: email.bcc || [],
                  subject: email.subject,
                  text: email.text,
                  html: email.html,
                  receivedAt: email.receivedAt,
                  folder: email.folder,
                  userId: userId,
                  isRead: email.isRead || false,
                  isFlagged: email.isFlagged || false,
                  isDeleted: email.isDeleted || false,
                  isSpam: email.isSpam || false,
                  isDraft: email.isDraft || false,
                  isSent: email.isSent || false,
                  attachments: email.attachments,
                },
              });
            }
          }),
        );
      }

      // Execute all operations in parallel using Promise.all
      await Promise.all(operations);
    } catch (error) {
      this.logger.error(
        `Failed to save emails to database: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to save emails to database: ${error.message}`);
    }
  }
}
