import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { EmailService } from '../email/email.service';

async function bootstrap() {
  // Create a NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Replace with an actual user ID from your database
    const userId = 'your-user-id';

    // Test sending an email
    console.log('Testing sending email via Microsoft Graph...');
    const emailData = new SendEmailDto();
    emailData.to = ['recipient@example.com'];
    emailData.subject = 'Test Email from Microsoft Graph';
    emailData.text = 'This is a test email sent using Microsoft Graph API.';
    emailData.html =
      '<p>This is a test email sent using <strong>Microsoft Graph API</strong>.</p>';

    const sentEmail = await emailService.sendEmail(userId, emailData);
    console.log('Email sent successfully:', sentEmail);

    // Test receiving emails
    console.log('Testing receiving emails via Microsoft Graph...');
    const options = new GetEmailsDto();
    options.folder = 'inbox';
    options.limit = 10;
    options.page = 1;

    const receivedEmails = await emailService.fetchEmails(userId, options);
    console.log(`Retrieved ${receivedEmails.emails.length} emails`);
    console.log('Total emails:', receivedEmails.total);
    console.log('Has more:', receivedEmails.hasMore);

    // Display email subjects
    receivedEmails.emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject} (From: ${email.from})`);
    });
  } catch (error) {
    console.error('Error testing Outlook email:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
