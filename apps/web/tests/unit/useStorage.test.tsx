/**
 * useStorage Hook Tests
 * Unit tests for local storage and session storage hooks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSessionStorage, useStorageItem } from '@/hooks/useStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return default value when key does not exist', () => {
      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('defaultValue');
    });

    it('should return stored value when key exists', () => {
      localStorageMock.setItem('testKey', JSON.stringify('storedValue'));

      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('storedValue');
    });

    it('should handle complex objects', () => {
      const storedObject = { name: 'Test', count: 42 };
      localStorageMock.setItem('testKey', JSON.stringify(storedObject));

      const { result } = renderHook(() => 
        useLocalStorage('testKey', { name: '', count: 0 })
      );

      expect(result.current[0]).toEqual(storedObject);
    });

    it('should handle arrays', () => {
      const storedArray = [1, 2, 3, 4, 5];
      localStorageMock.setItem('testKey', JSON.stringify(storedArray));

      const { result } = renderHook(() => 
        useLocalStorage<number[]>('testKey', [])
      );

      expect(result.current[0]).toEqual(storedArray);
    });

    it('should return default value on invalid JSON', () => {
      localStorageMock.setItem('testKey', 'invalid json{');

      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('defaultValue');
    });
  });

  describe('setValue', () => {
    it('should update value', () => {
      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'initial')
      );

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify('updated')
      );
    });

    it('should accept updater function', () => {
      const { result } = renderHook(() => 
        useLocalStorage('counter', 0)
      );

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[1]((prev) => prev + 5);
      });

      expect(result.current[0]).toBe(6);
    });

    it('should handle object updates', () => {
      const { result } = renderHook(() => 
        useLocalStorage('user', { name: 'John', age: 30 })
      );

      act(() => {
        result.current[1]((prev) => ({ ...prev, age: 31 }));
      });

      expect(result.current[0]).toEqual({ name: 'John', age: 31 });
    });
  });

  describe('removeValue', () => {
    it('should remove value and return to default', () => {
      localStorageMock.setItem('testKey', JSON.stringify('storedValue'));

      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('storedValue');

      act(() => {
        result.current[2](); // removeValue
      });

      expect(result.current[0]).toBe('defaultValue');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('cross-tab sync', () => {
    it('should update value on storage event', () => {
      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'initial')
      );

      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'testKey',
          newValue: JSON.stringify('fromOtherTab'),
          storageArea: localStorage,
        }));
      });

      expect(result.current[0]).toBe('fromOtherTab');
    });

    it('should ignore events for other keys', () => {
      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'initial')
      );

      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'otherKey',
          newValue: JSON.stringify('value'),
          storageArea: localStorage,
        }));
      });

      expect(result.current[0]).toBe('initial');
    });
  });

  describe('SSR safety', () => {
    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore
      delete window.localStorage;

      const { result } = renderHook(() => 
        useLocalStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('defaultValue');

      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    });
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return default value when key does not exist', () => {
      const { result } = renderHook(() => 
        useSessionStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('defaultValue');
    });

    it('should return stored value when key exists', () => {
      sessionStorageMock.setItem('testKey', JSON.stringify('storedValue'));

      const { result } = renderHook(() => 
        useSessionStorage('testKey', 'defaultValue')
      );

      expect(result.current[0]).toBe('storedValue');
    });
  });

  describe('setValue', () => {
    it('should update value in session storage', () => {
      const { result } = renderHook(() => 
        useSessionStorage('testKey', 'initial')
      );

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify('updated')
      );
    });
  });

  describe('removeValue', () => {
    it('should remove value from session storage', () => {
      sessionStorageMock.setItem('testKey', JSON.stringify('storedValue'));

      const { result } = renderHook(() => 
        useSessionStorage('testKey', 'defaultValue')
      );

      act(() => {
        result.current[2]();
      });

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('testKey');
    });
  });
});

describe('useStorageItem', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should use localStorage by default', () => {
    const { result } = renderHook(() => 
      useStorageItem('testKey', 'default', { storage: 'local' })
    );

    act(() => {
      result.current[1]('value');
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should use sessionStorage when specified', () => {
    const { result } = renderHook(() => 
      useStorageItem('testKey', 'default', { storage: 'session' })
    );

    act(() => {
      result.current[1]('value');
    });

    expect(sessionStorageMock.setItem).toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should handle expiry', async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(() => 
      useStorageItem('testKey', 'default', { 
        storage: 'local',
        expiry: 1000, // 1 second
      })
    );

    act(() => {
      result.current[1]('storedValue');
    });

    expect(result.current[0]).toBe('storedValue');

    // Fast forward past expiry
    vi.advanceTimersByTime(1500);

    // Rerender to check if value expired
    rerender();

    // Value should be back to default after expiry
    expect(result.current[0]).toBe('default');

    vi.useRealTimers();
  });

  it('should prefix keys when configured', () => {
    renderHook(() => 
      useStorageItem('testKey', 'default', { 
        storage: 'local',
        prefix: 'app_',
      })
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith('app_testKey');
  });

  it('should serialize and deserialize custom types', () => {
    const customSerializer = vi.fn((value: Date) => value.toISOString());
    const customDeserializer = vi.fn((value: string) => new Date(value));

    const { result } = renderHook(() => 
      useStorageItem<Date>('dateKey', new Date('2024-01-01'), {
        storage: 'local',
        serializer: customSerializer,
        deserializer: customDeserializer,
      })
    );

    act(() => {
      result.current[1](new Date('2024-06-15'));
    });

    expect(customSerializer).toHaveBeenCalled();
  });
});

describe('Storage quota handling', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should handle quota exceeded error', () => {
    localStorageMock.setItem.mockImplementation(() => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    const onError = vi.fn();

    const { result } = renderHook(() => 
      useLocalStorage('testKey', 'default')
    );

    // Should not throw, just log error
    act(() => {
      result.current[1]('large value');
    });

    // Value in state should still update
    expect(result.current[0]).toBe('large value');
  });
});

describe('Boolean values', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should handle false values correctly', () => {
    const { result } = renderHook(() => 
      useLocalStorage('boolKey', true)
    );

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'boolKey',
      JSON.stringify(false)
    );
  });

  it('should restore false values correctly', () => {
    localStorageMock.setItem('boolKey', JSON.stringify(false));

    const { result } = renderHook(() => 
      useLocalStorage('boolKey', true)
    );

    expect(result.current[0]).toBe(false);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => 
      useLocalStorage<string | null>('nullKey', 'default')
    );

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBe(null);
  });

  it('should handle undefined values', () => {
    const { result } = renderHook(() => 
      useLocalStorage<string | undefined>('undefinedKey', 'default')
    );

    act(() => {
      result.current[1](undefined);
    });

    // Undefined should be treated as "remove"
    expect(result.current[0]).toBe('default');
  });
});
