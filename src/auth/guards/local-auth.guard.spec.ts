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
import { LocalAuthGuard } from './local-auth.guard';

describe('LocalAuthGuard', () => {
  let localAuthGuard: LocalAuthGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LocalAuthGuard],
    }).compile();

    localAuthGuard = moduleRef.get<LocalAuthGuard>(LocalAuthGuard);
  });

  it('should be defined', () => {
    expect(localAuthGuard).toBeDefined();
  });

  it('should call AuthGuard with local strategy', () => {
    expect(AuthGuard).toHaveBeenCalledWith('local');
  });
});
