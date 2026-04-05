// @ts-nocheck
/**
 * Content Security Policy (CSP) Middleware
 * 
 * Provides additional security headers and CSP configuration.
 */

/**
 * Default CSP directives
 */
const defaultDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    "https://js.stripe.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind and styled-jsx
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "https://*.cloudinary.com",
    "https://*.amazonaws.com",
  ],
  'font-src': [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
  ],
  'connect-src': [
    "'self'",
    "https://api.ngurrapathways.com.au",
    "wss://api.ngurrapathways.com.au",
    "https://api.ngurrapathways.life",
    "wss://api.ngurrapathways.life",
    "https://*.sentry.io",
    "https://www.google-analytics.com",
    "https://api.stripe.com",
  ],
  'frame-src': [
    "'self'",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://meet.jit.si",
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'block-all-mixed-content': [],
  'upgrade-insecure-requests': [],
};

/**
 * Build CSP header string from directives
 * @param {object} directives - CSP directives
 * @returns {string}
 */
function buildCspHeader(directives) {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * CSP middleware factory
 * @param {object} options - Configuration options
 */
function cspMiddleware(options = {}) {
  const {
    directives = {},
    reportUri = null,
    reportOnly = false,
  } = options;

  // Merge with defaults
  const mergedDirectives = { ...defaultDirectives };
  
  for (const [key, values] of Object.entries(directives)) {
    if (mergedDirectives[key]) {
      mergedDirectives[key] = [...new Set([...mergedDirectives[key], ...values])];
    } else {
      mergedDirectives[key] = values;
    }
  }

  if (reportUri) {
    mergedDirectives['report-uri'] = [reportUri];
  }

  const cspHeader = buildCspHeader(mergedDirectives);
  const headerName = reportOnly 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';

  return (req, res, next) => {
    res.setHeader(headerName, cspHeader);
    next();
  };
}

/**
 * Generate nonce for inline scripts
 * @returns {string}
 */
function generateNonce() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP middleware with nonce support
 */
function cspWithNonce(options = {}) {
  const {
    directives = {},
    reportUri = null,
    reportOnly = false,
  } = options;

  return (req, res, next) => {
    // Generate nonce for this request
    const nonce = generateNonce();
    req.cspNonce = nonce;
    res.locals.cspNonce = nonce;

    // Build directives with nonce
    const mergedDirectives = { ...defaultDirectives };
    
    // Add nonce to script-src and style-src
    mergedDirectives['script-src'] = [
      ...mergedDirectives['script-src'].filter(s => s !== "'unsafe-inline'"),
      `'nonce-${nonce}'`,
    ];

    for (const [key, values] of Object.entries(directives)) {
      if (mergedDirectives[key]) {
        mergedDirectives[key] = [...new Set([...mergedDirectives[key], ...values])];
      } else {
        mergedDirectives[key] = values;
      }
    }

    if (reportUri) {
      mergedDirectives['report-uri'] = [reportUri];
    }

    const cspHeader = buildCspHeader(mergedDirectives);
    const headerName = reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';

    res.setHeader(headerName, cspHeader);
    next();
  };
}

/**
 * Additional security headers middleware
 */
function securityHeadersMiddleware() {
  return (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy (previously Feature-Policy)
    res.setHeader('Permissions-Policy', [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=(self)',
    ].join(', '));
    
    // HSTS (enable in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // Don't cache sensitive pages
    if (req.path.includes('/admin') || req.path.includes('/auth')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
}

/**
 * CORS headers for API responses
 */
function corsHeaders(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-API-Version'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return void res.status(204).end();
    }

    next();
  };
}

