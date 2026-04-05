/**
 * Enhanced API client with retry logic, token refresh, and error handling
 * Usage: api('/auth/some', { method: 'POST', body: JSON.stringify(data) })
 */

import { API_BASE } from '@/lib/apiBase';
import {
    getAccessToken as getTokenFromStore,
    setAccessToken as setTokenInStore,
    clearTokens as clearTokensInStore,
    refreshAccessToken as refreshTokenInStore,
} from '@/lib/tokenStore';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

/**
 * Get stored authentication token
 */
function getToken() {
    return getTokenFromStore();
}

/**
 * Store tokens after authentication
 */
export function setTokens(accessToken, refreshToken) {
    if (accessToken) setTokenInStore(accessToken);
}

/**
 * Clear stored tokens on logout
 */
export function clearTokens() {
    clearTokensInStore();
}

/**
 * Attempt to refresh the access token
 * The refresh token is now stored in HttpOnly cookie, sent automatically
 */
async function refreshAccessToken() {
    try {
        return await refreshTokenInStore();
    } catch (err) {
        console.error('Token refresh failed:', err);
        clearTokens();
        return null;
    }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffDelay(attempt) {
    return BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Check if error is retryable
 */
function isRetryableError(status) {
    // Retry on network errors (status 0), server errors (5xx), and rate limiting (429)
    return status === 0 || status >= 500 || status === 429;
}

/**
 * Main API request function
 * @param {string} path - API endpoint path
 * @param {RequestInit} init - Fetch options
 * @param {object} options - Additional options
 * @param {number} options.retries - Max retry attempts (default: 3)
 * @param {boolean} options.skipAuth - Skip authentication header
 * @returns {Promise<{ok: boolean, status: number, data: any, error?: string}>}
 */
export async function api(path, init = {}, options = {}) {
    const { retries = MAX_RETRIES, skipAuth = false } = options;
    const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
    
    let lastError = null;
    let attempt = 0;
    let currentToken = getToken();

    while (attempt <= retries) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...(init.headers || {}),
            };

            // Add auth header if token exists and not skipped
            if (!skipAuth && currentToken) {
                headers['Authorization'] = `Bearer ${currentToken}`;
            }

            const res = await fetch(url, { 
                ...init, 
                headers,
                credentials: 'include', // Include cookies for refresh token
            });
            
            // Handle 401 Unauthorized - try to refresh token
            if (res.status === 401 && !skipAuth && attempt === 0) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    currentToken = newToken;
                    attempt++;
                    continue; // Retry with new token
                }
                // Token refresh failed, return unauthorized
                return { 
                    ok: false, 
                    status: 401, 
                    data: null, 
                    error: 'Session expired. Please log in again.' 
                };
            }

            // Handle rate limiting with retry-after
            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : backoffDelay(attempt);
                if (attempt < retries) {
                    await sleep(delayMs);
                    attempt++;
                    continue;
                }
            }

            // Parse response
            const text = await res.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseErr) {
                data = text;
            }

            // Handle successful response
            if (res.ok) {
                return { ok: true, status: res.status, data };
            }

            // Handle retryable errors
            if (isRetryableError(res.status) && attempt < retries) {
                await sleep(backoffDelay(attempt));
                attempt++;
                continue;
            }

            // Return error response in a consistent shape
            return { 
                ok: false, 
                status: res.status, 
                data, 
                error: data?.error || data?.message || `Request failed with status ${res.status}`,
                code: data?.code,
                details: data?.details,
                requestId: data?.requestId || res.headers.get('x-request-id') || undefined,
            };

        } catch (networkErr) {
            lastError = networkErr;
            
            // Network errors are retryable
            if (attempt < retries) {
                await sleep(backoffDelay(attempt));
                attempt++;
                continue;
            }
        }
    }

    // All retries exhausted
    return { 
        ok: false, 
        status: 0, 
        data: null, 
        error: lastError?.message || 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
    };
}

/**
 * Convenience methods for common HTTP verbs
 */
api.get = (path, options) => api(path, { method: 'GET' }, options);

api.post = (path, body, options) => 
    api(path, { method: 'POST', body: JSON.stringify(body) }, options);

api.put = (path, body, options) => 
    api(path, { method: 'PUT', body: JSON.stringify(body) }, options);

api.patch = (path, body, options) => 
    api(path, { method: 'PATCH', body: JSON.stringify(body) }, options);

api.delete = (path, options) => 
    api(path, { method: 'DELETE' }, options);

export default api;
