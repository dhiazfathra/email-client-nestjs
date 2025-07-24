import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Email } from '@prisma/client';
import DOMPurify from 'dompurify';
import * as IMAP from 'imap';
import { JSDOM } from 'jsdom';
import { simpleParser } from 'mailparser';
import * as nodemailer from 'nodemailer';
import * as POP3Client from 'poplib';
import { MicrosoftGraphEmailService } from '../microsoft-graph/microsoft-graph-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailConfigDto, EmailProviderType } from './dto/email-config.dto';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly microsoftGraphEmailService: MicrosoftGraphEmailService,
  ) {}

  /**
   * Get user's email configuration
   */
  async getUserEmailConfig(id: string): Promise<EmailConfigDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        emailHost: true,
        emailUsername: true,
        emailPassword: true,
        imapPort: true,
        pop3Port: true,
        smtpPort: true,
        emailSecure: true,
        imapEnabled: true,
        pop3Enabled: true,
        smtpEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return new EmailConfigDto({
      emailHost: user.emailHost,
      emailUsername: user.emailUsername,
      emailPassword: user.emailPassword,
      imapPort: user.imapPort,
      pop3Port: user.pop3Port,
      smtpPort: user.smtpPort,
      emailSecure: user.emailSecure,
      imapEnabled: user.imapEnabled,
      pop3Enabled: user.pop3Enabled,
      smtpEnabled: user.smtpEnabled,
    });
  }

  /**
   * Update user's email configuration
   */
  async updateUserEmailConfig(
    userId: string,
    emailConfig: EmailConfigDto,
  ): Promise<EmailConfigDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailHost: emailConfig.emailHost,
        imapPort: emailConfig.imapPort,
        pop3Port: emailConfig.pop3Port,
        smtpPort: emailConfig.smtpPort,
        emailUsername: emailConfig.emailUsername,
        emailPassword: emailConfig.emailPassword,
        emailSecure: emailConfig.emailSecure,
        imapEnabled: emailConfig.imapEnabled,
        smtpEnabled: emailConfig.smtpEnabled,
        pop3Enabled: emailConfig.pop3Enabled,
        microsoftGraphEnabled:
          emailConfig.providerType === EmailProviderType.MICROSOFT_GRAPH,
      },
    });

    return new EmailConfigDto({
      emailHost: updatedUser.emailHost,
      imapPort: updatedUser.imapPort,
      pop3Port: updatedUser.pop3Port,
      smtpPort: updatedUser.smtpPort,
      emailUsername: updatedUser.emailUsername,
      emailPassword: updatedUser.emailPassword,
      emailSecure: updatedUser.emailSecure,
      imapEnabled: updatedUser.imapEnabled,
      smtpEnabled: updatedUser.smtpEnabled,
      pop3Enabled: updatedUser.pop3Enabled,
      providerType: updatedUser.microsoftGraphEnabled
        ? EmailProviderType.MICROSOFT_GRAPH
        : EmailProviderType.STANDARD,
    });
  }

  /**
   * Send email using SMTP or Microsoft Graph API
   */
  async sendEmail(userId: string, emailData: SendEmailDto): Promise<Email> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Check if Microsoft Graph is enabled
    if (user.microsoftGraphEnabled) {
      this.logger.log('Using Microsoft Graph API to send email');
      return this.microsoftGraphEmailService.sendEmail(userId, emailData);
    }

    // Otherwise use standard SMTP
    if (!user.smtpEnabled) {
      throw new NotFoundException('SMTP not enabled');
    }

    if (
      !user.emailHost ||
      !user.imapPort ||
      !user.pop3Port ||
      !user.smtpPort ||
      !user.emailUsername ||
      !user.emailPassword
    ) {
      throw new Error('Email configuration is incomplete');
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: user.emailHost,
      port: user.smtpPort,
      secure: user.emailSecure ?? true,
      auth: {
        user: user.emailUsername,
        pass: user.emailPassword,
      },
    });

    const window = new JSDOM('').window;
    const purify = DOMPurify(window);

    // Send the email
    try {
      const mailOptions = {
        from: user.emailUsername,
        to: emailData.to.join(','),
        cc: emailData.cc?.join(','),
        bcc: emailData.bcc?.join(','),
        subject: emailData.subject,
        text: emailData.text,
        html: purify.sanitize(emailData.html),
      };

      await transporter.sendMail(mailOptions);

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
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Fetch emails using the appropriate method (IMAP or Microsoft Graph)
   */
  async fetchEmails(
    userId: string,
    options: GetEmailsDto,
  ): Promise<{ emails: Email[]; total: number; hasMore: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Check if Microsoft Graph is enabled
    if (user.microsoftGraphEnabled) {
      this.logger.log('Using Microsoft Graph API to fetch emails');
      return this.microsoftGraphEmailService.fetchEmails(userId, options);
    }

    // Otherwise use IMAP if enabled
    if (user.imapEnabled) {
      return this.fetchEmailsIMAP(userId, options);
    }

    // Fall back to POP3 if IMAP is not enabled
    if (user.pop3Enabled) {
      return this.fetchEmailsPOP3(userId, options);
    }

    throw new NotFoundException('No email retrieval method is enabled');
  }

  /**
   * Fetch emails using IMAP with pagination
   */
  private async fetchEmailsIMAP(
    userId: string,
    options: GetEmailsDto,
  ): Promise<{ emails: Email[]; total: number; hasMore: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // TODO: Consider to remove this check as there is not path to this branch
    if (!user || !user.imapEnabled) {
      throw new NotFoundException('User not found or IMAP not enabled');
    }

    if (
      !user.emailHost ||
      !user.imapPort ||
      !user.pop3Port ||
      !user.smtpPort ||
      !user.emailUsername ||
      !user.emailPassword
    ) {
      throw new Error('Email configuration is incomplete');
    }

    const folder = options.folder || 'INBOX';
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    try {
      // Connect to IMAP server
      const imapClient = new IMAP({
        user: user.emailUsername,
        password: user.emailPassword,
        host: user.emailHost,
        port: user.imapPort,
        tls: user.emailSecure ?? true,
        tlsOptions: { rejectUnauthorized: false },
      });

      // Promisify IMAP connection
      return new Promise((resolve, reject) => {
        const emails: Partial<Email>[] = [];
        let total = 0;

        imapClient.once('ready', () => {
          imapClient.openBox(folder, true, (err, box) => {
            if (err) {
              imapClient.end();
              return reject(err);
            }

            total = box.messages.total;

            // If there are no messages, return empty array
            if (total === 0) {
              imapClient.end();
              return resolve({ emails: [], total: 0, hasMore: false });
            }

            // Calculate start and end for pagination
            // IMAP uses 1-based indexing, and counts from the newest to the oldest
            const start = Math.max(1, total - skip - limit + 1);
            const end = Math.max(1, total - skip);

            const fetch = imapClient.seq.fetch(`${start}:${end}`, {
              bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)', 'TEXT'],
              struct: true,
            });

            fetch.on('message', (msg, _seqno) => {
              // Create email object with required fields
              const email: Partial<Email> = {
                messageId: null,
                from: '',
                to: [],
                cc: [],
                bcc: [],
                subject: null,
                text: null,
                html: null,
                receivedAt: null,
                folder,
                userId,
                isRead: false,
                isFlagged: false,
                isDeleted: false,
                isSpam: false,
                isDraft: false,
                isSent: false,
                attachments: null,
              };

              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });

                stream.once('end', () => {
                  if (info.which.includes('HEADER')) {
                    const header = IMAP.parseHeader(buffer);
                    email.messageId = header['message-id']?.[0];
                    email.from = header.from?.[0] || '';
                    email.to = header.to || [];
                    email.cc = header.cc || [];
                    email.bcc = header.bcc || [];
                    email.subject = header.subject?.[0] || null;
                    email.receivedAt = header.date?.[0]
                      ? new Date(header.date[0])
                      : null;
                  } else {
                    // Parse the email body
                    simpleParser(buffer, (err, parsed) => {
                      if (err) return;
                      email.text = parsed.text || null;
                      email.html = parsed.html || null;
                    });
                  }
                });
              });

              msg.once('end', () => {
                emails.push(email);
              });
            });

            fetch.once('error', (err) => {
              imapClient.end();
              reject(err);
            });

            fetch.once('end', () => {
              imapClient.end();
              this.logger.log(
                `Fetched ${emails.length} emails from IMAP server`,
              );

              // Save fetched emails to database
              this.saveEmailsToDatabase(emails, userId)
                .then(async () => {
                  // Fetch the saved emails from the database to return with proper IDs
                  const savedEmails = await this.prisma.email.findMany({
                    where: {
                      userId,
                      folder,
                      messageId: {
                        in: emails
                          .filter((e) => e.messageId)
                          .map((e) => e.messageId),
                      },
                    },
                    orderBy: { receivedAt: 'desc' },
                    take: limit,
                  });
                  resolve({
                    emails: savedEmails,
                    total,
                    hasMore: skip + limit < total,
                  });
                })
                .catch((error) => {
                  this.logger.error(
                    `Failed to save emails: ${error.message}`,
                    error.stack,
                  );
                  // Even if saving fails, return the fetched emails
                  resolve({
                    emails: emails as Email[],
                    total,
                    hasMore: skip + limit < total,
                  });
                });
            });
          });
        });

        imapClient.once('error', (err) => {
          reject(err);
        });

        imapClient.connect();
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch emails: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }
  }

  /**
   * Fetch emails using POP3 with pagination
   */
  async fetchEmailsPOP3(
    userId: string,
    options: GetEmailsDto,
  ): Promise<{ emails: Email[]; total: number; hasMore: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.pop3Enabled) {
        throw new Error('POP3 is not enabled for this user');
      }

      if (
        !user.emailHost ||
        !user.pop3Port ||
        !user.emailUsername ||
        !user.emailPassword
      ) {
        throw new Error('POP3 configuration is incomplete');
      }

      const folder = options.folder || 'INBOX';
      const page = options.page || 1;
      const limit = options.limit || 20;
      const start = (page - 1) * limit + 1; // POP3 starts at 1

      return new Promise((resolve, reject) => {
        const emails: Partial<Email>[] = [];
        let total = 0;
        let currentIndex = start;
        const end = start + limit - 1;

        // Create POP3 client
        const client = new POP3Client(user.pop3Port, user.emailHost, {
          tlserrs: false,
          enabletls: user.emailSecure,
          debug: false,
        });

        // Define retrieveNext function at the correct scope
        const retrieveNext = () => {
          if (currentIndex <= end && currentIndex <= total) {
            client.retr(currentIndex);
            currentIndex++;
          } else {
            client.quit();
            this.saveEmailsToDatabase(emails, userId)
              .then(() => {
                resolve({
                  emails: emails as Email[],
                  total,
                  hasMore: end < total,
                });
              })
              .catch(reject);
          }
        };

        // Handle errors
        client.on('error', (err) => {
          this.logger.error(`POP3 error: ${err.message}`);
          reject(err);
        });

        // Handle connection
        client.on('connect', () => {
          this.logger.log('Connected to POP3 server');
          client.login(user.emailUsername, user.emailPassword);
        });

        // Handle authentication
        client.on('login', (status) => {
          if (status) {
            this.logger.log('Logged in to POP3 server');
            client.stat();
          } else {
            client.quit();
            reject(new Error('POP3 login failed'));
          }
        });

        // Handle stat (to get total emails)
        client.on('stat', (status, data) => {
          if (status) {
            total = data.count;
            this.logger.log(`Total emails: ${total}`);

            if (total === 0) {
              client.quit();
              resolve({
                emails: [],
                total: 0,
                hasMore: false,
              });
              return;
            }

            // Start retrieving emails
            retrieveNext();
          } else {
            client.quit();
            reject(new Error('POP3 stat command failed'));
          }
        });

        // Handle email retrieval
        client.on('retr', (status, msgNumber, data) => {
          if (status) {
            // Parse the email
            const rawEmail = data.join('\r\n');
            simpleParser(rawEmail, (err, parsed) => {
              if (err) {
                this.logger.error(`Failed to parse email: ${err.message}`);
                retrieveNext();
                return;
              }

              // Create email object with required fields
              const email: Partial<Email> = {
                messageId: parsed.messageId,
                from: parsed.from?.text || '',
                to: parsed.to?.text ? [parsed.to.text] : [],
                cc: parsed.cc?.text ? [parsed.cc.text] : [],
                bcc: parsed.bcc?.text ? [parsed.bcc.text] : [],
                subject: parsed.subject || null,
                text: parsed.text || null,
                html: parsed.html || null,
                receivedAt: parsed.date || null,
                folder,
                userId,
                isRead: false,
                isFlagged: false,
                isDeleted: false,
                isSpam: false,
                isDraft: false,
                isSent: false,
                attachments: null,
              };

              emails.push(email);
              retrieveNext();
            });
          } else {
            this.logger.error(`Failed to retrieve message ${msgNumber}`);
            retrieveNext();
          }
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch emails: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }
  }

  /**
   * Get emails from database with pagination
   */
  async getEmailsFromDatabase(
    userId: string,
    options: GetEmailsDto,
  ): Promise<{ emails: Email[]; total: number; hasMore: boolean }> {
    const folder = options.folder || 'INBOX';
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      this.prisma.email.findMany({
        where: {
          userId,
          folder,
          isDeleted: false,
        },
        orderBy: {
          receivedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.email.count({
        where: {
          userId,
          folder,
          isDeleted: false,
        },
      }),
    ]);

    return {
      emails,
      total,
      hasMore: skip + limit < total,
    };
  }

  /**
   * Save emails to database
   */
  public async saveEmailsToDatabase(
    emails: Partial<Email>[],
    userId: string,
  ): Promise<void> {
    // For each email, check if it already exists in the database by messageId
    // If it doesn't exist, create it
    for (const email of emails) {
      // Skip emails without messageId
      if (!email.messageId) continue;

      const existingEmail = await this.prisma.email.findFirst({
        where: {
          messageId: email.messageId,
          userId,
        },
      });

      if (!existingEmail) {
        // Create new email in database (Prisma will handle the ID generation)
        await this.prisma.email.create({
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
            attachments: email.attachments || null,
          },
        });
      }
    }
  }

  /**
   * Mark email as read
   */
  async markEmailAsRead(userId: string, emailId: string): Promise<Email> {
    const email = await this.prisma.email.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.prisma.email.update({
      where: { id: emailId },
      data: { isRead: true },
    });
  }

  /**
   * Mark email as deleted
   */
  async markEmailAsDeleted(userId: string, emailId: string): Promise<Email> {
    const email = await this.prisma.email.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.prisma.email.update({
      where: { id: emailId },
      data: { isDeleted: true },
    });
  }

  /**
   * Move email to folder
   */
  async moveEmailToFolder(
    userId: string,
    emailId: string,
    folder: string,
  ): Promise<Email> {
    const email = await this.prisma.email.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.prisma.email.update({
      where: { id: emailId },
      data: { folder },
    });
  }
}
