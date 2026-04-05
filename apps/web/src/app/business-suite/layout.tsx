'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  BookOpen,
  FileText,
  DollarSign,
  Calculator,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';

type BusinessSuiteLayoutProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: '/business-suite',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/business-suite/accounting',
    label: 'Accounting',
    icon: Calculator,
  },
  {
    href: '/business-suite/cashbook',
    label: 'Cashbook',
    icon: DollarSign,
  },
  {
    href: '/business-suite/invoicing',
    label: 'Invoicing',
    icon: FileText,
  },
  {
    href: '/business/plan-builder',
    label: 'Business Formation',
    icon: Briefcase,
  },
];

export default function BusinessSuiteLayout({ children }: BusinessSuiteLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Top Navigation */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Business Suite</h1>
                <p className="text-xs text-white/40">Manage your business finances</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Back to Dashboard */}
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors"
            >
              Back to Dashboard
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b border-white/10 bg-black/20 overflow-x-auto">
        <div className="flex items-center px-4 py-2 gap-2 min-w-max">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              Business Suite • Part of Ngurra Pathways
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/help/business-suite"
                className="text-white/40 hover:text-white transition-colors"
              >
                Help & Support
              </Link>
              <Link
                href="/business/resources"
                className="text-white/40 hover:text-white transition-colors"
              >
                Resources
              </Link>
              <Link
                href="/settings"
                className="text-white/40 hover:text-white transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
