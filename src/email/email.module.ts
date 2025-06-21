import { Module } from '@nestjs/common';
import { MicrosoftGraphModule } from '../microsoft-graph/microsoft-graph.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [PrismaModule, MicrosoftGraphModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
