'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Mentor Earnings Page - View earnings and payouts
 * /mentor/earnings
 */

// Skeleton loading component
function EarningsSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <div className="h-8 w-24 bg-slate-700 rounded mb-2" />
                        <div className="h-4 w-20 bg-slate-800 rounded" />
                    </div>
                ))}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-slate-800">
                            <div className="h-5 w-24 bg-slate-700 rounded" />
                            <div className="h-5 w-20 bg-slate-800 rounded" />
                            <div className="h-6 w-16 bg-slate-700 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MentorEarningsPage() {
    const [earnings, setEarnings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEarnings();
    }, []);

    async function fetchEarnings() {
        setLoading(true);
        try {
            const res = await api('/mentorship/earnings');
            
            if (!res.ok) throw new Error('Failed to load earnings');
            
            setEarnings(res.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><Link href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">Mentor Dashboard</Link></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li className="text-white">Earnings</li>
                    </ol>
                </nav>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Earnings</h1>
                    <p className="text-slate-300">Track your mentoring income and payouts</p>
                </div>
                <EarningsSkeleton />
            </div>
        );
    }

    // Default data for display
    const data = earnings || {
        totalEarnings: 1250, // dollars = $1,250
        pendingPayout: 350,  // dollars = $350
        completedSessions: 25,
        averageRating: 4.8,
        payouts: [
            { id: '1', amount: 500, date: '2025-01-15', status: 'completed' },
            { id: '2', amount: 400, date: '2025-01-01', status: 'completed' },
        ],
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">Mentor Dashboard</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Earnings</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Earnings</h1>
                <p className="text-slate-300">Track your mentoring income and payouts</p>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-3xl font-bold text-green-400">
                        ${Number(data.totalEarnings).toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Total Earnings</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-3xl font-bold text-yellow-400">
                        ${Number(data.pendingPayout).toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Pending</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-3xl font-bold text-blue-400">
                        {data.completedSessions}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Sessions</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-3xl font-bold text-purple-400">
                        ⭐ {data.averageRating}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Avg Rating</div>
                </div>
            </div>

            {/* Payout History */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                    <h2 className="text-lg font-semibold">Payout History</h2>
                </div>
                
                <div className="divide-y divide-slate-800">
                    {data.payouts && data.payouts.length > 0 ? (
                        data.payouts.map((payout) => (
                            <div key={payout.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">
                                        ${(payout.amount / 100).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {new Date(payout.date).toLocaleDateString('en-AU', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    payout.status === 'completed' 
                                        ? 'bg-green-900 text-green-300'
                                        : payout.status === 'pending'
                                            ? 'bg-yellow-900 text-yellow-300'
                                            : 'bg-slate-700 text-slate-300'
                                }`}>
                                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-slate-400">
                            No payouts yet
                        </div>
                    )}
                </div>
            </div>

            {/* Payout Settings */}
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Payout Settings</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">Payout Method</div>
                            <div className="text-sm text-slate-400">Bank Transfer (BSB: ***-*** | Acc: ****1234)</div>
                        </div>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                            Update
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">Payout Schedule</div>
                            <div className="text-sm text-slate-400">Monthly (1st of each month)</div>
                        </div>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                            Change
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">Tax Documentation</div>
                            <div className="text-sm text-slate-400">ABN registered</div>
                        </div>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                            View
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
