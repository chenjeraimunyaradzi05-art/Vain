'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  ChevronDown,
  Sparkles,
  Briefcase,
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Home,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SubscriptionBadge from './SubscriptionBadge';
import { NotificationDropdown } from './NotificationDropdown';
import { SearchBar, GlobalSearch } from './SearchBar';
import { Avatar } from './ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from './ui/Dropdown';

const publicNavigation = [
  { name: 'Jobs', href: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'Courses', href: '/courses', icon: <GraduationCap className="w-4 h-4" /> },
  { name: 'Mentorship', href: '/mentorship', icon: <Users className="w-4 h-4" /> },
  { name: 'Community', href: '/community', icon: <Sparkles className="w-4 h-4" /> },
  { name: 'Social', href: '/connections', icon: <Users className="w-4 h-4" /> },
  { name: 'Business', href: '/business-suite', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'Grants', href: '/grants', icon: <BookOpen className="w-4 h-4" /> },
  { name: 'Resources', href: '/resources', icon: <BookOpen className="w-4 h-4" /> },
];

function roleNavigation(userType: string) {
  const t = String(userType || '').toLowerCase();
  if (t === 'member')
    return [
      { name: 'Dashboard', href: '/member/dashboard', icon: <Home className="w-4 h-4" /> },
      { name: 'My Mentors', href: '/member/mentorship', icon: <Users className="w-4 h-4" /> },
      {
        name: 'Applications',
        href: '/member/applications',
        icon: <Briefcase className="w-4 h-4" />,
      },
      { name: 'Messages', href: '/member/messages', icon: <BookOpen className="w-4 h-4" /> },
    ];
  if (t === 'mentor')
    return [
      { name: 'Mentor Hub', href: '/mentor/dashboard', icon: <Home className="w-4 h-4" /> },
      { name: 'My Mentees', href: '/mentor/mentees', icon: <Users className="w-4 h-4" /> },
      { name: 'Sessions', href: '/mentor/sessions', icon: <Calendar className="w-4 h-4" /> },
    ];
  if (t === 'tafe' || t === 'institution')
    return [
      { name: 'Dashboard', href: '/tafe/dashboard', icon: <Home className="w-4 h-4" /> },
      { name: 'Courses', href: '/tafe/courses', icon: <GraduationCap className="w-4 h-4" /> },
      { name: 'Students', href: '/tafe/students', icon: <Users className="w-4 h-4" /> },
    ];
  if (t === 'company')
    return [
      { name: 'Dashboard', href: '/company/dashboard', icon: <Home className="w-4 h-4" /> },
      { name: 'Jobs', href: '/company/jobs', icon: <Briefcase className="w-4 h-4" /> },
      { name: 'Candidates', href: '/company/candidates', icon: <Users className="w-4 h-4" /> },
      { name: 'Billing', href: '/company/billing', icon: <BookOpen className="w-4 h-4" /> },
    ];
  if (t === 'admin')
    return [
      { name: 'Admin Dashboard', href: '/admin', icon: <Home className="w-4 h-4" /> },
      { name: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { name: 'Content', href: '/admin/content', icon: <BookOpen className="w-4 h-4" /> },
    ];
  return publicNavigation;
}

export default function EnhancedHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  const navItems = isAuthenticated && user ? roleNavigation(user.userType) : publicNavigation;

  const isActiveLink = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  className="h-8 w-auto"
                  src="/brand/vantage-logo-primary.svg"
                  alt="Vantage"
                  width={32}
                  height={32}
                  priority
                  unoptimized
                />
                <span className="hidden sm:block font-bold text-xl bg-gradient-to-r from-[#FFD700] to-[#50C878] bg-clip-text text-transparent">
                  Vantage
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navItems.slice(0, 6).map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-colors
                      ${
                        isActiveLink(link.href)
                          ? 'text-[#FFD700] bg-[#FFD700]/10'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button (Desktop shows bar, mobile shows button) */}
              <div className="hidden md:block w-64 lg:w-80">
                <SearchBar variant="minimal" placeholder="Search..." />
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <NotificationDropdown variant="default" />

                  {/* User Menu */}
                  <Dropdown
                    trigger={
                      <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Avatar
                          src={undefined}
                          name={
                            user?.profile?.firstName
                              ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
                              : user?.email || 'User'
                          }
                          size="sm"
                          status="online"
                        />
                        <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                      </button>
                    }
                    placement="bottom-end"
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.profile?.firstName
                          ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
                          : 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                      <div className="mt-2">
                        <SubscriptionBadge />
                      </div>
                    </div>
                    <DropdownDivider />
                    <DropdownItem href="/member/profile" icon={<User className="w-4 h-4" />}>
                      Profile
                    </DropdownItem>
                    <DropdownItem href="/settings" icon={<Settings className="w-4 h-4" />}>
                      Settings
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={handleLogout}
                      icon={<LogOut className="w-4 h-4" />}
                      danger
                    >
                      Logout
                    </DropdownItem>
                  </Dropdown>
                </>
              ) : (
                <></>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 space-y-2 border-t border-gray-200 dark:border-gray-800">
              {navItems.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium
                    ${
                      isActiveLink(link.href)
                        ? 'text-[#FFD700] bg-[#FFD700]/10'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}

              {!isAuthenticated && <></>}

              {isAuthenticated && (
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
