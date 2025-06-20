import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipients of the email',
    example: ['recipient@example.com'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  to: string[];

  @ApiProperty({
    description: 'CC recipients',
    example: ['cc@example.com'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @ApiProperty({
    description: 'BCC recipients',
    example: ['bcc@example.com'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bcc?: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Hello from NestJS',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Email plain text content',
    example: 'This is a test email.',
    required: false,
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({
    description: 'Email HTML content',
    example: '<p>This is a <strong>test</strong> email.</p>',
    required: false,
  })
  @IsString()
  @IsOptional()
  html?: string;
}
