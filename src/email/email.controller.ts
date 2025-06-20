import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { EmailConfigDto } from './dto/email-config.dto';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user email configuration' })
  @ApiResponse({ status: 200, description: 'Returns the email configuration' })
  async getEmailConfig(@GetUser() user: User): Promise<EmailConfigDto> {
    return this.emailService.getUserEmailConfig(user.id);
  }

  @Post('config')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user email configuration' })
  @ApiResponse({ status: 200, description: 'Email configuration updated' })
  async updateEmailConfig(
    @GetUser() user: User,
    @Body() emailConfig: EmailConfigDto,
  ): Promise<EmailConfigDto> {
    return this.emailService.updateUserEmailConfig(user.id, emailConfig);
  }

  @Post('send')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  async sendEmail(@GetUser() user: User, @Body() emailData: SendEmailDto) {
    return this.emailService.sendEmail(user.id, emailData);
  }

  @Get('imap')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Fetch emails using IMAP with pagination' })
  @ApiResponse({ status: 200, description: 'Returns emails fetched via IMAP' })
  async fetchEmailsIMAP(@GetUser() user: User, @Query() options: GetEmailsDto) {
    return this.emailService.fetchEmailsIMAP(user.id, options);
  }

  @Get('pop3')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Fetch emails using POP3 with pagination' })
  @ApiResponse({ status: 200, description: 'Returns emails fetched via POP3' })
  async fetchEmailsPOP3(@GetUser() user: User, @Query() options: GetEmailsDto) {
    return this.emailService.fetchEmailsPOP3(user.id, options);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get emails from database with pagination' })
  @ApiResponse({ status: 200, description: 'Returns emails from database' })
  async getEmails(@GetUser() user: User, @Query() options: GetEmailsDto) {
    return this.emailService.getEmailsFromDatabase(user.id, options);
  }

  @Patch(':id/read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark email as read' })
  @ApiResponse({ status: 200, description: 'Email marked as read' })
  async markEmailAsRead(@GetUser() user: User, @Param('id') emailId: string) {
    return this.emailService.markEmailAsRead(user.id, emailId);
  }

  @Patch(':id/delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark email as deleted' })
  @ApiResponse({ status: 200, description: 'Email marked as deleted' })
  async markEmailAsDeleted(
    @GetUser() user: User,
    @Param('id') emailId: string,
  ) {
    return this.emailService.markEmailAsDeleted(user.id, emailId);
  }

  @Patch(':id/move')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Move email to folder' })
  @ApiResponse({ status: 200, description: 'Email moved to folder' })
  async moveEmailToFolder(
    @GetUser() user: User,
    @Param('id') emailId: string,
    @Body('folder') folder: string,
  ) {
    return this.emailService.moveEmailToFolder(user.id, emailId, folder);
  }
}
