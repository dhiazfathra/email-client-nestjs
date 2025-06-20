import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
}
