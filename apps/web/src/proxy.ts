/**
 * Next.js Proxy (replaces middleware convention)
 *
 * Security proxy for:
 * - CSP nonce generation for inline scripts
 * - Security headers enhancement
 * - Rate limiting at edge
 * - Bot protection
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Generate a cryptographically secure nonce (reserved for future strict-dynamic CSP)
// function generateNonce(): string {
//   const array = new Uint8Array(16);
//   crypto.getRandomValues(array);
//   return Buffer.from(array).toString('base64');
// }

// Paths that don't need CSP nonce (static assets)
const staticPaths = ['/_next/', '/favicon.ico', '/robots.txt', '/sitemap.xml'];

/**
 * ⚠️  PRODUCTION WARNING: In-Memory Rate Limiting Limitations
 *
 * This rate limiter uses an in-memory Map which has the following limitations:
 * 1. NOT shared across serverless function instances (Vercel, Netlify)
 * 2. NOT shared across edge locations in CDN environments
 * 3. Resets on each deployment or cold start
 *
 * For production, consider:
 * - Vercel: Use @vercel/kv or Upstash Redis with @upstash/ratelimit
 * - Netlify: Use Netlify Blobs or external Redis
 * - Self-hosted: Use Redis-based rate limiting
 *
 * Example with Upstash (recommended for serverless):
 * ```
 * import { Ratelimit } from '@upstash/ratelimit';
 * import { Redis } from '@upstash/redis';
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(100, '1 m'),
 * });
 * ```
 *
 * The current implementation is suitable for:
 * - Development and testing
 * - Single-instance deployments
 * - Basic protection (better than nothing)
 */
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 1000; // requests per window (increased for better UX)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Lazy cleanup: remove old entries when checking (every 100th request)
  if (rateLimitMap.size > 100 && Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }

  return false;
}

// Note: Cleanup happens lazily in isRateLimited function
// setInterval is not supported in serverless/edge environments

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (staticPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get client IP for rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Rate limiting
  if (isRateLimited(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
        'X-RateLimit-Remaining': '0',
      },
    });
  }

  // Generate nonce for this request (reserved for future strict-dynamic CSP implementation)
  // const nonce = generateNonce();

  // Clone the response and add security headers
  const response = NextResponse.next();

  // Store nonce in request header for use in pages (reserved for future use)
  // response.headers.set('x-nonce', nonce);

  // Build CSP - using unsafe-inline until proper nonce injection is implemented
  const isProduction = process.env.NODE_ENV === 'production';

  const cspDirectives = [
    `default-src 'self'`,
    // Use unsafe-inline for scripts in both environments until proper nonce injection is implemented
    // Next.js App Router doesn't automatically inject nonces into its scripts
    `script-src 'self' 'unsafe-inline' ${isProduction ? '' : "'unsafe-eval'"} https://js.stripe.com https://meet.jit.si`.trim(),
    `style-src 'self' 'unsafe-inline'`, // Required for CSS-in-JS
    `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://logo.clearbit.com https://*.ngurrapathways.life https://*.netlify.app https://avatars.githubusercontent.com https://lh3.googleusercontent.com`,
    `connect-src 'self' https://*.ngurrapathways.life https://*.gimbi.com.au https://*.netlify.app https://api.stripe.com wss://*.ngurrapathways.life wss://*.gimbi.com.au https://meet.jit.si${
      isProduction
        ? ''
        : ' http://localhost:3333 http://127.0.0.1:3333 ws://localhost:3333 ws://127.0.0.1:3333 ws://localhost:3000 ws://127.0.0.1:3000'
    }`,
    `font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai`,
    `frame-src 'self' https://js.stripe.com https://meet.jit.si`,
    `frame-ancestors 'self'`,
    `media-src 'self' blob: data:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    isProduction ? `upgrade-insecure-requests` : null,
  ]
    .filter(Boolean)
    .join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS in production
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=(self)',
      'microphone=(self)',
      'geolocation=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'payment=(self)',
      'usb=()',
      'interest-cohort=()',
    ].join(', '),
  );

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by backend)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
