'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, 
    Clock, 
    Check, 
    X, 
    Calendar, 
    MessageSquare,
    User,
    ChevronRight
} from 'lucide-react';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

export default function MentorRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [filter, setFilter] = useState('pending');
    const { showNotification } = useNotifications();

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        setLoading(true);
        try {
            const res = await api('/mentorship/sessions');
            
            if (!res.ok) {
                if (res.status === 401) throw new Error('Please log in');
                throw new Error('Failed to load requests');
            }
            
            const data = res.data;
            setRequests(data?.sessions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(sessionId, action) {
        setProcessing(sessionId);
        try {
            const statusMap = {
                accept: 'CONFIRMED',
                decline: 'CANCELLED',
                complete: 'COMPLETED',
            };

            const res = await api(`/mentorship/sessions/${sessionId}`, {
                method: 'PATCH',
                body: { status: statusMap[action] },
            });
            
            if (!res.ok) throw new Error(`Failed to ${action} request`);
            
            // Refresh requests
            fetchRequests();
        } catch (err) {
            showNotification({ message: err.message, variant: 'error' });
        } finally {
            setProcessing(null);
        }
    }

    const filteredRequests = requests.filter(r => {
        if (filter === 'pending') return r.status === 'PENDING' || r.status === 'SCHEDULED';
        if (filter === 'confirmed') return r.status === 'CONFIRMED';
        if (filter === 'completed') return r.status === 'COMPLETED';
        if (filter === 'cancelled') return r.status === 'CANCELLED';
        return true;
    });

    const pendingCount = requests.filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED').length;
    const confirmedCount = requests.filter(r => r.status === 'CONFIRMED').length;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading requests…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/mentor/dashboard" className="hover:text-blue-400">Mentor Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Requests</li>
                </ol>
            </nav>

            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Mentorship Requests</h1>
                    <p className="text-slate-400 mt-1">
                        {pendingCount > 0 ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}` : 'No pending requests'}
                    </p>
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-4">
                    <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg px-4 py-2">
                        <span className="text-amber-300 font-semibold">{pendingCount}</span>
                        <span className="text-slate-400 text-sm ml-2">Pending</span>
                    </div>
                    <div className="bg-green-900/30 border border-green-800/50 rounded-lg px-4 py-2">
                        <span className="text-green-300 font-semibold">{confirmedCount}</span>
                        <span className="text-slate-400 text-sm ml-2">Active</span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
                {[
                    { key: 'pending', label: 'Pending', count: pendingCount },
                    { key: 'confirmed', label: 'Confirmed', count: confirmedCount },
                    { key: 'completed', label: 'Completed' },
                    { key: 'cancelled', label: 'Cancelled' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === tab.key
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-300">{error}</p>
                </div>
            )}

            {/* Requests List */}
            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No {filter} requests</h3>
                        <p className="text-slate-400 text-sm">
                            {filter === 'pending' 
                                ? 'New mentorship requests will appear here'
                                : `You don't have any ${filter} sessions`
                            }
                        </p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <RequestCard 
                            key={request.id} 
                            request={request} 
                            onAction={handleAction}
                            processing={processing === request.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function RequestCard({ request, onAction, processing }) {
    const isPending = request.status === 'PENDING' || request.status === 'SCHEDULED';
    const isConfirmed = request.status === 'CONFIRMED';
    
    // Parse goals and preferred times from notes
    const goalsMatch = request.notes?.match(/Goals:\s*(.+?)(?:\n|$)/);
    const timesMatch = request.notes?.match(/Preferred times:\s*(.+?)(?:\n|$)/);
    const goals = goalsMatch ? goalsMatch[1] : null;
    const preferredTimes = timesMatch ? timesMatch[1] : null;

    return (
        <div className={`bg-slate-900/50 border rounded-xl p-6 ${
            isPending ? 'border-amber-800/50' : 'border-slate-800'
        }`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Mentee Info */}
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-lg font-bold">
                        {request.menteeName?.charAt(0) || 'M'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{request.menteeName || 'Anonymous'}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isPending ? 'bg-amber-900/50 text-amber-300' :
                                isConfirmed ? 'bg-green-900/50 text-green-300' :
                                request.status === 'COMPLETED' ? 'bg-blue-900/50 text-blue-300' :
                                'bg-slate-700 text-slate-400'
                            }`}>
                                {request.status}
                            </span>
                        </div>
                        
                        {goals && (
                            <p className="text-slate-300 text-sm mt-2">
                                <span className="text-slate-500">Goals:</span> {goals}
                            </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {new Date(request.scheduledAt).toLocaleDateString('en-AU', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {request.duration || request.durationMins || 60} mins
                            </span>
                            {preferredTimes && preferredTimes !== 'Not specified' && (
                                <span className="flex items-center gap-1.5">
                                    <MessageSquare className="w-4 h-4" />
                                    Prefers: {preferredTimes}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 md:flex-col lg:flex-row">
                    {isPending && (
                        <>
                            <button
                                onClick={() => onAction(request.id, 'accept')}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Accept
                            </button>
                            <button
                                onClick={() => onAction(request.id, 'decline')}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-lg text-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Decline
                            </button>
                        </>
                    )}
                    {isConfirmed && (
                        <>
                            <Link
                                href={`/mentorship/sessions/${request.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                            >
                                Join Session
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() => onAction(request.id, 'complete')}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-lg text-sm transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Complete
                            </button>
                        </>
                    )}
                    {!isPending && !isConfirmed && (
                        <Link
                            href={`/mentorship/sessions/${request.id}`}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm transition-colors"
                        >
                            View Details
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
