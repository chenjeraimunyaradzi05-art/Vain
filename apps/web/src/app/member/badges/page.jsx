"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../../hooks/useAuth';

export default function MemberBadgesPage() {
    const { token } = useAuth();
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const apiBase = API_BASE;
                const res = await fetch(`${apiBase}/badges/user/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!mounted) return;
                if (res.ok) {
                    const json = await res.json();
                    setBadges(json.badges || []);
                }
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

    const normalized = useMemo(() => {
        return (badges || []).map((ub) => {
            const badge = ub.badge || {};
            return {
                id: ub.id,
                name: badge.name || 'Badge',
                description: badge.description || '',
                issuerName: badge.issuerName || '',
                imageUrl: badge.imageUrl || '',
                issuedAt: ub.issuedAt || ub.createdAt || null,
                shareUrl: ub.shareUrl || '',
                evidenceUrl: ub.evidenceUrl || '',
            };
        });
    }, [badges]);

    if (!token) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4">
                <h1 className="text-2xl font-bold mb-2">Your Badges</h1>
                <p className="text-slate-300">Please sign in to view your badges.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Badges</li>
                </ol>
            </nav>

            <h1 className="text-2xl font-bold mb-2">Your Badges</h1>
            <p className="text-slate-300 mb-6">Badges you’ve earned through training and achievements.</p>

            {loading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
                    <span className="text-slate-400">Loading badges…</span>
                </div>
            ) : normalized.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg text-center text-slate-400">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="font-semibold text-slate-200">No badges yet</div>
                    <div className="text-sm mt-1">Complete courses and milestones to earn badges.</div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {normalized.map((b) => (
                        <div key={b.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-slate-100">{b.name}</div>
                                    {b.issuerName && <div className="text-xs text-slate-400 mt-1">Issued by {b.issuerName}</div>}
                                </div>
                                <div className="text-2xl">🏅</div>
                            </div>

                            {b.description && <p className="text-sm text-slate-300 mt-3">{b.description}</p>}

                            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                                {b.issuedAt && <span>Issued {new Date(b.issuedAt).toLocaleDateString()}</span>}
                                {b.evidenceUrl && <span>Evidence: {b.evidenceUrl}</span>}
                            </div>

                            {b.shareUrl && (
                                <div className="mt-4 text-sm">
                                    <a className="text-blue-300 hover:text-blue-200 underline" href={b.shareUrl} target="_blank" rel="noreferrer">
                                        Share / verify badge →
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
