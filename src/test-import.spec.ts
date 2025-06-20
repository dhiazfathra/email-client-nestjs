import { RateLimitGuard } from './common/guards/throttler.guard';
describe('Import Test', () => {
  it('should import', () => {
    expect(RateLimitGuard).toBeDefined();
  });
});
