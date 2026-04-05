/**
 * Auth Session Cookie Management
 *
 * Sets a lightweight, non-sensitive cookie that signals to Next.js
 * edge middleware that the user has authenticated. This cookie does
 * NOT contain the JWT — it is only a boolean flag ("1").
 *
 * The actual JWT is kept in memory via tokenStore.ts and never
 * exposed to document.cookie or localStorage.
 */

const COOKIE_NAME = 'auth-session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days (matches JWT expiry)

/**
 * Set the auth-session cookie after successful login/signup.
 */
export function setAuthSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
}

/**
 * Clear the auth-session cookie on logout.
 */
export function clearAuthSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax; Secure`;
}
