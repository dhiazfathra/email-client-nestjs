import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailHost: 'smtp.example.com',
        emailPassword: 'emailPassword',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailSecure: true,
        emailUsername: 'test@example.com',
        imapEnabled: false,
        pop3Enabled: false,
        smtpEnabled: true,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
        isDeleted: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        emailHost: 'smtp.example.com',
        emailPassword: 'emailPassword',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailSecure: true,
        emailUsername: 'test@example.com',
        imapEnabled: false,
        pop3Enabled: false,
        smtpEnabled: true,
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return null when user is not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailHost: 'smtp.example.com',
        emailPassword: 'emailPassword',
        imapPort: 993,
        pop3Port: 995,
        smtpPort: 587,
        emailSecure: true,
        emailUsername: 'test@example.com',
        imapEnabled: false,
        pop3Enabled: false,
        smtpEnabled: true,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongPassword',
        'hashedPassword',
      );
    });
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'jwt-token',
        user,
      });
      expect(service.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@example.com',
        role: Role.USER,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'wrongPassword',
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
