'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { 
  Building2, Calculator, Receipt, TrendingUp, 
  FileText, DollarSign, BarChart3, CreditCard,
  ArrowRight, Plus, ChevronRight, Briefcase
} from 'lucide-react';

export default function BusinessSuitePage() {
  const [loading, setLoading] = useState(true);
  const [cashbooks, setCashbooks] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch cashbooks
        const cashbookRes = await api('/cashbook');
        if (cashbookRes.ok) {
          setCashbooks(cashbookRes.data?.cashbooks || []);
        }
      } catch (error) {
        console.error('Failed to load business data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const suiteModules = [
    {
      id: 'accounting',
      title: 'Accounting',
      description: 'Track income, expenses, and financial health',
      icon: Calculator,
      href: '/business-suite/accounting',
      color: accentPurple,
      features: ['Chart of Accounts', 'Journal Entries', 'Financial Reports']
    },
    {
      id: 'cashbook',
      title: 'Cashbook',
      description: 'Simple cash flow tracking for your business',
      icon: DollarSign,
      href: '/business-suite/cashbook',
      color: '#10B981',
      features: ['Income Tracking', 'Expense Tracking', 'Monthly Summaries']
    },
    {
      id: 'invoicing',
      title: 'Invoicing',
      description: 'Create and manage professional invoices',
      icon: Receipt,
      href: '/business-suite/invoicing',
      color: accentPink,
      features: ['Custom Invoices', 'Payment Tracking', 'Client Management']
    },
    {
      id: 'business-planning',
      title: 'Business Formation',
      description: 'Start and structure your business the right way',
      icon: Building2,
      href: '/business/plan-builder',
      color: '#F59E0B',
      features: ['Structure Wizard', 'ABN Registration', 'Compliance Checklist']
    }
  ];

  const quickStats = [
    { label: 'Active Cashbooks', value: cashbooks.length, icon: DollarSign },
    { label: 'This Month Income', value: '$0', icon: TrendingUp },
    { label: 'This Month Expenses', value: '$0', icon: CreditCard },
    { label: 'Net Position', value: '$0', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Business Suite</h1>
                <p className="text-white/60">Manage your business finances and operations</p>
              </div>
            </div>
            <Link
              href="/business/plan-builder"
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              <Plus className="w-4 h-4" />
              Start a Business
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className="w-5 h-5 text-white/60" />
                <span className="text-white/60 text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Suite Modules */}
        <h2 className="text-xl font-semibold text-white mb-4">Business Tools</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {suiteModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="group bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${module.color}20` }}
                >
                  <module.icon className="w-6 h-6" style={{ color: module.color }} />
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
              <p className="text-white/60 text-sm mb-4">{module.description}</p>
              <div className="flex flex-wrap gap-2">
                {module.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/80"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Active Cashbooks Section */}
        {cashbooks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Cashbooks</h2>
              <Link
                href="/business-suite/cashbook"
                className="text-sm text-white/60 hover:text-white flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {cashbooks.slice(0, 3).map((cashbook: any) => (
                <Link
                  key={cashbook.id}
                  href={`/business-suite/cashbook/${cashbook.id}`}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
                >
                  <h3 className="text-white font-medium mb-1">{cashbook.name}</h3>
                  <p className="text-white/50 text-sm">{cashbook.currency || 'AUD'}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Getting Started Section */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">New to Business?</h3>
              <p className="text-white/60 text-sm mb-4">
                Our Business Formation wizard helps you choose the right structure, 
                understand compliance requirements, and plan your startup costs.
              </p>
              <Link
                href="/business/plan-builder"
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:underline"
                style={{ color: accentPink }}
              >
                Start Planning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
