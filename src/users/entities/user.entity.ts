import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude } from 'class-transformer';

/**
 * User entity representing a user in the system
 * Used for Swagger documentation
 */
export class User {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'User roles',
    example: [Role.USER],
    type: [String],
    enum: Role,
    isArray: true,
  })
  roles: Role[];

  @ApiProperty({
    description: 'When the user was created',
    example: '2025-05-17T13:19:32.000Z',
    format: 'date-time',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the user was last updated',
    example: '2025-05-17T13:19:32.000Z',
    format: 'date-time',
    type: Date,
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether the user is deleted',
    example: false,
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;

  @Exclude()
  emailPassword?: string;

  @ApiPropertyOptional({
    description: 'Email host server',
    example: 'smtp.gmail.com',
  })
  emailHost?: string;

  @ApiPropertyOptional({ description: 'IMAP port', example: 993 })
  imapPort?: number;

  @ApiPropertyOptional({ description: 'POP3 port', example: 995 })
  pop3Port?: number;

  @ApiPropertyOptional({ description: 'SMTP port', example: 587 })
  smtpPort?: number;

  @ApiPropertyOptional({
    description: 'Email username',
    example: 'user@example.com',
  })
  emailUsername?: string;

  @ApiPropertyOptional({
    description: 'Whether to use secure connection',
    example: true,
  })
  emailSecure?: boolean;

  @ApiPropertyOptional({
    description: 'Whether IMAP is enabled',
    example: true,
  })
  imapEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether POP3 is enabled',
    example: false,
  })
  pop3Enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether SMTP is enabled',
    example: true,
  })
  smtpEnabled?: boolean;
}
