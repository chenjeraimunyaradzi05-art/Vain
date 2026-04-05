/** @type {import('next').NextConfig} */
const path = require('path');

// Bundle analyzer is optional - only load if installed and ANALYZE=true
let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  } catch (e) {
    console.warn('Bundle analyzer not installed, skipping...');
  }
}

// ============================================
// Content Security Policy Configuration
// Enhanced security with strict directives
// ============================================
const isProduction = process.env.NODE_ENV === 'production';

// Nonce will be generated per-request in middleware
// For now, we use 'unsafe-inline' but with strict CSP rules
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    // Next.js dev server uses eval-based source maps
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    'https://js.stripe.com',
    'https://meet.jit.si', // Jitsi video calls
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components/CSS-in-JS
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://res.cloudinary.com',
    'https://images.unsplash.com',
    'https://logo.clearbit.com',
    'https://*.ngurrapathways.life',
    'https://avatars.githubusercontent.com', // GitHub avatars
    'https://lh3.googleusercontent.com', // Google avatars
  ],
  'connect-src': [
    "'self'",
    'https://*.ngurrapathways.life',
    'https://*.gimbi.com.au', // Backend API
    'https://*.netlify.app', // Deploy previews
    'https://*.up.railway.app', // Railway backend
    'wss://*.up.railway.app', // Railway WebSocket
    'https://api.stripe.com',
    'wss://*.ngurrapathways.life', // WebSocket connections
    'wss://*.gimbi.com.au', // WebSocket connections
    'https://meet.jit.si',
    ...(isProduction
      ? []
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'ws://localhost:3000',
          'http://localhost:3333',
          'http://127.0.0.1:3333',
          'ws://localhost:3333',
        ]),
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://r2cdn.perplexity.ai'],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://meet.jit.si', // Jitsi video embeds
  ],
  'frame-ancestors': ["'self'"],
  'media-src': ["'self'", 'blob:', 'data:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  // Upgrade insecure requests in production
  ...(isProduction && { 'upgrade-insecure-requests': [] }),
};

// Build CSP string from directives
const csp = Object.entries(cspDirectives)
  .map(([key, values]) => {
    if (values.length === 0) return key + ';';
    return `${key} ${values.join(' ')};`;
  })
  .join(' ');

const nextConfig = {
  // Configure monorepo root for output file tracing
  outputFileTracingRoot: path.resolve(__dirname, '../../'),

  // Configure Turbopack root to the monorepo root
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // Silence dev-time warning when accessing the dev server via 127.0.0.1/localhost.
  // This affects Playwright and local dev on Windows.
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'http://127.0.0.1:3000', 'http://localhost:3000'],

  // Performance optimizations
  images: {
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Icon sizes for smaller images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow external image domains (add as needed)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ngurrapathways.life',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Bundle analyzer (enable with ANALYZE=true)
  ...(process.env.ANALYZE && {
    experimental: {
      // Enable bundle size reporting in build output
      optimizePackageImports: ['lucide-react'],
    },
  }),

  // Optimize package imports for tree-shaking
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash', 'recharts', '@sentry/nextjs'],
  },

  // API proxy rewrites - Route all /api/* requests to the backend
  // This solves CORS issues and enables cookie sharing on the same origin
  async redirects() {
    return [
      {
        source: '/feed',
        destination: '/social-feed',
        permanent: true,
      },
      {
        source: '/feed/create',
        destination: '/social-feed/new',
        permanent: true,
      },
      {
        source: '/feed/:path*',
        destination: '/social-feed',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    return {
      // Fallback rewrites only apply if no page/API route matches
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ],
    };
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DNS prefetching for performance
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: [
              'camera=(self)', // Allow camera for video calls
              'microphone=(self)', // Allow microphone for video calls
              'geolocation=()', // Disabled
              'accelerometer=()', // Disabled
              'gyroscope=()', // Disabled
              'magnetometer=()', // Disabled
              'payment=(self)', // Allow Stripe
              'usb=()', // Disabled
              'interest-cohort=()', // Disable FLoC/Topics
            ].join(', '),
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          // HSTS - Force HTTPS for 2 years with preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevent cross-origin embedder policy issues
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          // Resource isolation
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-site',
          },
        ],
      },
      {
        // API routes - more permissive CORS but strict security
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Cache static assets
        source: '/(.*)\\.(jpg|jpeg|png|gif|ico|svg|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache JavaScript and CSS with versioning
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer({
  ...nextConfig,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash',
      '@livekit/components-react',
      'recharts',
    ],
  },
});
