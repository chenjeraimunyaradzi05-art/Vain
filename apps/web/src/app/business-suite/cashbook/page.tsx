'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import {
  DollarSign, Plus, ArrowLeft, TrendingUp, TrendingDown,
  Calendar, Filter, MoreVertical, Edit2, Trash2, Search,
  ChevronDown, BarChart3, ArrowUpRight, ArrowDownRight, ChevronRight
} from 'lucide-react';

type CashbookEntry = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category?: string;
  description?: string;
  occurredAt: string;
};

type Cashbook = {
  id: string;
  name: string;
  currency: string;
  entries?: CashbookEntry[];
};

export default function CashbookPage() {
  const [loading, setLoading] = useState(true);
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [selectedCashbook, setSelectedCashbook] = useState<Cashbook | null>(null);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showNewCashbook, setShowNewCashbook] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New entry form
  const [newEntry, setNewEntry] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    amount: '',
    category: '',
    description: '',
    occurredAt: new Date().toISOString().split('T')[0]
  });
  
  // New cashbook form
  const [newCashbookName, setNewCashbookName] = useState('');

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const fetchCashbooks = useCallback(async () => {
    try {
      const res = await api('/cashbook');
      if (res.ok) {
        const books = res.data?.cashbooks || [];
        setCashbooks(books);
        if (books.length > 0 && !selectedCashbook) {
          setSelectedCashbook(books[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load cashbooks:', error);
    }
  }, [selectedCashbook]);

  const fetchEntries = useCallback(async (cashbookId: string) => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        api(`/cashbook/${cashbookId}/entries`),
        api(`/cashbook/${cashbookId}/summary`)
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
  }, []);

  useEffect(() => {
    fetchCashbooks().then(() => setLoading(false));
  }, [fetchCashbooks]);

  useEffect(() => {
    if (selectedCashbook?.id) {
      fetchEntries(selectedCashbook.id);
    }
  }, [selectedCashbook, fetchEntries]);

  const handleCreateCashbook = async () => {
    if (!newCashbookName.trim()) return;
    
    try {
      const res = await api('/cashbook', {
        method: 'POST',
        body: JSON.stringify({ name: newCashbookName }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        await fetchCashbooks();
        setNewCashbookName('');
        setShowNewCashbook(false);
      }
    } catch (error) {
      console.error('Failed to create cashbook:', error);
    }
  };

  const handleCreateEntry = async () => {
    if (!selectedCashbook || !newEntry.amount) return;
    
    try {
      const res = await api(`/cashbook/${selectedCashbook.id}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          ...newEntry,
          amount: parseFloat(newEntry.amount),
          occurredAt: new Date(newEntry.occurredAt).toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        await fetchEntries(selectedCashbook.id);
        setNewEntry({
          type: 'INCOME',
          amount: '',
          category: '',
          description: '',
          occurredAt: new Date().toISOString().split('T')[0]
        });
        setShowNewEntry(false);
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (filterType !== 'all' && entry.type !== filterType) return false;
    if (searchQuery && !entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !entry.category?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: selectedCashbook?.currency || 'AUD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
                  style={{ backgroundColor: '#10B98120' }}
                >
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Cashbook</h1>
                  <p className="text-white/60">Track your business cash flow</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cashbooks.length > 0 && (
                <select
                  value={selectedCashbook?.id || ''}
                  onChange={(e) => {
                    const book = cashbooks.find(b => b.id === e.target.value);
                    setSelectedCashbook(book || null);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                >
                  {cashbooks.map(book => (
                    <option key={book.id} value={book.id}>{book.name}</option>
                  ))}
                </select>
              )}
              {selectedCashbook && (
                <Link
                  href={`/business-suite/cashbook/${selectedCashbook.id}`}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  View Details
                </Link>
              )}
              <button
                onClick={() => setShowNewCashbook(true)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10"
              >
                New Book
              </button>
              <button
                onClick={() => setShowNewEntry(true)}
                disabled={!selectedCashbook}
                className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : cashbooks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <DollarSign className="w-10 h-10 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Cashbooks Yet</h2>
            <p className="text-white/60 mb-6">Create your first cashbook to start tracking your business finances.</p>
            <button
              onClick={() => setShowNewCashbook(true)}
              className="px-6 py-3 rounded-lg text-white font-medium"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              Create Cashbook
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Total Income
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(summary.totals?.income || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Total Expenses
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(summary.totals?.expense || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                    <BarChart3 className="w-4 h-4" />
                    Net Position
                  </div>
                  <p className={`text-2xl font-bold ${(summary.totals?.net || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.totals?.net || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                    <Calendar className="w-4 h-4" />
                    Entries
                  </div>
                  <p className="text-2xl font-bold text-white">{summary.count || 0}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                {(['all', 'INCOME', 'EXPENSE'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      filterType === type 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'INCOME' ? 'Income' : 'Expenses'}
                  </button>
                ))}
              </div>
            </div>

            {/* Entries List */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-white/60 text-sm font-medium">
                <div className="col-span-3">Date</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {filteredEntries.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 items-center">
                      <div className="col-span-3 text-white/80">
                        {formatDate(entry.occurredAt)}
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          entry.type === 'INCOME' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {entry.type === 'INCOME' 
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />
                          }
                          {entry.type}
                        </span>
                      </div>
                      <div className="col-span-2 text-white/60">{entry.category || '—'}</div>
                      <div className="col-span-3 text-white/80">{entry.description || '—'}</div>
                      <div className={`col-span-2 text-right font-medium ${
                        entry.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.type === 'INCOME' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-white/40">
                  {searchQuery || filterType !== 'all' 
                    ? 'No entries match your filters'
                    : 'No entries yet. Click "Add Entry" to get started.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New Cashbook Modal */}
      {showNewCashbook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Cashbook</h2>
            <input
              type="text"
              placeholder="Cashbook name"
              value={newCashbookName}
              onChange={(e) => setNewCashbookName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewCashbook(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCashbook}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Add Entry</h2>
            
            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                <button
                  onClick={() => setNewEntry(prev => ({ ...prev, type: 'INCOME' }))}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    newEntry.type === 'INCOME' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'text-white/60'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => setNewEntry(prev => ({ ...prev, type: 'EXPENSE' }))}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    newEntry.type === 'EXPENSE' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'text-white/60'
                  }`}
                >
                  Expense
                </button>
              </div>
              
              <input
                type="number"
                placeholder="Amount"
                value={newEntry.amount}
                onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
              />
              
              <input
                type="text"
                placeholder="Category (e.g., Sales, Rent, Utilities)"
                value={newEntry.category}
                onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
              />
              
              <input
                type="text"
                placeholder="Description"
                value={newEntry.description}
                onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
              />
              
              <input
                type="date"
                value={newEntry.occurredAt}
                onChange={(e) => setNewEntry(prev => ({ ...prev, occurredAt: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewEntry(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEntry}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
