/**
 * useAuth Hook Tests
 * Unit tests for the authentication hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider, useAuthContext } from '@/hooks/useAuth';

// Mock API
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import { authApi } from '@/lib/api';
import { storage } from '@/lib/storage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.get as any).mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should start with no user', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should start with loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      (authApi.login as any).mockResolvedValue({ 
        user: mockUser, 
        token: 'test-token' 
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(storage.set).toHaveBeenCalledWith('token', 'test-token');
    });

    it('should handle login error', async () => {
      (authApi.login as any).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        });
      }).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: any;
      (authApi.login as any).mockImplementation(() => new Promise(r => { resolveLogin = r; }));

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin({ user: { id: '1' }, token: 'token' });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      (authApi.login as any).mockResolvedValue({ user: mockUser, token: 'token' });
      (authApi.logout as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First login
      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(storage.remove).toHaveBeenCalledWith('token');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = { id: '1', email: 'new@example.com', name: 'New User' };
      (authApi.register as any).mockResolvedValue({ 
        user: mockUser, 
        token: 'new-token' 
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration error', async () => {
      (authApi.register as any).mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password',
            firstName: 'Test',
            lastName: 'User',
          });
        });
      }).rejects.toThrow('Email already exists');
    });
  });

  describe('refresh session', () => {
    it('should restore session from token', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      (storage.get as any).mockReturnValue('stored-token');
      (authApi.getCurrentUser as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid stored token', async () => {
      (storage.get as any).mockReturnValue('invalid-token');
      (authApi.getCurrentUser as any).mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(storage.remove).toHaveBeenCalledWith('token');
    });
  });

  describe('password reset', () => {
    it('should send forgot password email', async () => {
      (authApi.forgotPassword as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.forgotPassword('test@example.com');
      });

      expect(authApi.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should reset password with token', async () => {
      (authApi.resetPassword as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resetPassword('reset-token', 'new-password');
      });

      expect(authApi.resetPassword).toHaveBeenCalledWith('reset-token', 'new-password');
    });
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within an AuthProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('hasRole', () => {
    it('should check if user has role', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' };
      (authApi.login as any).mockResolvedValue({ user: mockUser, token: 'token' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('employer')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should check if user has permission', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        role: 'employer',
        permissions: ['create_job', 'view_applications'],
      };
      (authApi.login as any).mockResolvedValue({ user: mockUser, token: 'token' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.hasPermission('create_job')).toBe(true);
      expect(result.current.hasPermission('delete_users')).toBe(false);
    });
  });
});
