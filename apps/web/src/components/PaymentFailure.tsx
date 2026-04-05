'use client';

/**
 * Payment Failure UI Components
 * 
 * Handles failed payment notifications, retry flows, and billing portal access.
 */

import { useState } from 'react';
import { 
  AlertTriangle, 
  CreditCard, 
  RefreshCw, 
  ExternalLink,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface PaymentFailure {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  failedAt: string;
  reason: string;
  retryCount: number;
  nextRetryAt?: string;
  lastFour?: string;
  cardBrand?: string;
}

interface PaymentFailureBannerProps {
  failure: PaymentFailure;
  onDismiss?: () => void;
  onRetry?: () => void;
  onUpdatePayment?: () => void;
}

/**
 * Payment Failure Banner
 * Displayed at the top of the page when there's a failed payment
 */
export function PaymentFailureBanner({ 
  failure, 
  onDismiss, 
  onRetry, 
  onUpdatePayment 
}: PaymentFailureBannerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);
  const { showToast } = useUIStore();

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const { ok, data } = await api<{ success: boolean }>('/subscriptions/retry-payment', {
        method: 'POST',
        body: { invoiceId: failure.invoiceId },
      });

      if (ok && data?.success) {
        setRetrySuccess(true);
        showToast({
          type: 'success',
          title: 'Payment Successful',
          message: 'Your payment has been processed successfully.',
        });
        onRetry?.();
      } else {
        showToast({
          type: 'error',
          title: 'Payment Failed',
          message: 'Unable to process payment. Please update your payment method.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (retrySuccess) {
    return (
      <div className="bg-green-900/50 border-b border-green-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-200">Payment successful! Your subscription is now active.</span>
          </div>
          <button onClick={onDismiss} className="text-green-400 hover:text-green-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/50 border-b border-red-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 font-medium">
              Payment of {formatAmount(failure.amount, failure.currency)} failed
            </p>
            <p className="text-red-300/80 text-sm mt-0.5">
              {failure.lastFour 
                ? `Card ending in ${failure.lastFour} was declined. `
                : 'Your payment method was declined. '}
              {failure.nextRetryAt && (
                <span>Next retry: {new Date(failure.nextRetryAt).toLocaleDateString()}</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Retry Payment
          </button>
          <button
            onClick={onUpdatePayment}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Update Card
          </button>
          {onDismiss && (
            <button 
              onClick={onDismiss} 
              className="p-2 text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PaymentFailureModalProps {
  failure: PaymentFailure;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Payment Failure Modal
 * Detailed modal for handling payment failures
 */
export function PaymentFailureModal({ 
  failure, 
  isOpen, 
  onClose,
  onSuccess 
}: PaymentFailureModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useUIStore();

  if (!isOpen) return null;

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const { ok, data } = await api<{ success: boolean }>('/subscriptions/retry-payment', {
        method: 'POST',
        body: { invoiceId: failure.invoiceId },
      });

      if (ok && data?.success) {
        showToast({
          type: 'success',
          title: 'Payment Successful',
          message: 'Your payment has been processed.',
        });
        onSuccess?.();
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Payment Failed Again',
          message: 'Please update your payment method.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong.',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUpdatePayment = async () => {
    setIsUpdating(true);
    try {
      const { ok, data } = await api<{ url: string }>('/subscriptions/billing-portal', {
        method: 'POST',
      });

      if (ok && data?.url) {
        window.location.href = data.url;
      } else {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Unable to open billing portal.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getFailureReason = (reason: string) => {
    const reasons: Record<string, string> = {
      'card_declined': 'Your card was declined by your bank.',
      'insufficient_funds': 'Insufficient funds in your account.',
      'expired_card': 'Your card has expired.',
      'incorrect_cvc': 'The security code (CVC) is incorrect.',
      'processing_error': 'A processing error occurred.',
      'authentication_required': '3D Secure authentication is required.',
    };
    return reasons[reason] || 'Your payment could not be processed.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Payment Failed</h2>
                <p className="text-sm text-slate-400">
                  {formatAmount(failure.amount, failure.currency)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Failure Reason */}
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <p className="text-red-200 text-sm">{getFailureReason(failure.reason)}</p>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            {failure.lastFour && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Card</span>
                <span className="text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {failure.cardBrand || 'Card'} •••• {failure.lastFour}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Failed On</span>
              <span className="text-white">
                {new Date(failure.failedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Retry Attempts</span>
              <span className="text-white">{failure.retryCount} of 3</span>
            </div>
            {failure.nextRetryAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Next Retry</span>
                <span className="text-white flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(failure.nextRetryAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 text-sm text-slate-400 bg-slate-700/50 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p>
              Your subscription will be downgraded to Free if payment continues to fail after 3 retry attempts.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-700 space-y-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Retry Payment Now
          </button>
          
          <button
            onClick={handleUpdatePayment}
            disabled={isUpdating}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUpdating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <CreditCard className="w-5 h-5" />
            )}
            Update Payment Method
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-white font-medium"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}

interface PaymentHistoryItemProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending' | 'refunded';
    createdAt: string;
    description?: string;
    invoiceUrl?: string;
    failureReason?: string;
  };
  onRetry?: (paymentId: string) => void;
}

/**
 * Payment History Item
 * Individual payment item in the payment history list
 */
export function PaymentHistoryItem({ payment, onRetry }: PaymentHistoryItemProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const statusConfig = {
    succeeded: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-900/20',
      label: 'Paid',
    },
    failed: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      label: 'Failed',
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/20',
      label: 'Pending',
    },
    refunded: {
      icon: RefreshCw,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      label: 'Refunded',
    },
  };

  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <p className="font-medium text-white">
            {payment.description || 'Subscription Payment'}
          </p>
          <p className="text-sm text-slate-400">
            {new Date(payment.createdAt).toLocaleDateString('en-AU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {payment.status === 'failed' && payment.failureReason && (
            <p className="text-sm text-red-400 mt-1">{payment.failureReason}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium text-white">
            {formatAmount(payment.amount, payment.currency)}
          </p>
          <span className={`text-xs ${config.color}`}>{config.label}</span>
        </div>

        {payment.status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(payment.id)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}

        {payment.invoiceUrl && (
          <a
            href={payment.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        )}

        <ChevronRight className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}

/**
 * Hook to check for payment failures
 */
export function usePaymentFailure() {
  const [failure, setFailure] = useState<PaymentFailure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkPaymentStatus = async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await api<{ failure: PaymentFailure | null }>('/subscriptions/payment-status');
      if (ok) {
        setFailure(data?.failure || null);
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    failure,
    isLoading,
    checkPaymentStatus,
    clearFailure: () => setFailure(null),
  };
}
