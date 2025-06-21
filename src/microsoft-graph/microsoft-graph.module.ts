import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MicrosoftGraphAuthService } from './microsoft-graph-auth.service';
import { MicrosoftGraphEmailService } from './microsoft-graph-email.service';
import { MicrosoftGraphController } from './microsoft-graph.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [MicrosoftGraphController],
  providers: [MicrosoftGraphAuthService, MicrosoftGraphEmailService],
  exports: [MicrosoftGraphAuthService, MicrosoftGraphEmailService],
})
export class MicrosoftGraphModule {}
