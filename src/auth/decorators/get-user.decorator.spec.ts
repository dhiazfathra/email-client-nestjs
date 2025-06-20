import { ExecutionContext } from '@nestjs/common';
import { GetUser, getUserFactory } from './get-user.decorator';

describe('GetUser Decorator', () => {
  // Define types for our mocks
  interface MockUser {
    id: string;
    email: string;
    username: string;
    roles: string[];
  }

  interface MockRequest {
    user?: MockUser;
  }

  let mockExecutionContext: ExecutionContext;
  let mockRequest: MockRequest;
  let mockUser: MockUser;

  beforeEach(() => {
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      roles: ['user'],
    };

    mockRequest = {
      user: mockUser,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  it('should be defined', () => {
    expect(GetUser).toBeDefined();
  });

  it('should extract the entire user object when no data is provided', () => {
    const result = getUserFactory(undefined, mockExecutionContext);
    expect(result).toEqual(mockUser);
  });

  it('should extract a specific user property when data is provided', () => {
    // Test with email property
    const emailResult = getUserFactory('email', mockExecutionContext);
    expect(emailResult).toEqual(mockUser.email);

    // Test with id property
    const idResult = getUserFactory('id', mockExecutionContext);
    expect(idResult).toEqual(mockUser.id);

    // Test with username property
    const usernameResult = getUserFactory('username', mockExecutionContext);
    expect(usernameResult).toEqual(mockUser.username);
  });

  it('should return undefined when requesting a non-existent property', () => {
    const result = getUserFactory('nonExistentProperty', mockExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should handle case when user is not in the request', () => {
    const requestWithoutUser: MockRequest = {};

    const mockContextWithoutUser = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(requestWithoutUser),
      }),
    } as unknown as ExecutionContext;

    const result = getUserFactory(undefined, mockContextWithoutUser);
    expect(result).toBeUndefined();
  });
});
