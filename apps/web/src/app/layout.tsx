import './globals.css';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import HeaderNavigation from '../components/HeaderNavigation';
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'] });
const PartnershipModuleWrapper = dynamic(() => import('../components/PartnershipModuleWrapper'));
const Footer = dynamic(() => import('../components/Footer'));
const CookieConsent = dynamic(() => import('../components/CookieConsent'));
const ConnectionBannerWrapper = dynamic(() => import('../components/ConnectionBannerWrapper'));
import { SkipLinks } from '../components/ui/SkipLinks';
import type { ReactNode } from 'react';
import AIAssistantWrapper from '../components/AIAssistantWrapper';

import Script from 'next/script';
import { Metadata, Viewport } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vantageplatform.com';

export const metadata: Metadata = {
  title: {
    default: 'Vantage | Pathway Platform for Progress',
    template: '%s | Vantage',
  },
  description:
    'Vantage helps you see your next step — and take it. Jobs, learning, mentors, community, business tools, financial wellbeing, and real-world opportunities in one guided platform built for long-term progress.',
  keywords: [
    'pathway platform',
    'job discovery',
    'career guidance',
    'mentorship',
    'learning pathways',
    'opportunity matching',
  ],
  authors: [{ name: 'Munyaradzi Chenjerai' }],
  creator: 'Munyaradzi Chenjerai',
  publisher: 'Vantage',
  manifest: '/manifest.json',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vantage',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: SITE_URL,
    siteName: 'Vantage',
    title: 'Vantage | Pathway Platform for Progress',
    description:
      'Vantage helps you see your next step — and take it. Jobs, learning, mentors, community, and tools in one guided platform.',
    images: [
      {
        url: '/brand/vantage-og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vantage — Pathway Platform for Progress',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vantage | Pathway Platform for Progress',
    description: 'Jobs, learning, mentors, community, and tools — your next step, clearer.',
    images: ['/brand/vantage-og-image.png'],
    creator: '@vantagehq',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/vantage-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/vantage-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/brand/vantage-logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/favicon.svg' }],
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'employment',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#6B4C9A',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // JSON-LD structured data for Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vantage',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/vantage-logo.png`,
    description:
      'Vantage helps you see your next step — and take it. A pathway platform for jobs, learning, mentors, community, and tools.',
    sameAs: [
      'https://twitter.com/vantagehq',
      'https://www.linkedin.com/company/vantage-platform',
      'https://www.facebook.com/vantageplatform',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'English',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Vantage',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/jobs?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/brand/vantage-logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Theme flash prevention script - runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('vantage-theme');
                  var resolved = theme;
                  if (!theme || theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(resolved);
                  document.documentElement.style.colorScheme = resolved === 'light' ? 'light' : 'dark';
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-white dark:bg-gray-900 cosmic:bg-cosmic-dark text-gray-900 dark:text-slate-50 cosmic:text-slate-50 transition-colors duration-200`}
      >
        {/* Celestial background layers - only visible in cosmic mode */}
        <div
          className="fixed inset-0 pointer-events-none opacity-0 cosmic:opacity-80 transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(135deg, #1A0F2E 0%, #2D1B69 35%, #6B4C9A 70%, #3D1A2A 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 pointer-events-none opacity-0 cosmic:opacity-80 transition-opacity duration-300"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 25%, rgba(255, 215, 0, 0.12) 0%, transparent 45%),
              radial-gradient(circle at 85% 75%, rgba(80, 200, 120, 0.1) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(228, 91, 138, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 10% 80%, rgba(135, 206, 235, 0.08) 0%, transparent 35%),
              radial-gradient(circle at 90% 15%, rgba(183, 110, 121, 0.1) 0%, transparent 35%)
            `,
          }}
          aria-hidden="true"
        />
        {/* Precious stone dot pattern overlay - only in cosmic mode */}
        <div
          className="fixed inset-0 pointer-events-none dot-celestial opacity-0 cosmic:opacity-30 transition-opacity duration-300"
          aria-hidden="true"
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SkipLinks
          links={[
            { id: 'main-content', label: 'Skip to main content' },
            { id: 'navigation', label: 'Skip to navigation' },
          ]}
        />
        <Providers>
          <HeaderNavigation />
          <div className="flex-1 relative z-10">
            <main id="main-content" className="pt-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
          <PartnershipModuleWrapper />
          <Footer />
          <CookieConsent />
          <ConnectionBannerWrapper />
          <AIAssistantWrapper />
        </Providers>
        <Script id="register-sw" strategy="beforeInteractive">
          {`
            (function() {
              try {
                if (!('serviceWorker' in navigator)) return;

                var host = (location && location.hostname) ? location.hostname : '';
                var isLocal = host === 'localhost' || host === '127.0.0.1';

                // In local dev, service worker caching can cause stale Next.js bundles
                // and lead to hydration mismatches. Ensure SW is disabled and caches cleared.
                if (isLocal) {
                  var key = '__sw_cleared_once__';
                  var now = Date.now ? Date.now() : 0;
                  var last = 0;
                  try {
                    last = window.sessionStorage ? parseInt(sessionStorage.getItem(key) || '0', 10) : 0;
                  } catch (e) {
                    // Ignore: sessionStorage may be unavailable (privacy mode, denied access)
                  }

                  // Avoid reload loops: if we already attempted cleanup very recently, skip.
                  if (last && now && now - last < 10000) return;

                  Promise.all([
                    navigator.serviceWorker.getRegistrations().catch(function() { return []; }),
                    ('caches' in window)
                      ? caches.keys().catch(function() { return []; })
                      : Promise.resolve([])
                  ]).then(function(results) {
                    var regs = results[0] || [];
                    var cacheKeys = results[1] || [];
                    var hasSW = !!navigator.serviceWorker.controller || (regs && regs.length > 0) || (cacheKeys && cacheKeys.length > 0);
                    if (!hasSW) return;

                    return Promise.all(regs.map(function(r) { return r.unregister(); }))
                      .then(function() {
                        if (!('caches' in window)) return;
                        return caches.keys().then(function(keys) {
                          return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                        });
                      })
                      .then(function() {
                        try {
                          if (window.sessionStorage && now) sessionStorage.setItem(key, String(now));
                        } catch (e) {
                          // Ignore: sessionStorage may be unavailable (privacy mode, denied access)
                        }
                        // Reload once to ensure we pick up the latest client bundles.
                        location.reload();
                      });
                  }).catch(function(err) {
                    try { if (window.sessionStorage) sessionStorage.removeItem(key); } catch (e) {
                      // Ignore: sessionStorage may be unavailable (privacy mode, denied access)
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log('SW cleanup failed:', err);
                    }
                  });
                  return;
                }

                // Non-local: register SW on load.
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('SW registered:', registration.scope);
                      }
                    },
                    function(err) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('SW registration failed:', err);
                      }
                    }
                  );
                });
              } catch (e) {
                // Ignore: SW initialization is best-effort
              }
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
