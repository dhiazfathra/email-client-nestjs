import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetEmailsDto } from '../email/dto/get-emails.dto';
import { SendEmailDto } from '../email/dto/send-email.dto';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';

@Controller('microsoft-graph')
@UseGuards(JwtAuthGuard)
export class MicrosoftGraphController {
  constructor(
    private readonly microsoftGraphEmailService: MicrosoftGraphEmailService,
  ) {}

  @Post('send-email')
  async sendEmail(
    @GetUser('id') userId: string,
    @Body() emailData: SendEmailDto,
  ) {
    return this.microsoftGraphEmailService.sendEmail(userId, emailData);
  }

  @Get('emails')
  async getEmails(
    @GetUser('id') userId: string,
    @Query() options: GetEmailsDto,
  ) {
    return this.microsoftGraphEmailService.fetchEmails(userId, options);
  }

  @Get('emails/:id')
  async getEmailById(
    @GetUser('id') userId: string,
    @Param('id') emailId: string,
  ) {
    return this.microsoftGraphEmailService.getEmailById(userId, emailId);
  }

  @Get('status')
  async getStatus(@GetUser('id') userId: string) {
    try {
      await this.microsoftGraphEmailService.validateUserConfig(userId);
      return {
        status: 'connected',
        message: 'Microsoft Graph API is connected',
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Microsoft Graph API connection failed: ${error.message}`,
      };
    }
  }

  @Get('folders')
  async getFolders(@GetUser('id') userId: string) {
    return this.microsoftGraphEmailService.getMailFolders(userId);
  }
}
