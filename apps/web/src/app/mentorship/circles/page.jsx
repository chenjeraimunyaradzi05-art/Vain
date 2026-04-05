'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

/**
 * Mentorship Circles Page - Group mentorship programs
 * /mentorship/circles
 */
export default function MentorshipCirclesPage() {
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showNotification } = useNotifications();

    useEffect(() => {
        fetchCircles();
    }, []);

    async function fetchCircles() {
        setLoading(true);
        try {
            const res = await api('/mentorship/circles');
            
            if (!res.ok) throw new Error('Failed to load circles');
            
            const data = res.data;
            setCircles(data?.circles || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleJoinCircle(circleId) {
        try {
            const res = await api(`/mentorship/circles/${circleId}/join`, {
                method: 'POST',
            });
            
            if (!res.ok) throw new Error('Failed to join circle');
            
            // Refresh circles list
            fetchCircles();
        } catch (err) {
            showNotification({ message: err.message, variant: 'error' });
        }
    }

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><span className="bg-slate-700 rounded w-20 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-24 h-4 inline-block animate-pulse"></span></li>
                    </ol>
                </nav>
                <div className="mb-8">
                    <div className="h-8 bg-slate-700 rounded w-56 mb-3 animate-pulse"></div>
                    <div className="h-4 bg-slate-800 rounded w-80 animate-pulse"></div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="h-6 bg-slate-700 rounded w-40"></div>
                                <div className="h-6 bg-slate-700 rounded w-16"></div>
                            </div>
                            <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                            <div className="h-4 bg-slate-800 rounded w-3/4 mb-4"></div>
                            <div className="flex gap-4">
                                <div className="h-4 bg-slate-700 rounded w-24"></div>
                                <div className="h-4 bg-slate-700 rounded w-20"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/mentorship" className="hover:text-blue-400 transition-colors">Mentorship</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Circles</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Mentorship Circles</h1>
                <p className="text-slate-300">Join group mentorship programs with other community members</p>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Circles Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {circles.map((circle) => (
                    <CircleCard 
                        key={circle.id} 
                        circle={circle} 
                        onJoin={() => handleJoinCircle(circle.id)}
                    />
                ))}
            </div>

            {circles.length === 0 && !error && (
                <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-slate-400 mb-2">No circles available at the moment</p>
                    <p className="text-sm text-slate-500">Check back soon for new group programs</p>
                </div>
            )}

            {/* Info Section */}
            <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">What are Mentorship Circles?</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <h3 className="font-medium mb-1">Group Learning</h3>
                        <p className="text-sm text-slate-400">Learn alongside peers with similar goals</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl mb-2">🎯</div>
                        <h3 className="font-medium mb-1">Focused Topics</h3>
                        <p className="text-sm text-slate-400">Each circle focuses on specific career paths</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl mb-2">🤝</div>
                        <h3 className="font-medium mb-1">Community Support</h3>
                        <p className="text-sm text-slate-400">Build connections with your cohort</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CircleCard({ circle, onJoin }) {
    const isFull = circle.memberCount >= circle.maxMembers;
    const memberDisplay = `${circle.memberCount || 8}/${circle.maxMembers || 12} members`;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">{circle.name || 'Career Transition Support'}</h3>
                        <p className="text-sm text-slate-400">{circle.focus || 'Test Circle'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isFull ? 'bg-slate-700 text-slate-400' : 'bg-green-900 text-green-300'
                    }`}>
                        {isFull ? 'Full' : 'Open'}
                    </span>
                </div>
                
                <p className="text-slate-300 text-sm mb-4">{circle.description || 'Youth Employment Circle'}</p>
                
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span>👥 {memberDisplay}</span>
                    <span>📅 {circle.schedule || 'Weekly'}</span>
                </div>

                {circle.mentor && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                            {circle.mentor.name?.charAt(0) || 'M'}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{circle.mentor.name}</p>
                            <p className="text-xs text-slate-400">Circle Facilitator</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800">
                {circle.isMember ? (
                    <Link
                        href={`/mentorship/circles/${circle.id}`}
                        className="block text-center w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        View Circle
                    </Link>
                ) : (
                    <button
                        onClick={onJoin}
                        disabled={isFull}
                        className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                            isFull 
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    >
                        {isFull ? 'Circle Full' : 'Join Circle'}
                    </button>
                )}
            </div>
        </div>
    );
}
