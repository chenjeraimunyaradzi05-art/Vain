'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import {
  Calculator, Plus, ArrowLeft, BarChart3, 
  PieChart, FileText, TrendingUp, TrendingDown,
  DollarSign, Calendar, Filter, Download
} from 'lucide-react';

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balance?: number;
};

export default function AccountingPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'reports'>('overview');
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api('/finance/chart');
        if (res.ok) {
          setAccounts(res.data?.accounts || []);
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group accounts by type
  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, ChartAccount[]>);

  const accountTypes = [
    { type: 'ASSET', label: 'Assets', color: '#10B981', icon: TrendingUp },
    { type: 'LIABILITY', label: 'Liabilities', color: '#EF4444', icon: TrendingDown },
    { type: 'EQUITY', label: 'Equity', color: accentPurple, icon: PieChart },
    { type: 'INCOME', label: 'Income', color: '#3B82F6', icon: DollarSign },
    { type: 'EXPENSE', label: 'Expenses', color: '#F59E0B', icon: BarChart3 },
  ];

  const reports = [
    { id: 'profit-loss', name: 'Profit & Loss Statement', description: 'Income vs expenses for a period' },
    { id: 'balance-sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and equity snapshot' },
    { id: 'cash-flow', name: 'Cash Flow Statement', description: 'Track money coming in and going out' },
    { id: 'trial-balance', name: 'Trial Balance', description: 'Verify your books balance' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/business-suite"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentPurple}20` }}
                >
                  <Calculator className="w-6 h-6" style={{ color: accentPurple }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Accounting</h1>
                  <p className="text-white/60">Track income, expenses, and financial health</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button
                className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {['overview', 'accounts', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Quick Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      Total Assets
                    </div>
                    <p className="text-2xl font-bold text-green-400">$0.00</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                      <TrendingDown className="w-4 h-4" />
                      Total Liabilities
                    </div>
                    <p className="text-2xl font-bold text-red-400">$0.00</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                      <DollarSign className="w-4 h-4" />
                      Net Income
                    </div>
                    <p className="text-2xl font-bold text-white">$0.00</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                      <PieChart className="w-4 h-4" />
                      Equity
                    </div>
                    <p className="text-2xl font-bold text-purple-400">$0.00</p>
                  </div>
                </div>

                {/* Account Type Summary */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Accounts by Type</h2>
                  <div className="grid md:grid-cols-5 gap-4">
                    {accountTypes.map(({ type, label, color, icon: Icon }) => (
                      <div
                        key={type}
                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <span className="text-white font-medium">{label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {accountsByType[type]?.length || 0}
                        </p>
                        <p className="text-white/50 text-sm">accounts</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Getting Started */}
                {accounts.length === 0 && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">Get Started with Accounting</h3>
                    <p className="text-white/60 text-sm mb-4">
                      Set up your chart of accounts to start tracking your business finances.
                      We'll help you create standard accounts for Australian businesses.
                    </p>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                    >
                      Create Default Accounts
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Accounts Tab */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                {accountTypes.map(({ type, label, color, icon: Icon }) => (
                  <div key={type} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <h3 className="text-white font-medium">{label}</h3>
                        <span className="text-white/40 text-sm">
                          ({accountsByType[type]?.length || 0})
                        </span>
                      </div>
                      <button className="text-white/60 hover:text-white text-sm flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Account
                      </button>
                    </div>
                    {accountsByType[type]?.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {accountsByType[type].map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-4 hover:bg-white/5">
                            <div>
                              <span className="text-white/40 text-sm mr-3">{account.code}</span>
                              <span className="text-white">{account.name}</span>
                            </div>
                            <span className="text-white/60">${(account.balance || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-white/40 text-center text-sm">No accounts yet</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="grid md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/business-suite/accounting/reports/${report.id}`}
                    className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium mb-1 group-hover:text-purple-400 transition-colors">{report.name}</h3>
                        <p className="text-white/60 text-sm">{report.description}</p>
                      </div>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <BarChart3 className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
