'use client';

import React from 'react';
import { SafeExit } from '@/components/security/SafeExit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User,
  Heart,
  Award,
  FolderHeart,
  GraduationCap,
  Sparkles,
  Calendar,
  PiggyBank,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const mainNavItems = [
    { href: '/member/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/member/profile', label: 'Profile', icon: User },
    { href: '/jobs', label: 'Find Jobs', icon: Briefcase },
    { href: '/member/applications', label: 'My Applications', icon: FolderHeart },
    { href: '/member/saved-jobs', label: 'Saved Jobs', icon: Heart },
  ];

  const growthNavItems = [
    { href: '/member/mentorship', label: 'Mentorship', icon: Users },
    { href: '/member/courses', label: 'Courses', icon: GraduationCap },
    { href: '/member/learning-paths', label: 'Learning Paths', icon: BookOpen },
    { href: '/member/skills', label: 'Skills', icon: Sparkles },
    { href: '/member/pathway', label: 'Career Pathway', icon: BookOpen },
    { href: '/member/badges', label: 'Achievements', icon: Award },
  ];

  const communityNavItems = [
    { href: '/connections', label: 'Social Network', icon: Users },
    { href: '/member/mentorship-community', label: 'Mentorship Community', icon: Users },
    { href: '/member/messages', label: 'Messages', icon: MessageSquare },
    { href: '/member/notifications', label: 'Notifications', icon: Bell },
    { href: '/member/wellness', label: 'Wellness', icon: Heart },
    { href: '/events', label: 'Events', icon: Calendar },
  ];

  const businessNavItems = [
    { href: '/business-suite', label: 'Business Suite', icon: Building2 },
    { href: '/grants', label: 'Grants & Funding', icon: PiggyBank },
    { href: '/member/financial-wellness', label: 'Financial Wellness', icon: PiggyBank },
  ];

  const bottomNavItems = [{ href: '/member/setup', label: 'Settings', icon: Settings }];

  const renderNavSection = (items: typeof mainNavItems, title?: string) => (
    <div className="space-y-1">
      {title && (
        <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
        {/* Brand Header */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-gray-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>Ngurra</span>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-white font-medium">
              {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.profile?.firstName
                  ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
                  : 'Member'}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {renderNavSection(mainNavItems)}
          {renderNavSection(growthNavItems, 'Career Growth')}
          {renderNavSection(communityNavItems, 'Community')}
          {renderNavSection(businessNavItems, 'Business & Funding')}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-1">
          {renderNavSection(bottomNavItems)}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Navigation - Mobile & Tablet */}
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
          <div className="px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span>Ngurra</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/member/notifications"
                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <Bell className="w-5 h-5" />
              </Link>
              <Link
                href="/member/messages"
                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen pb-20 lg:pb-0">{children}</main>

        <SafeExit />

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-50 pb-safe">
          <div className="flex justify-around p-2">
            {[
              { href: '/member/dashboard', icon: LayoutDashboard, label: 'Home' },
              { href: '/jobs', icon: Briefcase, label: 'Jobs' },
              { href: '/member/mentorship', icon: Users, label: 'Mentors' },
              { href: '/member/courses', icon: GraduationCap, label: 'Learn' },
              { href: '/member/profile', icon: User, label: 'Profile' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
