import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { JsonValue } from '@prisma/client/runtime/library';

export class UpdateMicrosoftInfoDto {
  @ApiProperty({
    description: 'Microsoft account ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  @IsString()
  @IsOptional()
  microsoftId?: string;

  @ApiProperty({
    description: 'Microsoft OAuth tokens',
    example: {
      accessToken: 'access_token_value',
      refreshToken: 'refresh_token_value',
      expiresIn: 3600,
    },
  })
  @IsObject()
  @IsOptional()
  microsoftTokens?: JsonValue;
}
