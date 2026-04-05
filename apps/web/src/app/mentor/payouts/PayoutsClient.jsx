'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useAuth from '../../../hooks/useAuth';
import { 
  DollarSign, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ArrowLeft,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react';

const API_URL = API_BASE;

export default function PayoutsClient() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Check for setup completion from URL params
  const setupComplete = searchParams.get('setup') === 'complete';
  const setupRefresh = searchParams.get('setup') === 'refresh';

  useEffect(() => {
    if (setupComplete) {
      setMessage({ type: 'success', text: 'Payout account setup complete! You can now receive payments.' });
    } else if (setupRefresh) {
      setMessage({ type: 'info', text: 'Your setup session expired. Please try again.' });
    }
  }, [setupComplete, setupRefresh]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [statusRes, balanceRes, historyRes, ratesRes] = await Promise.all([
        fetch(`${API_URL}/mentor-payouts/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/mentor-payouts/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/mentor-payouts/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/mentor-payouts/rates`),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (balanceRes.ok) setBalance(await balanceRes.json());
      if (historyRes.ok) setHistory((await historyRes.json()).earnings || []);
      if (ratesRes.ok) setRates(await ratesRes.json());
    } catch (err) {
      console.error('Failed to load payout data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupPayouts() {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/mentor-payouts/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/mentor/payouts?setup=complete`,
          refreshUrl: `${window.location.origin}/mentor/payouts?setup=refresh`,
        }),
      });

      if (!res.ok) throw new Error('Setup failed');
      const data = await res.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start payout setup. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function openDashboard() {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/mentor-payouts/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to get dashboard link');
      const data = await res.json();
      
      window.open(data.dashboardUrl, '_blank');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to open dashboard. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-800 rounded" />
            <div className="h-64 bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/mentor/dashboard" 
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payout Settings</h1>
            <p className="text-slate-400">Manage your earnings and payment settings</p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-900/30 border border-green-800 text-green-300' :
            message.type === 'error' ? 'bg-red-900/30 border border-red-800 text-red-300' :
            'bg-blue-900/30 border border-blue-800 text-blue-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Payout Account Status */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Payout Account
            </h2>
            <button 
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {!status?.connected ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Set up your payout account</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Connect your bank account to receive payments for completed mentorship sessions.
                We use Stripe for secure, fast payouts.
              </p>
              <button
                onClick={handleSetupPayouts}
                disabled={actionLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Set Up Payouts
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  status.payoutsEnabled ? 'bg-green-900/30' : 'bg-yellow-900/30'
                }`}>
                  {status.payoutsEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {status.payoutsEnabled ? 'Payouts Enabled' : 'Setup In Progress'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {status.payoutsEnabled 
                      ? 'Your account is ready to receive payments'
                      : 'Complete your account setup to enable payouts'
                    }
                  </div>
                </div>
              </div>

              {!status.detailsSubmitted && (
                <button
                  onClick={handleSetupPayouts}
                  disabled={actionLoading}
                  className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-medium"
                >
                  Complete Setup
                </button>
              )}

              {status.payoutsEnabled && (
                <button
                  onClick={openDashboard}
                  disabled={actionLoading}
                  className="w-full py-3 border border-slate-600 hover:bg-slate-700 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Stripe Dashboard
                </button>
              )}
            </div>
          )}
        </div>

        {/* Balance & Rate Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Balance */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Earnings Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Earned</span>
                <span className="text-2xl font-bold text-green-400">
                  ${balance?.platformEarnings?.total?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sessions Completed</span>
                <span className="text-lg font-medium">
                  {balance?.platformEarnings?.sessionCount || 0}
                </span>
              </div>
              {balance?.stripeBalance && (
                <>
                  <hr className="border-slate-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Available for Payout</span>
                    <span className="font-medium text-green-400">
                      ${((balance.stripeBalance.available?.[0]?.amount || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pending</span>
                    <span className="font-medium">
                      ${((balance.stripeBalance.pending?.[0]?.amount || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rate Info */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              Session Rates
            </h3>
            {rates && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Session Rate</span>
                  <span className="text-lg font-medium">
                    ${rates.sessionRateDollars?.toFixed(2)} AUD
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Platform Fee</span>
                  <span className="text-slate-300">
                    {rates.platformFeePercent}%
                  </span>
                </div>
                <hr className="border-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">You Receive</span>
                  <span className="text-xl font-bold text-green-400">
                    ${rates.mentorPayoutDollars?.toFixed(2)} AUD
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Payouts are processed automatically after each completed session.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Payment History
          </h3>
          
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No payments yet</p>
              <p className="text-sm">Payments will appear here after you complete mentorship sessions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((earning) => (
                <div 
                  key={earning.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      earning.status === 'paid' ? 'bg-green-900/30' : 'bg-yellow-900/30'
                    }`}>
                      {earning.status === 'paid' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Mentorship Session</div>
                      <div className="text-sm text-slate-400">
                        {new Date(earning.createdAt).toLocaleDateString('en-AU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-400">
                      +${earning.amount?.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {earning.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
