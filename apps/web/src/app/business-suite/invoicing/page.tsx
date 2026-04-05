'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import {
  Receipt, Plus, ArrowLeft, Send, Download,
  Calendar, Filter, MoreVertical, Eye, Trash2,
  Clock, CheckCircle2, XCircle, DollarSign, Users
} from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate?: string;
  createdAt: string;
  paidAt?: string;
};

export default function InvoicingPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'>('all');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  // New invoice form
  const [newInvoice, setNewInvoice] = useState({
    clientName: '',
    clientEmail: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    // Simulate loading - in real app would fetch from API
    const timer = setTimeout(() => {
      setLoading(false);
      // Mock data for demonstration
      setInvoices([]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/20 text-gray-400';
      case 'SENT': return 'bg-blue-500/20 text-blue-400';
      case 'PAID': return 'bg-green-500/20 text-green-400';
      case 'OVERDUE': return 'bg-red-500/20 text-red-400';
      case 'CANCELLED': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-white/10 text-white/60';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return Clock;
      case 'SENT': return Send;
      case 'PAID': return CheckCircle2;
      case 'OVERDUE': return XCircle;
      default: return Receipt;
    }
  };

  const filteredInvoices = activeTab === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === activeTab);

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'DRAFT').length,
    sent: invoices.filter(i => i.status === 'SENT').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    totalValue: invoices.reduce((sum, i) => sum + i.total, 0),
    paidValue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
  };

  const addItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const tax = subtotal * 0.1; // 10% GST
    return { subtotal, tax, total: subtotal + tax };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
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
                  style={{ backgroundColor: `${accentPink}20` }}
                >
                  <Receipt className="w-6 h-6" style={{ color: accentPink }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Invoicing</h1>
                  <p className="text-white/60">Create and manage professional invoices</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNewInvoice(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                  <Receipt className="w-4 h-4" />
                  Total Invoices
                </div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Pending
                </div>
                <p className="text-2xl font-bold text-blue-400">{stats.sent}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Paid
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.paidValue)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-white/60 text-sm">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Overdue
                </div>
                <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['all', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'all' ? 'All Invoices' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Invoices List */}
            {filteredInvoices.length > 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-white/60 text-sm font-medium">
                  <div className="col-span-2">Invoice #</div>
                  <div className="col-span-3">Client</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-white/5">
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = getStatusIcon(invoice.status);
                    return (
                      <Link 
                        key={invoice.id} 
                        href={`/business-suite/invoicing/${invoice.id}`}
                        className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 items-center"
                      >
                        <div className="col-span-2 text-white font-medium">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="col-span-3">
                          <p className="text-white">{invoice.clientName}</p>
                          <p className="text-white/50 text-sm">{invoice.clientEmail}</p>
                        </div>
                        <div className="col-span-2 text-white/60">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            {invoice.status}
                          </span>
                        </div>
                        <div className="col-span-2 text-right font-medium text-white">
                          {formatCurrency(invoice.total)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button 
                            className="p-2 rounded-lg hover:bg-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                  <Receipt className="w-10 h-10 text-white/40" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {activeTab === 'all' ? 'No Invoices Yet' : `No ${activeTab.toLowerCase()} invoices`}
                </h2>
                <p className="text-white/60 mb-6">
                  {activeTab === 'all' 
                    ? 'Create your first invoice to start getting paid for your work.'
                    : 'No invoices match this filter.'}
                </p>
                {activeTab === 'all' && (
                  <button
                    onClick={() => setShowNewInvoice(true)}
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                  >
                    Create Invoice
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 my-8">
            <h2 className="text-xl font-semibold text-white mb-6">Create New Invoice</h2>
            
            <div className="space-y-6">
              {/* Client Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Client Name *</label>
                  <input
                    type="text"
                    placeholder="Business or person name"
                    value={newInvoice.clientName}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">Client Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={newInvoice.clientEmail}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, clientEmail: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Due Date</label>
                <input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                />
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Items</label>
                <div className="space-y-3">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="col-span-6 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="col-span-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="col-span-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                      />
                      <button
                        onClick={() => removeItem(index)}
                        className="col-span-1 flex items-center justify-center text-white/40 hover:text-red-400"
                        disabled={newInvoice.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-3 text-sm text-white/60 hover:text-white flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calculateTotal().subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(calculateTotal().tax)}</span>
                </div>
                <div className="flex justify-between text-white font-semibold text-lg pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal().total)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Notes (optional)</label>
                <textarea
                  placeholder="Payment terms, thank you message, etc."
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewInvoice(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
              >
                Save Draft
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Send className="w-4 h-4" />
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
