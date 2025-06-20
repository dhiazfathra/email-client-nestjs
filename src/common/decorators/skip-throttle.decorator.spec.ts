import { SetMetadata } from '@nestjs/common';
import { SkipThrottle } from './skip-throttle.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn().mockReturnValue('mockedDecorator'),
}));

describe('SkipThrottle Decorator', () => {
  it('should call SetMetadata with the correct parameters', () => {
    const result = SkipThrottle();

    expect(SetMetadata).toHaveBeenCalledWith('skipThrottle', true);
    expect(result).toBe('mockedDecorator');
  });
});
