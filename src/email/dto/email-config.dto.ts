import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EmailConfigDto {
  @ApiProperty({ description: 'Email server host', example: 'smtp.gmail.com' })
  @IsString()
  @IsOptional()
  emailHost?: string;

  @ApiProperty({ description: 'IMAP server port', example: 993 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  imapPort?: number;

  @ApiProperty({ description: 'POP3 server port', example: 995 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  pop3Port?: number;

  @ApiProperty({ description: 'SMTP server port', example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @ApiProperty({
    description: 'Email username/address',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  emailUsername?: string;

  @ApiProperty({ description: 'Email password', example: 'password123' })
  @IsString()
  @IsOptional()
  emailPassword?: string;

  @ApiProperty({ description: 'Whether to use SSL/TLS', example: true })
  @IsBoolean()
  @IsOptional()
  emailSecure?: boolean;

  @ApiProperty({ description: 'Whether IMAP is enabled', example: true })
  @IsBoolean()
  @IsOptional()
  imapEnabled?: boolean;

  @ApiProperty({ description: 'Whether SMTP is enabled', example: true })
  @IsBoolean()
  @IsOptional()
  smtpEnabled?: boolean;

  @ApiProperty({ description: 'Whether POP3 is enabled', example: false })
  @IsBoolean()
  @IsOptional()
  pop3Enabled?: boolean;
}
