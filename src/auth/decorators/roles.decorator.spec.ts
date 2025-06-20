import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from './roles.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Roles Decorator', () => {
  it('should call SetMetadata with roles key and roles array', () => {
    // Call the Roles decorator with ADMIN role
    Roles(Role.ADMIN);

    // Verify SetMetadata was called with the correct parameters
    expect(SetMetadata).toHaveBeenCalledWith('roles', [Role.ADMIN]);
  });

  it('should call SetMetadata with multiple roles', () => {
    // Call the Roles decorator with multiple roles
    Roles(Role.ADMIN, Role.USER);

    // Verify SetMetadata was called with the correct parameters
    expect(SetMetadata).toHaveBeenCalledWith('roles', [Role.ADMIN, Role.USER]);
  });
});
