'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Member Referrals Page
 * Allows members to view and share their referral code
 * /member/referrals
 */
export default function ReferralsPage() {
  const router = useRouter();
  const [referralData, setReferralData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReferralData();
  }, []);

  async function fetchReferralData() {
    setLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api('/referrals'),
        api('/referrals/history'),
      ]);

      if (summaryRes.ok) {
        setReferralData(summaryRes.data);
      } else if (summaryRes.status === 401) {
        router.push('/');
        return;
      }

      if (historyRes.ok) {
        const histData = historyRes.data;
        setHistory(histData?.history || []);
      } else if (historyRes.status === 401) {
        router.push('/');
        return;
      }
    } catch (err) {
      setError('Failed to load referral data');
      // Demo data
      setReferralData({
        referralCode: 'NG-ABC123',
        shareUrl: 'https://ngurrapathways.life/',
        stats: {
          totalReferrals: 5,
          signedUp: 3,
          hired: 1,
          pending: 1,
        },
        credits: {
          total: 225,
          redeemed: 0,
          available: 225,
        },
      });
      setHistory([
        { id: '1', refereeName: 'Sarah', status: 'HIRED', creditsEarned: 125, createdAt: '2024-01-15' },
        { id: '2', refereeName: 'James', status: 'SIGNED_UP', creditsEarned: 25, createdAt: '2024-02-01' },
        { id: '3', refereeName: 'Emma', status: 'SIGNED_UP', creditsEarned: 25, createdAt: '2024-02-10' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getStatusBadge(status) {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      SIGNED_UP: 'bg-blue-100 text-blue-800',
      HIRED: 'bg-green-100 text-green-800',
    };
    const labels = {
      PENDING: 'Pending',
      SIGNED_UP: 'Signed Up',
      HIRED: 'Hired! 🎉',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span>🎁</span> Refer a Friend
          </h1>
          <p className="text-gray-600 mt-2">
            Share your referral code with friends and earn credits when they join and get hired!
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Referral Code Card */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-lg font-medium mb-4">Your Referral Code</h2>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 flex items-center justify-between gap-4">
            <code className="text-2xl font-bold tracking-wider">
              {referralData?.referralCode || 'NG-XXXXXX'}
            </code>
            <button
              onClick={() => copyToClipboard(referralData?.referralCode)}
              className="bg-white text-amber-600 px-4 py-2 rounded-lg font-medium hover:bg-amber-50 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          
          <div className="mt-4">
            <p className="text-amber-100 text-sm mb-2">Or share this link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralData?.shareUrl || ''}
                className="flex-1 bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white text-sm"
              />
              <button
                onClick={() => copyToClipboard(referralData?.shareUrl)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Social share buttons */}
          <div className="mt-6 flex gap-3">
            <a
              href={`https://wa.me/?text=Join%20Ngurra%20Pathways%20and%20start%20your%20career%20journey!%20Use%20my%20referral%20code%3A%20${referralData?.referralCode}%20${encodeURIComponent(referralData?.shareUrl || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              📱 WhatsApp
            </a>
            <a
              href={`mailto:?subject=Join%20Ngurra%20Pathways&body=I%27m%20inviting%20you%20to%20join%20Ngurra%20Pathways!%20Use%20my%20referral%20code%3A%20${referralData?.referralCode}%0A%0A${referralData?.shareUrl}`}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              ✉️ Email
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-900">
              {referralData?.stats?.totalReferrals || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Total Referrals</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {referralData?.stats?.signedUp || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Signed Up</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {referralData?.stats?.hired || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Got Hired</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-amber-600">
              {referralData?.credits?.available || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Credits Available</div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-lg mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h4 className="font-medium mb-1">Share Your Code</h4>
              <p className="text-sm text-gray-600">
                Share your unique referral code with friends and family
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h4 className="font-medium mb-1">They Sign Up</h4>
              <p className="text-sm text-gray-600">
                When they join using your code, you earn <strong>25 credits</strong>
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h4 className="font-medium mb-1">They Get Hired</h4>
              <p className="text-sm text-gray-600">
                When they land a job, you earn <strong>100 bonus credits!</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Referral History</h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-2">👥</span>
              <p>No referrals yet. Share your code to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Friend</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Credits Earned</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((ref) => (
                    <tr key={ref.id} className="border-b last:border-0">
                      <td className="py-4">{ref.refereeName}</td>
                      <td className="py-4">{getStatusBadge(ref.status)}</td>
                      <td className="py-4 font-medium text-amber-600">+{ref.creditsEarned}</td>
                      <td className="py-4 text-gray-500 text-sm">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
