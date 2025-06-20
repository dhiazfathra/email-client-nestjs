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
