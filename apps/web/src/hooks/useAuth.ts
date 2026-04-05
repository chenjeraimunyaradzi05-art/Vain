'use client';

/**
 * Authentication Hook (TypeScript)
 *
 * Adapts the Zustand authStore for components expecting the useAuth hook pattern.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { API_BASE } from '../lib/apiBase';
import { clearAuthSessionCookie } from '../lib/authSession';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const storeLogout = useAuthStore((state) => state.logout);
  const hasFetchedRef = useRef(false);

  const logout = useCallback(() => {
    // Clear the HttpOnly token cookie on the server
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
    clearAuthSessionCookie();
    storeLogout();
  }, [storeLogout, token]);

  useEffect(() => {
    if (!hasHydrated || hasFetchedRef.current) return;

    // Case 1: Have a token but no user — fetch profile
    // Case 2: Authenticated flag rehydrated but token lost (page reload) — try to recover session
    const needsProfileFetch = token && !user;
    const needsSessionRecovery = !token && isAuthenticated;

    if (!needsProfileFetch && !needsSessionRecovery) return;
    hasFetchedRef.current = true;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers,
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Unauthorized');
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      })
      .then((payload) => {
        if (payload?.data) {
          // If the server returned a fresh token (session recovery), store it
          if (payload.data.token) {
            setToken(payload.data.token);
          }
          setUser({
            id: payload.data.id,
            email: payload.data.email,
            userType: String(payload.data.userType || '').toLowerCase(),
            profile: payload.data.profile,
          });
        } else {
          throw new Error('No user data');
        }
      })
      .catch(() => {
        setToken(null);
        logout();
      });
  }, [hasHydrated, user, token, isAuthenticated, setUser, setToken, logout]);

  return {
    user,
    token,
    // Only show as authenticated after hydration to avoid flicker
    isAuthenticated: hasHydrated ? isAuthenticated : false,
    isLoading: !hasHydrated || isLoading,
    setUser,
    setToken,
    logout,
  };
}

export default useAuth;
