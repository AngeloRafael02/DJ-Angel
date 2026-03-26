

type CacheEntry<T> = {
  data: T;
  expiry: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) return null;

    // If data is expired, delete it and return null
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(key: string): void {
    this.store.delete(key);
  }
}

export const cache = new MemoryCache();