import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private encryptionService: EncryptionService) {
    super();
    this.$use(this.createEncryptionMiddleware());
  }

  /**
   * Creates a middleware to handle encryption and decryption of sensitive fields
   * @returns Prisma middleware function
   */
  private createEncryptionMiddleware() {
    return async (
      params: Prisma.MiddlewareParams,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (params: Prisma.MiddlewareParams) => Promise<any>,
    ) => {
      // Only apply to User model operations
      if (params.model === 'User') {
        // Handle encryption for create and update operations
        if (
          (params.action === 'create' ||
            params.action === 'update' ||
            params.action === 'upsert') &&
          params.args.data
        ) {
          // For create and update, encrypt emailPassword if it exists
          if (params.args.data.emailPassword !== undefined) {
            params.args.data.emailPassword = this.encryptionService.encrypt(
              params.args.data.emailPassword,
            );
          }

          // For upsert, handle create data
          if (
            params.action === 'upsert' &&
            params.args.create?.emailPassword !== undefined
          ) {
            params.args.create.emailPassword = this.encryptionService.encrypt(
              params.args.create.emailPassword,
            );
          }

          // For upsert, handle update data
          if (
            params.action === 'upsert' &&
            params.args.update?.emailPassword !== undefined
          ) {
            params.args.update.emailPassword = this.encryptionService.encrypt(
              params.args.update.emailPassword,
            );
          }
        }

        // Execute the database operation
        const result = await next(params);

        // Handle decryption for find operations
        if (
          (params.action === 'findUnique' ||
            params.action === 'findFirst' ||
            params.action === 'findMany') &&
          result
        ) {
          // For single result
          if (!Array.isArray(result) && result.emailPassword) {
            try {
              result.emailPassword = this.encryptionService.decrypt(
                result.emailPassword,
              );
            } catch (error) {
              // Log error and set to null or handle appropriately
              console.error('Failed to decrypt email password:', error);
              result.emailPassword = null;
            }
          }

          // For array results
          if (Array.isArray(result)) {
            for (const item of result) {
              if (item.emailPassword) {
                item.emailPassword = this.encryptionService.decrypt(
                  item.emailPassword,
                );
              }
            }
          }
        }

        return result;
      }

      // For other models, just pass through
      return next(params);
    };
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
