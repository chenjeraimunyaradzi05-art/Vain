'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Mentorship Sessions Page - View session history
 * /mentorship/sessions
 */
export default function MentorshipSessionsPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, upcoming, completed

    useEffect(() => {
        fetchSessions();
    }, []);

    async function fetchSessions() {
        setLoading(true);
        try {
            const { ok, data, error } = await api('/mentorship/sessions');
            if (!ok) throw new Error(error || 'Failed to load sessions');
            setSessions(data.sessions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredSessions = sessions.filter(session => {
        if (filter === 'all') return true;
        if (filter === 'upcoming') return session.status === 'scheduled' || session.status === 'SCHEDULED';
        if (filter === 'completed') return session.status === 'completed' || session.status === 'COMPLETED';
        return true;
    });

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Breadcrumb skeleton */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><span className="bg-slate-700 rounded w-20 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-24 h-4 inline-block animate-pulse"></span></li>
                    </ol>
                </nav>
                <div className="mb-8">
                    <div className="h-8 bg-slate-700 rounded w-40 mb-3 animate-pulse"></div>
                    <div className="h-4 bg-slate-800 rounded w-64 animate-pulse"></div>
                </div>
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-10 bg-slate-800 rounded-lg w-24 animate-pulse"></div>
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="h-5 bg-slate-700 rounded w-40"></div>
                                <div className="h-6 bg-slate-700 rounded-full w-20"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-800 rounded w-32"></div>
                                <div className="h-4 bg-slate-800 rounded w-24"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href="/mentorship" className="hover:text-blue-400 transition-colors">Mentorship</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Sessions</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
                <p className="text-slate-300">View your mentorship session history</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {['all', 'upcoming', 'completed'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            filter === f 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Sessions List */}
            <div className="space-y-4">
                {filteredSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                ))}
            </div>

            {filteredSessions.length === 0 && !error && (
                <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-slate-400 mb-4">No sessions found</p>
                    <a
                        href="/mentorship/browse"
                        className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
                    >
                        Find a Mentor
                    </a>
                </div>
            )}
        </div>
    );
}

function SessionCard({ session }) {
    const statusColors = {
        scheduled: 'bg-blue-600',
        completed: 'bg-green-600',
        cancelled: 'bg-red-600',
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold">{session.topic || 'Resume Review'}</h3>
                    <p className="text-sm text-slate-400">
                        with {session.mentorName || session.menteeName || 'Mentor'}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[session.status] || 'bg-slate-600'}`}>
                    {session.status || 'Interview Prep'}
                </span>
            </div>
            
            <div className="grid gap-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{session.date || new Date(session.scheduledAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>{session.time || new Date(session.scheduledAt).toLocaleTimeString()}</span>
                </div>
                {session.notes && (
                    <div className="mt-2 p-3 bg-slate-800 rounded">
                        <p className="text-slate-400">{session.notes}</p>
                    </div>
                )}
            </div>

            {session.status === 'completed' && !session.feedbackSubmitted && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                    <a
                        href={`/mentorship/sessions/${session.id}`}
                        className="text-slate-400 hover:text-slate-300 text-sm"
                    >
                        View Details
                    </a>
                    <a
                        href={`/mentorship/sessions/${session.id}/feedback`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                        Leave Feedback →
                    </a>
                </div>
            )}
            
            {session.status !== 'completed' && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <a
                        href={`/mentorship/sessions/${session.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                        View Details →
                    </a>
                </div>
            )}
        </div>
    );
}
