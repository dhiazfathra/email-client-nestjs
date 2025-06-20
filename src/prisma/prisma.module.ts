import { Global, Module } from '@nestjs/common';
import { EncryptionModule } from '../encryption/encryption.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [EncryptionModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
