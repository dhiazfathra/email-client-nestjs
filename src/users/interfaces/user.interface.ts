import { JsonValue } from '@prisma/client/runtime/library';

/**
 * User interface representing a user entity without the password
 */
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
  microsoftId?: string;
  microsoftTokens?: JsonValue;
}

/**
 * User interface representing a user entity with the password
 */
export interface UserWithPassword extends User {
  password: string;
}

/**
 * JWT payload interface for authentication
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
