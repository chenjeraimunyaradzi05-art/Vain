"use client";

import { API_BASE } from '@/lib/apiBase';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../../hooks/useAuth';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function TafeAnalyticsPage() {
    const { token } = useAuth();
    const [tafeStats, setTafeStats] = useState(null);
    const [impact, setImpact] = useState(null);
    const [loading, setLoading] = useState(true);

    const enrolled = tafeStats?.stats?.enrolled ?? 0;
    const completed = tafeStats?.stats?.completed ?? 0;

    const hired = useMemo(() => {
        const placements = impact?.metrics?.placements?.total;
        return typeof placements === 'number' ? placements : 0;
    }, [impact]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                const base = API_BASE;

                const [r1, r2] = await Promise.all([
                    fetch(`${base}/courses/my/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${base}/reporting/metrics?period=month`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                const [j1, j2] = await Promise.all([
                    r1.ok ? r1.json() : null,
                    r2.ok ? r2.json() : null,
                ]);

                if (!mounted) return;
                if (j1) setTafeStats(j1);
                if (j2) setImpact(j2);
            } catch (e) {
                // ignore
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [token]);

    return (
        <div className="min-h-screen">
            {/* === HERO SECTION === */}
            <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
                <div className="ngurra-halo-pink" />
                <div className="ngurra-halo-purple" />

                <div className="relative max-w-4xl mx-auto">
                    <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                        <ol className="flex items-center gap-2">
                            <li><Link href="/" className="text-pink-600 hover:text-pink-700 transition-colors">Home</Link></li>
                            <li><span className="text-slate-400">/</span></li>
                            <li><Link href="/tafe/dashboard" className="text-pink-600 hover:text-pink-700 transition-colors">TAFE Dashboard</Link></li>
                            <li><span className="text-slate-400">/</span></li>
                            <li className="text-slate-700 font-medium">Analytics</li>
                        </ol>
                    </nav>

                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Training insights</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Training-to-Job Funnel</h1>
                    <p className="text-lg text-slate-600 mt-2">Track enrolled → completed → hired</p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!token && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800">
                        Please sign in to view analytics.
                    </div>
                )}

                {loading && token && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl animate-pulse shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                                <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
                                <div className="h-10 bg-slate-100 rounded w-16" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && token && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Enrolled</p>
                                <div className="text-4xl font-bold mt-2" style={{ color: '#10B981' }}>{enrolled}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Completed</p>
                                <div className="text-4xl font-bold mt-2" style={{ color: accentPink }}>{completed}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">Hired</p>
                                <div className="text-4xl font-bold mt-2" style={{ color: accentPurple }}>{hired}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 mb-1">How it works</p>
                            <h2 className="font-bold text-xl text-slate-900 mb-3">Notes</h2>
                            <ul className="list-disc pl-6 text-slate-600 space-y-1">
                                <li>Enrolled/Completed counts come from course enrolment status.</li>
                                <li>Hired count uses overall placement outcomes for the last month.</li>
                            </ul>
                        </div>

                        {/* CTA Section */}
                        <section className="mt-8 rounded-3xl p-8 text-center" style={{
                            background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                            border: '1px solid rgba(233, 30, 140, 0.2)',
                        }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Need more data?</p>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Full Reports</h2>
                            <p className="text-slate-600 mb-6">Get detailed insights on training outcomes and placement success.</p>
                            <Link
                                href="/tafe/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
                            >
                                Back to Dashboard
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
