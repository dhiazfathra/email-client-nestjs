import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMicrosoftUserDto } from './dto/create-microsoft-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMicrosoftInfoDto } from './dto/update-microsoft-info.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user with email already exists (only among non-deleted users)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createUserDto.email,
        isDeleted: false,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(createUserDto.password);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // Remove password from the response
    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.cacheService.getOrSet(
      'users:all',
      async () => {
        const users = await this.prisma.user.findMany({
          where: { isDeleted: false },
        });
        return users.map(({ password: _, ...rest }) => rest);
      },
      300, // Cache for 5 minutes
    );
  }

  async findOne(id: string) {
    return this.cacheService.getOrSet(
      `user:${id}`,
      async () => {
        const user = await this.prisma.user.findFirst({
          where: {
            id,
            isDeleted: false,
          },
        });

        if (!user) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }

        const { password: _, ...result } = user;
        return result;
      },
      300, // Cache for 5 minutes
    );
  }

  async findByEmail(email: string) {
    return this.cacheService.getOrSet(
      `user:email:${email}`,
      async () => {
        return this.prisma.user.findFirst({
          where: {
            email,
            isDeleted: false,
          },
        });
      },
      300, // Cache for 5 minutes
    );
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    await this.findOne(id);

    // No need to check for existing email separately as we'll handle unique constraint violations

    // If updating password, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    // Update the user and handle unique constraint violations
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    // Invalidate cache for this user
    await this.cacheService.del(`user:${id}`);

    // If email was updated, invalidate the email cache
    if (updateUserDto.email) {
      await this.cacheService.del(`user:email:${updateUserDto.email}`);
    }

    // Invalidate the all users cache
    await this.cacheService.del('users:all');

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    // Check if user exists
    const user = await this.findOne(id);

    // Soft delete the user by setting isDeleted to true
    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Invalidate cache for this user
    await this.cacheService.del(`user:${id}`);

    // Invalidate the email cache
    if (user.email) {
      await this.cacheService.del(`user:email:${user.email}`);
    }

    // Invalidate the all users cache
    await this.cacheService.del('users:all');

    return { message: 'User deleted successfully' };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async findByMicrosoftId(microsoftId: string): Promise<User | null> {
    return this.cacheService.getOrSet(
      `user:microsoftId:${microsoftId}`,
      async () => {
        return this.prisma.user.findFirst({
          where: {
            microsoftId,
            isDeleted: false,
          },
        });
      },
      300, // Cache for 5 minutes
    );
  }

  async updateMicrosoftInfo(
    userId: string,
    updateMicrosoftInfoDto: UpdateMicrosoftInfoDto,
  ): Promise<User> {
    // Check if user exists
    await this.findOne(userId);

    // Update the user with Microsoft info
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateMicrosoftInfoDto,
    });

    // Invalidate cache for this user
    await this.cacheService.del(`user:${userId}`);

    // Invalidate Microsoft ID cache if it was updated
    if (updateMicrosoftInfoDto.microsoftId) {
      await this.cacheService.del(
        `user:microsoftId:${updateMicrosoftInfoDto.microsoftId}`,
      );
    }

    // Invalidate the all users cache
    await this.cacheService.del('users:all');

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async createMicrosoftUser(
    createMicrosoftUserDto: CreateMicrosoftUserDto,
  ): Promise<User> {
    // Check if user with email already exists (only among non-deleted users)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createMicrosoftUserDto.email,
        isDeleted: false,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Generate a cryptographically secure random password for Microsoft users (they will use OAuth to login)
    const randomPassword = crypto.randomBytes(16).toString('hex').slice(0, 16);
    const hashedPassword = await this.hashPassword(randomPassword);

    // Create the user with Microsoft info
    const user = await this.prisma.user.create({
      data: {
        email: createMicrosoftUserDto.email,
        firstName: createMicrosoftUserDto.firstName,
        lastName: createMicrosoftUserDto.lastName,
        password: hashedPassword,
        microsoftId: createMicrosoftUserDto.microsoftId,
        microsoftTokens: createMicrosoftUserDto.microsoftTokens,
      },
    });

    // Invalidate the all users cache
    await this.cacheService.del('users:all');

    // Remove password from the response
    const { password: _, ...result } = user;
    return result;
  }
}
