import { User } from '../types/chat';

interface CacheEntry {
  user: User;
  timestamp: number;
}

class UserCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  set(handle: string, user: User): void {
    this.cache.set(handle, {
      user,
      timestamp: Date.now(),
    });
  }

  get(handle: string): User | null {
    const entry = this.cache.get(handle);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(handle);
      return null;
    }

    return entry.user;
  }

  invalidate(handle: string): void {
    this.cache.delete(handle);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const userCache = new UserCache();
