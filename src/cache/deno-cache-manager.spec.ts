import { memoryStore } from './deno-cache-manager';

describe('DenoCacheManager', () => {
  let store: any;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Mock console.log to avoid output during tests
    console.log = jest.fn();
    store = memoryStore({ ttl: 60 });
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('memoryStore', () => {
    it('should create a memory store with default config', () => {
      const defaultStore = memoryStore();
      expect(defaultStore).toBeDefined();
      expect(defaultStore.store).toBe('memory');
    });

    it('should create a memory store with custom ttl', () => {
      const customStore = memoryStore({ ttl: 120 });
      expect(customStore).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return undefined when key not found', async () => {
      const result = await store.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should return value when key exists', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await store.set(key, value);
      const result = await store.get(key);

      expect(result).toEqual(value);
    });

    it('should return undefined and delete key when expired', async () => {
      const key = 'expired-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 1; // 1 second TTL

      await store.set(key, value, ttl);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const mockNow = jest.fn().mockReturnValue(originalNow() + 2000); // 2 seconds later
      global.Date.now = mockNow;

      const result = await store.get(key);

      expect(result).toBeUndefined();

      // Restore original Date.now
      global.Date.now = originalNow;
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await store.set(key, value);

      const result = await store.get(key);
      expect(result).toEqual(value);
    });

    it('should set value with specified TTL', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };
      const ttl = 300;

      await store.set(key, value, ttl);

      const result = await store.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('del', () => {
    it('should delete key when it exists', async () => {
      const key = 'test-key';
      const value = { id: '1', name: 'Test' };

      await store.set(key, value);
      await store.del(key);

      const result = await store.get(key);
      expect(result).toBeUndefined();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(store.del('non-existent-key')).resolves.not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear all keys', async () => {
      const key1 = 'test-key-1';
      const value1 = { id: '1', name: 'Test 1' };
      const key2 = 'test-key-2';
      const value2 = { id: '2', name: 'Test 2' };

      await store.set(key1, value1);
      await store.set(key2, value2);
      await store.reset();

      const result1 = await store.get(key1);
      const result2 = await store.get(key2);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });
  });

  describe('additional methods', () => {
    it('should have store property set to memory', () => {
      expect(store.store).toBe('memory');
    });

    it('should have getClient method that returns null', () => {
      expect(store.getClient()).toBeNull();
    });
  });
});
