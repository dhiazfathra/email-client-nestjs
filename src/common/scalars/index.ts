import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Custom scalar type definitions for API documentation
 * These can be referenced in Swagger documentation to maintain consistent type definitions
 */
export const CustomScalars: Record<string, SchemaObject> = {
  UUID: {
    type: 'string',
    format: 'uuid',
    description: 'UUID v4 string',
    example: '123e4567-e89b-12d3-a456-426614174000',
  },

  Date: {
    type: 'string',
    format: 'date-time',
    description: 'ISO8601 date string',
    example: new Date().toISOString(),
  },

  Email: {
    type: 'string',
    format: 'email',
    description: 'Email address',
    example: 'user@example.com',
  },

  Password: {
    type: 'string',
    format: 'password',
    description: 'User password (min 8 characters)',
    example: 'Password123!',
  },
};
