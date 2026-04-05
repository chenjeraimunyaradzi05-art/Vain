'use client';

import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import { 
  Bell, 
  User, 
  Shield, 
  CreditCard, 
  Key, 
  Globe, 
  Moon,
  Smartphone,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile Settings',
          description: 'Update your personal information and bio',
          href: user?.userType === 'MEMBER' ? '/member/setup' : 
                user?.userType === 'MENTOR' ? '/mentor/setup' :
                user?.userType === 'COMPANY' ? '/company/setup' : '/member/setup',
          color: 'blue',
        },
        {
          icon: Key,
          label: 'Password & Security',
          description: 'Change password and security settings',
          href: '/settings/security',
          color: 'amber',
        },
        {
          icon: Shield,
          label: 'Privacy & Data',
          description: 'Manage your data and privacy preferences',
          href: '/settings/privacy',
          color: 'purple',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Notification Preferences',
          description: 'Control how you receive updates',
          href: '/settings/notifications',
          color: 'green',
        },
        {
          icon: Smartphone,
          label: 'Mobile Notifications',
          description: 'Manage push notifications on your devices',
          href: '/settings/notifications#push',
          color: 'cyan',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Moon,
          label: 'Appearance',
          description: 'Theme, display, and accessibility options',
          href: '/settings/appearance',
          color: 'slate',
        },
        {
          icon: Globe,
          label: 'Language & Region',
          description: 'Set your language and timezone',
          href: '/settings/language',
          color: 'indigo',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get help with using the platform',
          href: '/help',
          color: 'teal',
        },
        {
          icon: FileText,
          label: 'Terms & Policies',
          description: 'Read our terms of service and policies',
          href: '/privacy',
          color: 'gray',
        },
      ],
    },
  ];

  // Add billing section for companies
  if (user?.userType === 'COMPANY') {
    settingsGroups.splice(1, 0, {
      title: 'Billing',
      items: [
        {
          icon: CreditCard,
          label: 'Subscription & Billing',
          description: 'Manage your subscription and payment methods',
          href: '/company/billing',
          color: 'emerald',
        },
      ],
    });
  }

  // Add payouts section for mentors
  if (user?.userType === 'MENTOR') {
    settingsGroups.splice(1, 0, {
      title: 'Earnings',
      items: [
        {
          icon: CreditCard,
          label: 'Payout Settings',
          description: 'Manage your payout account and earnings',
          href: '/mentor/payouts',
          color: 'emerald',
        },
      ],
    });
  }

  return (
    <div className="ngurra-page p-6">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">
              Account
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Settings</h1>
          <p className="text-slate-500">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Groups */}
        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold text-pink-600 uppercase tracking-[0.15em] mb-3">
                {group.title}
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="p-2.5 rounded-lg bg-pink-50">
                      <item.icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{item.label}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-pink-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <div className="mt-8">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Vantage v1.0.0</p>
          <p className="mt-1">
            © {new Date().getFullYear()} Vantage. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
