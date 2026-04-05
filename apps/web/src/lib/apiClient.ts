import { API_BASE } from '@/lib/apiBase';
import {
  getAccessToken,
  setAccessToken as storeSetAccessToken,
  clearTokens as storeClearTokens,
  refreshAccessToken as storeRefreshAccessToken,
  setSessionExpiredCallback as storeSetSessionExpiredCallback,
  hasValidToken,
} from '@/lib/tokenStore';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds timeout

interface ApiOptions extends Omit<RequestInit, 'body'> {
  skipRetry?: boolean;
  body?: BodyInit | object | null;
  timeout?: number;
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * SECURITY: Token management now uses memory-based storage
 * Access tokens are stored in memory (not localStorage) to prevent XSS attacks
 * Refresh tokens are stored in HttpOnly cookies (handled by browser automatically)
 */

/**
 * Get token from secure memory storage
 */
function getToken(): string | null {
  return getAccessToken();
}

/**
 * Set access token in secure memory storage
 */
export function setAccessToken(accessToken: string, expiresIn?: number) {
  storeSetAccessToken(accessToken, expiresIn);
}

/**
 * @deprecated Use setAccessToken instead
 * Kept for backward compatibility during migration
 */
export function setTokens(accessToken: string, refreshToken?: string) {
  storeSetAccessToken(accessToken);
}

export function clearTokens() {
  storeClearTokens();
}

/**
 * Refresh access token using HttpOnly cookie
 */
async function refreshAccessToken(): Promise<string | null> {
  return storeRefreshAccessToken();
}

/**
 * Set callback for session expiry
 */
type SessionExpiredCallback = () => void;
let onSessionExpired: SessionExpiredCallback | null = null;

export function setSessionExpiredCallback(callback: SessionExpiredCallback) {
  onSessionExpired = callback;
  storeSetSessionExpiredCallback(callback);
}

export default async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  const { skipRetry = false, body, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  // Ensure headers object exists
  const headers = new Headers(fetchOptions.headers || {});
  
  // Add auth token if available
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    // Note: idle timer is managed internally by tokenStore
  }
  
  if (!headers.has('Content-Type') && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Stringify body if it's a plain object
  const processedBody = body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !ArrayBuffer.isView(body) && !(body instanceof URLSearchParams) && !(body instanceof ReadableStream)
    ? JSON.stringify(body)
    : body as BodyInit | null | undefined;

  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Include credentials to send/receive cookies
      const res = await fetch(url, { 
        ...fetchOptions, 
        headers, 
        body: processedBody,
        credentials: 'include', // Step 16: Send cookies with requests
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Handle 401 - attempt token refresh once
      if (res.status === 401 && attempt === 0) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          attempt++;
          continue;
        }
        // Refresh failed — notify session expired
        if (onSessionExpired) onSessionExpired();
        return { ok: false, status: 401, error: 'Session expired. Please log in again.' };
      }

      const data = await res.json().catch(() => null);
      
      if (!res.ok && res.status >= 500 && !skipRetry) {
        throw new Error(`Server error: ${res.status}`);
      }

      return { ok: res.ok, status: res.status, data, error: data?.error || data?.message };
      
    } catch (err) {
      attempt++;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errorMessage = isAbort ? 'Request timed out' : (err instanceof Error ? err.message : 'Network error');

      if (skipRetry || attempt >= MAX_RETRIES || isAbort) {
        return { 
          ok: false, 
          status: 0, 
          error: errorMessage 
        };
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, BASE_RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }

  return { ok: false, status: 0, error: 'Max retries exceeded' };
}
