'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * BillingSubscription - Billing and subscription management
 * 
 * Features:
 * - Subscription plans
 * - Payment methods
 * - Billing history
 * - Invoices
 */

interface Subscription {
  id: string;
  plan: 'free' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
}

interface UsageStats {
  jobPostings: { used: number; limit: number };
  applications: { used: number; limit: number };
  messages: { used: number; limit: number };
  storage: { used: number; limit: number };
}

// API functions
const billingApi = {
  async getSubscription(): Promise<Subscription> {
    const res = await fetch('/api/billing/subscription', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch subscription');
    return res.json();
  },

  async getPlans(): Promise<Plan[]> {
    const res = await fetch('/api/billing/plans', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch plans');
    return res.json();
  },

  async changePlan(planId: string): Promise<void> {
    const res = await fetch('/api/billing/subscription', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) throw new Error('Failed to change plan');
  },

  async cancelSubscription(): Promise<void> {
    const res = await fetch('/api/billing/subscription/cancel', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to cancel subscription');
  },

  async resumeSubscription(): Promise<void> {
    const res = await fetch('/api/billing/subscription/resume', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to resume subscription');
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await fetch('/api/billing/payment-methods', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch payment methods');
    return res.json();
  },

  async addPaymentMethod(token: string): Promise<PaymentMethod> {
    const res = await fetch('/api/billing/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('Failed to add payment method');
    return res.json();
  },

  async removePaymentMethod(id: string): Promise<void> {
    const res = await fetch(`/api/billing/payment-methods/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove payment method');
  },

  async setDefaultPaymentMethod(id: string): Promise<void> {
    const res = await fetch(`/api/billing/payment-methods/${id}/default`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to set default');
  },

  async getInvoices(): Promise<Invoice[]> {
    const res = await fetch('/api/billing/invoices', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  async getUsage(): Promise<UsageStats> {
    const res = await fetch('/api/billing/usage', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch usage');
    return res.json();
  },
};

// Plan Card
function PlanCard({
  plan,
  current,
  onSelect,
}: {
  plan: Plan;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl border-2 p-6 ${
        current
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : plan.popular
          ? 'border-purple-500'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          ${plan.price}
        </span>
        <span className="text-gray-500">/{plan.interval}</span>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onSelect}
        variant={current ? 'outline' : 'primary'}
        className="w-full"
        disabled={current}
      >
        {current ? 'Current Plan' : 'Select Plan'}
      </Button>
    </div>
  );
}

// Current Subscription
function CurrentSubscription({
  subscription,
  onCancel,
  onResume,
}: {
  subscription: Subscription;
  onCancel: () => void;
  onResume: () => void;
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-700',
    past_due: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  const planNames = {
    free: 'Free',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {planNames[subscription.plan]} Plan
          </h3>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${statusColors[subscription.status]}`}>
            {subscription.status === 'trialing' ? 'Trial' : subscription.status.replace('_', ' ')}
          </span>
        </div>
        <span className="text-2xl">
          {subscription.plan === 'free' ? '🆓' : subscription.plan === 'professional' ? '⭐' : '🏆'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <p>
          Current period: {new Date(subscription.currentPeriodStart).toLocaleDateString('en-AU')} -{' '}
          {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU')}
        </p>
        {subscription.trialEnd && (
          <p className="text-blue-600">
            Trial ends: {new Date(subscription.trialEnd).toLocaleDateString('en-AU')}
          </p>
        )}
        {subscription.cancelAtPeriodEnd && (
          <p className="text-red-600">
            Subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU')}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {subscription.cancelAtPeriodEnd ? (
          <Button variant="primary" onClick={onResume}>
            Resume Subscription
          </Button>
        ) : (
          subscription.plan !== 'free' && (
            <Button variant="outline" onClick={onCancel}>
              Cancel Subscription
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// Payment Methods
function PaymentMethods({
  methods,
  onAdd,
  onRemove,
  onSetDefault,
}: {
  methods: PaymentMethod[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const brandIcons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    bank: '🏦',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          + Add Method
        </Button>
      </div>

      {methods.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No payment methods added</p>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{brandIcons[method.brand || method.type]}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {method.brand ? method.brand.toUpperCase() : 'Bank Account'} ••••{method.last4}
                  </p>
                  {method.expiryMonth && (
                    <p className="text-sm text-gray-500">
                      Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </p>
                  )}
                </div>
                {method.isDefault && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!method.isDefault && (
                  <button
                    onClick={() => onSetDefault(method.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => onRemove(method.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Billing History
function BillingHistory({ invoices }: { invoices: Invoice[] }) {
  const statusColors = {
    paid: 'text-green-600',
    pending: 'text-yellow-600',
    failed: 'text-red-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing History</h3>

      {invoices.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No invoices yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3">Invoice</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-0">
                  <td className="py-3 text-gray-900 dark:text-white">{invoice.number}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">
                    {new Date(invoice.date).toLocaleDateString('en-AU')}
                  </td>
                  <td className="py-3 text-gray-900 dark:text-white">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className={`py-3 capitalize ${statusColors[invoice.status]}`}>
                    {invoice.status}
                  </td>
                  <td className="py-3">
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Usage Overview
function UsageOverview({ usage }: { usage: UsageStats }) {
  const categories = [
    { key: 'jobPostings', label: 'Job Postings', icon: '📋' },
    { key: 'applications', label: 'Applications', icon: '📝' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'storage', label: 'Storage (MB)', icon: '💾' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage This Month</h3>

      <div className="grid md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const data = usage[cat.key as keyof UsageStats];
          const percentage = (data.used / data.limit) * 100;

          return (
            <div key={cat.key} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{cat.label}</span>
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.used} / {data.limit === -1 ? '∞' : data.limit}
                </span>
              </div>
              {data.limit !== -1 && (
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Add Payment Modal
function AddPaymentModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (token: string) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, use Stripe Elements or similar
    onAdd('tok_' + Date.now());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Add Payment Method
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              placeholder="Name on card"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              placeholder="1234 5678 9012 3456"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                placeholder="MM/YY"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CVC
              </label>
              <input
                type="text"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Card
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Cancel Modal
function CancelModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Cancel Subscription
        </h3>
        <p className="text-gray-500 mb-6">
          We're sorry to see you go. Your subscription will remain active until the end of the current billing period.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tell us why you're leaving (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            rows={3}
            placeholder="Your feedback helps us improve..."
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Keep Subscription
          </Button>
          <Button variant="primary" onClick={onConfirm} className="flex-1 !bg-red-500 hover:!bg-red-600">
            Cancel Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function BillingSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'payment' | 'history'>('overview');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sub, plansData, methods, inv, usageData] = await Promise.all([
        billingApi.getSubscription(),
        billingApi.getPlans(),
        billingApi.getPaymentMethods(),
        billingApi.getInvoices(),
        billingApi.getUsage(),
      ]);
      setSubscription(sub);
      setPlans(plansData);
      setPaymentMethods(methods);
      setInvoices(inv);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPayment = async (token: string) => {
    try {
      await billingApi.addPaymentMethod(token);
      setShowAddPayment(false);
      loadData();
    } catch (error) {
      console.error('Failed to add payment method:', error);
    }
  };

  const handleRemovePayment = async (id: string) => {
    if (!confirm('Remove this payment method?')) return;
    try {
      await billingApi.removePaymentMethod(id);
      loadData();
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await billingApi.setDefaultPaymentMethod(id);
      loadData();
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await billingApi.cancelSubscription();
      setShowCancelModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await billingApi.resumeSubscription();
      loadData();
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  const handleChangePlan = async (planId: string) => {
    try {
      await billingApi.changePlan(planId);
      loadData();
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
  };

  if (isLoading || !subscription) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billing & Subscription</h1>
      <p className="text-gray-500 mb-8">Manage your subscription and payment details</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'plans', label: 'Plans', icon: '📋' },
          { key: 'payment', label: 'Payment', icon: '💳' },
          { key: 'history', label: 'History', icon: '📜' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <CurrentSubscription
            subscription={subscription}
            onCancel={() => setShowCancelModal(true)}
            onResume={handleResumeSubscription}
          />
          {usage && <UsageOverview usage={usage} />}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={subscription.plan === plan.id}
              onSelect={() => handleChangePlan(plan.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'payment' && (
        <PaymentMethods
          methods={paymentMethods}
          onAdd={() => setShowAddPayment(true)}
          onRemove={handleRemovePayment}
          onSetDefault={handleSetDefault}
        />
      )}

      {activeTab === 'history' && <BillingHistory invoices={invoices} />}

      <AddPaymentModal
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        onAdd={handleAddPayment}
      />

      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
      />
    </div>
  );
}

export default BillingSubscription;
