/**
 * Mock implementation of cache-manager for Deno compatibility
 * This file provides the necessary exports to satisfy imports from cache-manager
 * without actually using the real cache-manager package
 */

// Define the Cache interface that matches what's expected by the application
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}

// Create a mock store factory
export function memoryStore(config?: Record<string, unknown>) {
  console.log('[Deno] Creating memory store with config:', config);

  // In-memory storage
  const storage = new Map<string, { value: unknown; expires: number | null }>();

  // Default TTL (30 seconds)
  const defaultTtl = (config?.ttl as number) || 30;
  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      console.log(`[Deno Cache] Get: ${key}`);
      const item = storage.get(key);

      if (!item) {
        return undefined;
      }

      // Check if expired
      if (item.expires && item.expires < Date.now()) {
        storage.delete(key);
        return undefined;
      }

      return item.value as T;
    },

    set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
      console.log(`[Deno Cache] Set: ${key}, TTL: ${ttl ?? defaultTtl}`);
      const expires = ttl ? Date.now() + ttl * 1000 : null;
      storage.set(key, { value, expires });
    },

    del: async (key: string): Promise<void> => {
      console.log(`[Deno Cache] Delete: ${key}`);
      storage.delete(key);
    },

    reset: async (): Promise<void> => {
      console.log('[Deno Cache] Reset');
      storage.clear();
    },

    // Additional methods that might be expected
    store: 'memory',
    getClient: () => null,
  };
}

// Export a default caching factory
export default {
  memoryStore,
  caching: (config?: Record<string, unknown>) => memoryStore(config),
};
