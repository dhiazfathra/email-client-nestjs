import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateMicrosoftUserDto } from '../users/dto/create-microsoft-user.dto';
import { UpdateMicrosoftInfoDto } from '../users/dto/update-microsoft-info.dto';
import { JsonValue } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      // Destructure password out of user object to avoid sending it to client
      const { password: _, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateOrCreateMicrosoftUser(microsoftUserData: {
    email: string;
    firstName: string;
    lastName: string;
    microsoftId: string;
    tokens: JsonValue;
  }): Promise<User> {
    // Check if user with this Microsoft ID already exists
    let user = await this.usersService.findByMicrosoftId(
      microsoftUserData.microsoftId,
    );

    if (!user) {
      // Check if user with this email exists
      user = await this.usersService.findByEmail(microsoftUserData.email);

      if (user) {
        // Update existing user with Microsoft ID
        const microsoftUpdateData: UpdateMicrosoftInfoDto = {
          microsoftId: microsoftUserData.microsoftId,
          microsoftTokens: microsoftUserData.tokens,
        };
        user = await this.usersService.updateMicrosoftInfo(
          user.id,
          microsoftUpdateData,
        );
      } else {
        // Create new user with Microsoft info
        const microsoftUserDto: CreateMicrosoftUserDto = {
          email: microsoftUserData.email,
          firstName: microsoftUserData.firstName,
          lastName: microsoftUserData.lastName,
          microsoftId: microsoftUserData.microsoftId,
          microsoftTokens: microsoftUserData.tokens,
        };
        user = await this.usersService.createMicrosoftUser(microsoftUserDto);
      }
    } else {
      // Update tokens for existing Microsoft user
      const tokenUpdateData: UpdateMicrosoftInfoDto = {
        microsoftTokens: microsoftUserData.tokens,
      };
      user = await this.usersService.updateMicrosoftInfo(
        user.id,
        tokenUpdateData,
      );
    }

    // The user object is already of type User (without password)
    return user;
  }

  generateTokenForMicrosoftUser(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      microsoftId: user.microsoftId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
