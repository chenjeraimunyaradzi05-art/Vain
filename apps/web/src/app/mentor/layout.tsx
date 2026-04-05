'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut, 
  Clock,
  Star,
  TrendingUp,
  MessageSquare,
  Bell,
  Sparkles,
  Wallet,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const mainNavItems = [
    { href: '/mentor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mentor/requests', label: 'Session Requests', icon: UserCheck },
    { href: '/mentor/availability', label: 'Availability', icon: Clock },
    { href: '/mentor/earnings', label: 'Earnings', icon: TrendingUp },
    { href: '/mentor/payouts', label: 'Payouts', icon: Wallet },
  ];

  const communityNavItems = [
    { href: '/member/messages', label: 'Messages', icon: MessageSquare },
    { href: '/member/notifications', label: 'Notifications', icon: Bell },
  ];

  const bottomNavItems = [
    { href: '/mentor/setup', label: 'Settings', icon: Settings },
  ];

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
                ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-500' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/50 border-r border-slate-800 fixed inset-y-0 left-0 z-40">
        {/* Brand Header */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <span>Ngurra <span className="text-slate-400 font-normal text-sm">Mentor</span></span>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-400 font-medium">
              {user?.profile?.firstName?.[0] || user?.email?.[0] || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate flex items-center gap-1">
                {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'Mentor'}
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-xs text-purple-400 truncate">
                Verified Mentor
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">4.9</div>
              <div className="text-xs text-slate-400">Rating</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">128</div>
              <div className="text-xs text-slate-400">Sessions</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {renderNavSection(mainNavItems)}
          {renderNavSection(communityNavItems, 'Communication')}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/member/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Switch to Member View
          </Link>
          {renderNavSection(bottomNavItems)}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Navigation - Mobile & Tablet */}
        <header className="lg:hidden bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <span>Ngurra</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Link 
                href="/member/notifications" 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <Bell className="w-5 h-5" />
              </Link>
              <Link 
                href="/member/messages" 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 pb-safe">
          <div className="flex justify-around p-2">
            {[
              { href: '/mentor/dashboard', icon: LayoutDashboard, label: 'Home' },
              { href: '/mentor/requests', icon: UserCheck, label: 'Requests' },
              { href: '/mentor/availability', icon: Calendar, label: 'Schedule' },
              { href: '/mentor/earnings', icon: DollarSign, label: 'Earnings' },
              { href: '/mentor/setup', icon: Settings, label: 'Settings' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] ${
                    isActive 
                      ? 'text-purple-400' 
                      : 'text-slate-400'
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
