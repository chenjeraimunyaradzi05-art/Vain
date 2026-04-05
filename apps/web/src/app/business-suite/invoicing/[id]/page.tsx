'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import {
  FileText,
  ArrowLeft,
  Send,
  Download,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Plus,
  X,
  Printer,
  Copy,
  ExternalLink,
} from 'lucide-react';

type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientAbn?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  termsAndConditions?: string;
  lineItems: InvoiceLineItem[];
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    reference?: string;
  }>;
  senderBusinessName?: string;
  senderAbn?: string;
  createdAt: string;
  updatedAt: string;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'BANK_TRANSFER',
    reference: '',
    paidAt: new Date().toISOString().split('T')[0],
  });

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await api(`/invoices/${invoiceId}`);
      if (res.ok && res.data?.invoice) {
        setInvoice(res.data.invoice);
      } else {
        router.push('/business-suite/invoicing');
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
      router.push('/business-suite/invoicing');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleSendInvoice = async () => {
    setActionLoading('send');
    try {
      const res = await api(`/invoices/${invoiceId}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchInvoice();
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentForm.amount) return;

    setActionLoading('payment');
    try {
      const res = await api(`/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
          paidAt: new Date(paymentForm.paidAt).toISOString(),
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetchInvoice();
        setShowPaymentModal(false);
        setPaymentForm({
          amount: '',
          method: 'BANK_TRANSFER',
          reference: '',
          paidAt: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;

    setActionLoading('cancel');
    try {
      const res = await api(`/invoices/${invoiceId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchInvoice();
      }
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;

    setActionLoading('delete');
    try {
      const res = await api(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/business-suite/invoicing');
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async () => {
    setActionLoading('duplicate');
    try {
      const res = await api(`/invoices/${invoiceId}/duplicate`, {
        method: 'POST',
      });
      if (res.ok && res.data?.invoice) {
        router.push(`/business-suite/invoicing/${res.data.invoice.id}`);
      }
    } catch (error) {
      console.error('Failed to duplicate invoice:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: invoice?.currency || 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'SENT':
      case 'VIEWED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'DRAFT':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'OVERDUE':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />;
      case 'SENT':
      case 'VIEWED':
        return <Clock className="w-4 h-4" />;
      case 'DRAFT':
        return <Edit2 className="w-4 h-4" />;
      case 'OVERDUE':
        return <AlertCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const totalPaid = invoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const balanceDue = (invoice?.totalAmount || 0) - totalPaid;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!invoice) {
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
                href="/business-suite/invoicing"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#8B5CF620' }}
                >
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{invoice.invoiceNumber}</h1>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                        invoice.status
                      )}`}
                    >
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-white/60">{invoice.clientName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {invoice.status === 'DRAFT' && (
                <>
                  <button
                    onClick={handleSendInvoice}
                    disabled={actionLoading === 'send'}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                  >
                    {actionLoading === 'send' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Invoice
                  </button>
                  <Link
                    href={`/business-suite/invoicing/edit/${invoice.id}`}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Link>
                </>
              )}
              {['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) && (
                <button
                  onClick={() => {
                    setPaymentForm({ ...paymentForm, amount: balanceDue.toString() });
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              <button
                onClick={handleDuplicate}
                disabled={actionLoading === 'duplicate'}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Duplicate Invoice"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Print Invoice"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Preview */}
            <div className="bg-white rounded-xl p-8 shadow-lg">
              {/* Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{invoice.senderBusinessName || 'Your Business Name'}</p>
                  {invoice.senderAbn && (
                    <p className="text-gray-600 text-sm">ABN: {invoice.senderAbn}</p>
                  )}
                </div>
              </div>

              {/* Dates & Client */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Bill To:</p>
                  <p className="font-semibold text-gray-900">{invoice.clientName}</p>
                  {invoice.clientAbn && (
                    <p className="text-gray-600 text-sm">ABN: {invoice.clientAbn}</p>
                  )}
                  {invoice.clientAddress && (
                    <p className="text-gray-600 text-sm mt-1">{invoice.clientAddress}</p>
                  )}
                  {invoice.clientEmail && (
                    <p className="text-gray-600 text-sm">{invoice.clientEmail}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-gray-500 text-sm">Issue Date:</p>
                    <p className="font-medium text-gray-900">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Due Date:</p>
                    <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-left text-gray-500 text-sm font-medium">
                      Description
                    </th>
                    <th className="py-3 text-right text-gray-500 text-sm font-medium">Qty</th>
                    <th className="py-3 text-right text-gray-500 text-sm font-medium">Price</th>
                    <th className="py-3 text-right text-gray-500 text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems?.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-gray-100">
                      <td className="py-4 text-gray-900">{item.description}</td>
                      <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-4 text-right text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-4 text-right text-gray-900 font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">GST (10%)</span>
                    <span className="text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t border-gray-200 mt-2">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900 text-lg">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>
                  {totalPaid > 0 && (
                    <>
                      <div className="flex justify-between py-2 text-green-600">
                        <span>Amount Paid</span>
                        <span>-{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-900">Balance Due</span>
                        <span className="font-bold text-gray-900">{formatCurrency(balanceDue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-gray-500 text-sm mb-2">Notes:</p>
                  <p className="text-gray-700 text-sm">{invoice.notes}</p>
                </div>
              )}

              {/* Terms */}
              {invoice.termsAndConditions && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm mb-2">Terms & Conditions:</p>
                  <p className="text-gray-600 text-xs">{invoice.termsAndConditions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">Invoice Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total Amount</span>
                  <span className="text-white font-medium">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Amount Paid</span>
                  <span className="text-green-400 font-medium">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                  <span className="text-white/60">Balance Due</span>
                  <span
                    className={`font-semibold ${balanceDue > 0 ? 'text-yellow-400' : 'text-green-400'}`}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">Client Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-white/40" />
                  <span className="text-white text-sm">{invoice.clientName}</span>
                </div>
                {invoice.clientEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-white/40" />
                    <a
                      href={`mailto:${invoice.clientEmail}`}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      {invoice.clientEmail}
                    </a>
                  </div>
                )}
                {invoice.clientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-white/40" />
                    <span className="text-white/80 text-sm">{invoice.clientPhone}</span>
                  </div>
                )}
                {invoice.clientAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-white/40 mt-0.5" />
                    <span className="text-white/80 text-sm">{invoice.clientAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4">Payment History</h3>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="bg-white/5 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-green-400 font-medium">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-white/40 text-xs">
                            {payment.method.replace('_', ' ')}
                          </p>
                        </div>
                        <p className="text-white/40 text-xs">{formatDate(payment.paidAt)}</p>
                      </div>
                      {payment.reference && (
                        <p className="text-white/60 text-xs mt-1">Ref: {payment.reference}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                  <button
                    onClick={handleCancelInvoice}
                    disabled={actionLoading === 'cancel'}
                    className="w-full py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Cancel Invoice
                  </button>
                )}
                {invoice.status === 'DRAFT' && (
                  <button
                    onClick={handleDeleteInvoice}
                    disabled={actionLoading === 'delete'}
                    className="w-full py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">Activity</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                  <div>
                    <p className="text-white text-sm">Invoice Created</p>
                    <p className="text-white/40 text-xs">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>
                {invoice.status !== 'DRAFT' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                    <div>
                      <p className="text-white text-sm">Invoice Sent</p>
                      <p className="text-white/40 text-xs">To {invoice.clientEmail}</p>
                    </div>
                  </div>
                )}
                {invoice.status === 'PAID' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                    <div>
                      <p className="text-white text-sm">Payment Received</p>
                      <p className="text-white/40 text-xs">Full amount paid</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Record Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="Transaction reference (optional)"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={!paymentForm.amount || actionLoading === 'payment'}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                {actionLoading === 'payment' && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
