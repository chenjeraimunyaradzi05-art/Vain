'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { Menu, X, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SubscriptionBadge from './SubscriptionBadge';
import { useTheme } from './ThemeProvider';

// eslint-disable-next-line no-unused-vars
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

const publicNavigation = [
  { name: 'Jobs', href: '/jobs' },
  { name: 'Courses', href: '/courses' },
  { name: 'Mentorship', href: '/mentorship' },
  { name: 'Community', href: '/community' },
  { name: 'Social', href: '/social-feed' },
  { name: 'Women', href: '/women-pathways' },
  { name: 'Housing', href: '/rentals' },
  { name: 'Business', href: '/business-suite' },
  { name: 'Grants', href: '/grants' },
  { name: 'Resources', href: '/resources' },
  { name: 'Events', href: '/events' },
];

function roleNavigation(userType: string) {
  const t = String(userType || '').toLowerCase();
  if (t === 'member')
    return [
      { name: 'Dashboard', href: '/member/dashboard' },
      { name: 'My Mentors', href: '/member/mentorship' },
      { name: 'Applications', href: '/member/applications' },
      { name: 'Social', href: '/social-feed' },
      { name: 'Women', href: '/women-pathways' },
      { name: 'Housing', href: '/rentals' },
      { name: 'Business', href: '/business-suite' },
      { name: 'Grants', href: '/grants' },
      { name: 'Career', href: '/career' },
      { name: 'Messages', href: '/member/messages' },
      { name: 'Settings', href: '/settings' },
    ];
  if (t === 'mentor')
    return [
      { name: 'Mentor Hub', href: '/mentor/dashboard' },
      { name: 'Housing', href: '/rentals' },
      { name: 'Settings', href: '/settings' },
    ];
  if (t === 'tafe' || t === 'institution')
    return [
      { name: 'TAFE', href: '/tafe/dashboard' },
      { name: 'Housing', href: '/rentals' },
      { name: 'Settings', href: '/settings' },
    ];
  if (t === 'company')
    return [
      { name: 'Dashboard', href: '/company/dashboard' },
      { name: 'Jobs', href: '/company/jobs' },
      { name: 'Housing', href: '/rentals' },
      { name: 'Billing', href: '/company/billing' },
      { name: 'Settings', href: '/settings' },
    ];
  if (t === 'admin')
    return [
      { name: 'Dashboard', href: '/admin' },
      { name: 'Housing', href: '/rentals' },
    ];
  return [];
}

// Theme icon component that handles hydration gracefully
function ThemeIcon({ theme, mounted }: { theme: string; mounted: boolean }) {
  // During SSR or before hydration, show a neutral icon to prevent mismatch
  if (!mounted) {
    return <Sun className="h-5 w-5 opacity-50" />;
  }

  if (theme === 'dark') {
    return <Moon className="h-5 w-5" />;
  }
  if (theme === 'cosmic') {
    return <Sparkles className="h-5 w-5 text-yellow-500" />;
  }
  return <Sun className="h-5 w-5" />;
}

export default function HeaderNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const { resolvedTheme, setTheme, mounted } = useTheme();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const cycleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const navItems = isAuthenticated && user ? roleNavigation(user.userType) : publicNavigation;

  return (
    <header
      className="bg-white dark:bg-slate-900 cosmic:bg-cosmic-dark shadow-sm dark:shadow-slate-900/50 transition-colors duration-200"
      role="banner"
    >
      <nav
        id="navigation"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex w-full items-center justify-between border-b border-gray-200 dark:border-slate-800 py-4 lg:border-none">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <span className="sr-only">Vantage</span>
              <Image
                src="/brand/vantage-logo.png"
                alt="Vantage"
                width={120}
                height={100}
                priority
                className="h-11 w-auto transition-transform duration-150 hover:scale-105"
              />
            </Link>
            <div className="hidden ml-8 space-x-6 lg:block">
              {navItems.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-sm transition-colors duration-150 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-purple-600 dark:after:bg-purple-400 hover:after:w-full after:transition-all after:duration-200"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="ml-10 space-x-4 hidden lg:flex lg:items-center">
            {/* Theme toggle button */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors duration-150"
              aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : resolvedTheme === 'dark' ? 'cosmic' : 'light'} mode`}
              title={`Current: ${resolvedTheme || 'system'} mode`}
            >
              <ThemeIcon theme={resolvedTheme} mounted={mounted} />
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                  {user && (
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {user.profile?.firstName || 'Member'}
                    </span>
                  )}
                </div>
                <SubscriptionBadge />
                <button
                  onClick={handleLogout}
                  className="inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 active:bg-purple-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a
                  href="/signin"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                >
                  Sign in
                </a>
                <a
                  href="/signup"
                  className="inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer"
                >
                  Sign up
                </a>
              </div>
            )}
          </div>
          <div className="lg:hidden">
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div id="mobile-menu" className="py-3 flex flex-col gap-3 lg:hidden" role="menu">
            {navItems.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-900 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-sm px-2 py-1 transition-colors duration-150"
              >
                {link.name}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="mt-4 w-full text-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700"
              >
                Logout
              </button>
            ) : (
              <></>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
