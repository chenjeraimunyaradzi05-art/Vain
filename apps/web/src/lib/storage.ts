/**
 * Browser Storage Utilities
 * 
 * Safe wrappers for localStorage/sessionStorage with expiration and type safety
 */

/**
 * Storage item with metadata
 */
interface StorageItem<T> {
  value: T;
  expiry?: number;
  version?: number;
}

/**
 * Storage options
 */
interface StorageOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Version number for cache invalidation */
  version?: number;
}

const STORAGE_VERSION = 1;

/**
 * Safe JSON parse
 */
function safeJsonParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Check if storage is available
 */
function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Storage wrapper with type safety and expiration
 */
class StorageWrapper {
  private storage: Storage | null = null;
  private memoryFallback: Map<string, string> = new Map();
  
  constructor(type: 'localStorage' | 'sessionStorage') {
    if (isStorageAvailable(type)) {
      this.storage = window[type];
    }
  }
  
  /**
   * Get item from storage
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const raw = this.storage 
      ? this.storage.getItem(key) 
      : this.memoryFallback.get(key) ?? null;
    
    const item = safeJsonParse<StorageItem<T>>(raw);
    
    if (!item) {
      return defaultValue;
    }
    
    // Check version
    if (item.version !== undefined && item.version !== STORAGE_VERSION) {
      this.remove(key);
      return defaultValue;
    }
    
    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.remove(key);
      return defaultValue;
    }
    
    return item.value;
  }
  
  /**
   * Set item in storage
   */
  set<T>(key: string, value: T, options?: StorageOptions): boolean {
    const item: StorageItem<T> = {
      value,
      version: STORAGE_VERSION,
    };
    
    if (options?.ttl) {
      item.expiry = Date.now() + options.ttl;
    }
    
    try {
      const serialized = JSON.stringify(item);
      
      if (this.storage) {
        this.storage.setItem(key, serialized);
      } else {
        this.memoryFallback.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      // Storage full or other error
      console.warn('Storage error:', error);
      return false;
    }
  }
  
  /**
   * Remove item from storage
   */
  remove(key: string): void {
    if (this.storage) {
      this.storage.removeItem(key);
    } else {
      this.memoryFallback.delete(key);
    }
  }
  
  /**
   * Clear all items
   */
  clear(): void {
    if (this.storage) {
      this.storage.clear();
    } else {
      this.memoryFallback.clear();
    }
  }
  
  /**
   * Get all keys
   */
  keys(): string[] {
    if (this.storage) {
      return Object.keys(this.storage);
    }
    return Array.from(this.memoryFallback.keys());
  }
  
  /**
   * Get storage size in bytes
   */
  getSize(): number {
    let size = 0;
    
    if (this.storage) {
      for (const key of Object.keys(this.storage)) {
        size += key.length + (this.storage.getItem(key)?.length ?? 0);
      }
    } else {
      for (const [key, value] of this.memoryFallback) {
        size += key.length + value.length;
      }
    }
    
    return size * 2; // UTF-16 characters
  }
  
  /**
   * Get remaining quota (rough estimate)
   */
  getRemainingQuota(): number {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB typical limit
    return Math.max(0, MAX_SIZE - this.getSize());
  }
  
  /**
   * Clean expired items
   */
  cleanExpired(): number {
    let cleaned = 0;
    
    for (const key of this.keys()) {
      const raw = this.storage 
        ? this.storage.getItem(key) 
        : this.memoryFallback.get(key) ?? null;
      
      const item = safeJsonParse<StorageItem<unknown>>(raw);
      
      if (item?.expiry && Date.now() > item.expiry) {
        this.remove(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Singleton instances
let localStorageInstance: StorageWrapper | null = null;
let sessionStorageInstance: StorageWrapper | null = null;

/**
 * Get localStorage wrapper
 */
export function getLocalStorage(): StorageWrapper {
  if (!localStorageInstance) {
    localStorageInstance = new StorageWrapper('localStorage');
  }
  return localStorageInstance;
}

/**
 * Get sessionStorage wrapper
 */
export function getSessionStorage(): StorageWrapper {
  if (!sessionStorageInstance) {
    sessionStorageInstance = new StorageWrapper('sessionStorage');
  }
  return sessionStorageInstance;
}

// Convenience exports
export const localStorage = {
  get: <T>(key: string, defaultValue?: T) => getLocalStorage().get<T>(key, defaultValue),
  set: <T>(key: string, value: T, options?: StorageOptions) => getLocalStorage().set<T>(key, value, options),
  remove: (key: string) => getLocalStorage().remove(key),
  clear: () => getLocalStorage().clear(),
  keys: () => getLocalStorage().keys(),
  getSize: () => getLocalStorage().getSize(),
  getRemainingQuota: () => getLocalStorage().getRemainingQuota(),
  cleanExpired: () => getLocalStorage().cleanExpired(),
};

export const sessionStorage = {
  get: <T>(key: string, defaultValue?: T) => getSessionStorage().get<T>(key, defaultValue),
  set: <T>(key: string, value: T, options?: StorageOptions) => getSessionStorage().set<T>(key, value, options),
  remove: (key: string) => getSessionStorage().remove(key),
  clear: () => getSessionStorage().clear(),
  keys: () => getSessionStorage().keys(),
  getSize: () => getSessionStorage().getSize(),
  getRemainingQuota: () => getSessionStorage().getRemainingQuota(),
  cleanExpired: () => getSessionStorage().cleanExpired(),
};

/**
 * Cookie utilities
 */
export const cookies = {
  /**
   * Get a cookie value
   */
  get(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    
    const matches = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    
    return matches ? decodeURIComponent(matches[1]) : undefined;
  },
  
  /**
   * Set a cookie
   */
  set(
    name: string,
    value: string,
    options: {
      expires?: Date | number;
      path?: string;
      domain?: string;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      httpOnly?: boolean;
    } = {}
  ): void {
    if (typeof document === 'undefined') return;
    
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    if (options.expires) {
      const date = typeof options.expires === 'number'
        ? new Date(Date.now() + options.expires)
        : options.expires;
      cookie += `; expires=${date.toUTCString()}`;
    }
    
    if (options.path) cookie += `; path=${options.path}`;
    if (options.domain) cookie += `; domain=${options.domain}`;
    if (options.secure) cookie += '; secure';
    if (options.sameSite) cookie += `; samesite=${options.sameSite}`;
    
    document.cookie = cookie;
  },
  
  /**
   * Delete a cookie
   */
  remove(name: string, options: { path?: string; domain?: string } = {}): void {
    cookies.set(name, '', {
      ...options,
      expires: new Date(0),
    });
  },
  
  /**
   * Get all cookies as an object
   */
  getAll(): Record<string, string> {
    if (typeof document === 'undefined') return {};
    
    return document.cookie.split('; ').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      if (key) {
        acc[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
      return acc;
    }, {} as Record<string, string>);
  },
};

const storageUtils = {
  localStorage,
  sessionStorage,
  cookies,
  getLocalStorage,
  getSessionStorage,
};

export default storageUtils;
