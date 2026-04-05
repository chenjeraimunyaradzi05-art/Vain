'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import {
  DollarSign,
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Edit2,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  X,
  Settings,
} from 'lucide-react';

type CashbookEntry = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
  occurredAt: string;
};

type Cashbook = {
  id: string;
  name: string;
  currency: string;
  entries?: CashbookEntry[];
  createdAt: string;
};

type Summary = {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  currency: string;
  entryCount: number;
  byCategory?: Record<string, { income: number; expenses: number }>;
};

export default function CashbookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cashbookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [cashbook, setCashbook] = useState<Cashbook | null>(null);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<CashbookEntry | null>(null);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    amount: '',
    category: '',
    description: '',
    occurredAt: new Date().toISOString().split('T')[0],
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    currency: 'AUD',
  });

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const fetchCashbook = useCallback(async () => {
    try {
      const res = await api(`/cashbook/${cashbookId}`);
      if (res.ok && res.data?.cashbook) {
        setCashbook(res.data.cashbook);
        setSettingsForm({
          name: res.data.cashbook.name,
          currency: res.data.cashbook.currency || 'AUD',
        });
      } else {
        router.push('/business-suite/cashbook');
      }
    } catch (error) {
      console.error('Failed to load cashbook:', error);
      router.push('/business-suite/cashbook');
    }
  }, [cashbookId, router]);

  const fetchEntries = useCallback(async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        api(`/cashbook/${cashbookId}/entries`),
        api(`/cashbook/${cashbookId}/summary`),
      ]);

      if (entriesRes.ok) {
        setEntries(entriesRes.data?.entries || []);
      }
      if (summaryRes.ok) {
        setSummary(summaryRes.data);
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  }, [cashbookId]);

  useEffect(() => {
    const loadData = async () => {
      await fetchCashbook();
      await fetchEntries();
      setLoading(false);
    };
    loadData();
  }, [fetchCashbook, fetchEntries]);

  const handleCreateEntry = async () => {
    if (!newEntry.amount) return;

    try {
      const res = await api(`/cashbook/${cashbookId}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          ...newEntry,
          amount: parseFloat(newEntry.amount),
          occurredAt: new Date(newEntry.occurredAt).toISOString(),
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetchEntries();
        setNewEntry({
          type: 'INCOME',
          amount: '',
          category: '',
          description: '',
          occurredAt: new Date().toISOString().split('T')[0],
        });
        setShowNewEntry(false);
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const res = await api(`/cashbook/${cashbookId}/entries/${editingEntry.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          type: editingEntry.type,
          amount: editingEntry.amount,
          category: editingEntry.category,
          description: editingEntry.description,
          occurredAt: editingEntry.occurredAt,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetchEntries();
        setEditingEntry(null);
      }
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const res = await api(`/cashbook/${cashbookId}/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchEntries();
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleUpdateCashbook = async () => {
    try {
      const res = await api(`/cashbook/${cashbookId}`, {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetchCashbook();
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Failed to update cashbook:', error);
    }
  };

  const handleDeleteCashbook = async () => {
    if (!confirm('Are you sure you want to delete this cashbook and all its entries?')) return;

    try {
      const res = await api(`/cashbook/${cashbookId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/business-suite/cashbook');
      }
    } catch (error) {
      console.error('Failed to delete cashbook:', error);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filterType !== 'all' && entry.type !== filterType) return false;
    if (
      searchQuery &&
      !entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !entry.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: cashbook?.currency || 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const incomeCategories = ['Sales', 'Services', 'Interest', 'Refunds', 'Other Income'];
  const expenseCategories = [
    'Office Supplies',
    'Travel',
    'Marketing',
    'Software',
    'Utilities',
    'Rent',
    'Insurance',
    'Professional Services',
    'Other Expense',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!cashbook) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/business-suite/cashbook"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#10B98120' }}
                >
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{cashbook.name}</h1>
                  <p className="text-white/60">
                    {cashbook.currency} • Created {formatDate(cashbook.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Settings className="w-5 h-5 text-white/60" />
              </button>
              <button
                onClick={() => setShowNewEntry(true)}
                className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Total Income
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(summary?.totalIncome || 0)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Total Expenses
            </div>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(summary?.totalExpenses || 0)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
              <DollarSign className="w-4 h-4" />
              Net Position
            </div>
            <p
              className={`text-2xl font-bold ${
                (summary?.netPosition || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(summary?.netPosition || 0)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
              <Calendar className="w-4 h-4" />
              Total Entries
            </div>
            <p className="text-2xl font-bold text-white">{summary?.entryCount || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'INCOME', 'EXPENSE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {type === 'all' ? 'All' : type === 'INCOME' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No entries yet</h3>
              <p className="text-white/60 text-sm mb-4">
                Start tracking your cash flow by adding income and expenses.
              </p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Add First Entry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        entry.type === 'INCOME' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      {entry.type === 'INCOME' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {entry.description || entry.category || 'No description'}
                      </p>
                      <p className="text-white/40 text-sm">
                        {entry.category && <span>{entry.category} • </span>}
                        {formatDate(entry.occurredAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-lg font-semibold ${
                        entry.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {entry.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Entry</h2>
              <button
                onClick={() => setShowNewEntry(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewEntry({ ...newEntry, type: 'INCOME', category: '' })}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    newEntry.type === 'INCOME'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Income
                </button>
                <button
                  onClick={() => setNewEntry({ ...newEntry, type: 'EXPENSE', category: '' })}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    newEntry.type === 'EXPENSE'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Expense
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Category</label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                >
                  <option value="">Select a category</option>
                  {(newEntry.type === 'INCOME' ? incomeCategories : expenseCategories).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Date *</label>
                <input
                  type="date"
                  value={newEntry.occurredAt}
                  onChange={(e) => setNewEntry({ ...newEntry, occurredAt: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewEntry(false)}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEntry}
                disabled={!newEntry.amount}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Entry</h2>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setEditingEntry({ ...editingEntry, type: 'INCOME', category: '' })
                  }
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    editingEntry.type === 'INCOME'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() =>
                    setEditingEntry({ ...editingEntry, type: 'EXPENSE', category: '' })
                  }
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    editingEntry.type === 'EXPENSE'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  Expense
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  value={editingEntry.amount}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Category</label>
                <select
                  value={editingEntry.category || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                >
                  <option value="">Select a category</option>
                  {(editingEntry.type === 'INCOME' ? incomeCategories : expenseCategories).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={editingEntry.description || ''}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, description: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingEntry(null)}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEntry}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Cashbook Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Currency</label>
                <select
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                >
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDeleteCashbook}
                className="px-4 py-3 rounded-lg font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCashbook}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
