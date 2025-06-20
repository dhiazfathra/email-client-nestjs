// Import the necessary modules
import { Test } from '@nestjs/testing';

// Create a mock class for AuthGuard
class MockAuthGuard {
  canActivate = jest.fn().mockReturnValue(true);
}

// Mock the entire @nestjs/passport module
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => MockAuthGuard),
}));

// Import after mocking to ensure the mock is used
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let jwtAuthGuard: JwtAuthGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    jwtAuthGuard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(jwtAuthGuard).toBeDefined();
  });

  it('should call AuthGuard with jwt strategy', () => {
    expect(AuthGuard).toHaveBeenCalledWith('jwt');
  });
});
