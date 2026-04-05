'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
    Calendar, 
    Clock, 
    User, 
    Video, 
    MessageSquare,
    Star,
    FileText,
    ChevronRight,
    ExternalLink
} from 'lucide-react';

// Dynamically import to avoid SSR issues (WebRTC + external scripts)
const MentorSessionVideoCall = dynamic(() => import('@/components/MentorSessionVideoCall'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[600px] bg-slate-900 rounded-xl flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mx-auto mb-4" />
                <p className="text-slate-400">Loading video call...</p>
            </div>
        </div>
    )
});

export default function SessionDetailPage() {
    const { id: sessionId } = useParams();
    const router = useRouter();
    
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inCall, setInCall] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (sessionId) fetchSession();
    }, [sessionId]);

    async function fetchSession() {
        try {
            const res = await api(`/mentorship/sessions/${sessionId}`);
            if (res.ok) {
                const data = res.data;
                setSession(data.session || data);
                setNotes(data.session?.notes || data.notes || '');
            } else {
                setError('Session not found');
            }
        } catch (err) {
            console.error('Failed to fetch session:', err);
            setError('Failed to load session');
        } finally {
            setLoading(false);
        }
    }

    async function saveNotes() {
        try {
            await api(`/mentorship/sessions/${sessionId}/notes`, {
                method: 'PATCH',
                body: { notes },
            });
        } catch (err) {
            console.error('Failed to save notes:', err);
        }
    }

    function getSessionStatus() {
        if (!session) return { label: 'Unknown', color: 'slate' };
        
        const now = new Date();
        const scheduledAt = new Date(session.scheduledAt);
        const endTime = new Date(scheduledAt.getTime() + (session.duration || 60) * 60 * 1000);
        
        if (session.status === 'COMPLETED') return { label: 'Completed', color: 'green' };
        if (session.status === 'CANCELLED') return { label: 'Cancelled', color: 'red' };
        if (now >= scheduledAt && now <= endTime) return { label: 'In Progress', color: 'blue' };
        if (now > endTime) return { label: 'Ended', color: 'amber' };
        return { label: 'Upcoming', color: 'purple' };
    }

    function canJoinCall() {
        if (!session) return false;
        
        const now = new Date();
        const scheduledAt = new Date(session.scheduledAt);
        const endTime = new Date(scheduledAt.getTime() + (session.duration || 60) * 60 * 1000);
        
        // Allow joining 5 minutes early
        const earlyJoin = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
        
        return now >= earlyJoin && now <= endTime && session.status !== 'CANCELLED';
    }

    function generateRoomName() {
        return `session-${sessionId}`;
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading session…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-8 text-center">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p className="text-slate-300 mb-4">{error}</p>
                    <Link href="/member/mentorship" className="text-blue-400 hover:underline">
                        Back to My Sessions
                    </Link>
                </div>
            </div>
        );
    }

    const status = getSessionStatus();
    const scheduledAt = new Date(session.scheduledAt);

    // If in call, show video component
    if (inCall) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold">Session with {session.mentor?.name || 'Mentor'}</h1>
                    <button
                        onClick={() => setInCall(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
                    >
                        Exit Call
                    </button>
                </div>
                <MentorSessionVideoCall
                    sessionId={sessionId}
                    roomName={generateRoomName()}
                    displayName={session.mentee?.name || 'Participant'}
                    sessionInfo={{
                        mentorName: session.mentor?.name,
                        menteeName: session.mentee?.name
                    }}
                    onLeave={() => setInCall(false)}
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/mentorship" className="hover:text-blue-400">My Sessions</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Session Details</li>
                </ol>
            </nav>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Session Header */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xl font-bold">
                                    {session.mentor?.name?.charAt(0) || 'M'}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold mb-1">
                                        Session with {session.mentor?.name || 'Mentor'}
                                    </h1>
                                    <p className="text-slate-400">
                                        {session.mentor?.profile?.title || session.mentor?.email}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${status.color}-900/50 text-${status.color}-300`}>
                                {status.label}
                            </span>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span>{scheduledAt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>{scheduledAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} ({session.duration || 60} min)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <Video className="w-4 h-4 text-slate-500" />
                                <span>Video Call</span>
                            </div>
                        </div>
                    </div>

                    {/* Video Call Section */}
                    {canJoinCall() && (
                        <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold mb-1">Your session is ready!</h3>
                                    <p className="text-sm text-slate-400">Click to join the video call with your mentor</p>
                                </div>
                                <button
                                    onClick={() => setInCall(true)}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Video className="w-5 h-5" />
                                    Join Call
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Session Notes */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Session Notes
                            </h3>
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className="text-sm text-blue-400 hover:underline"
                            >
                                {showNotes ? 'Hide' : 'Edit'}
                            </button>
                        </div>
                        
                        {showNotes ? (
                            <div className="space-y-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={6}
                                    placeholder="Add your notes, key takeaways, or action items..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={saveNotes}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                                >
                                    Save Notes
                                </button>
                            </div>
                        ) : (
                            <p className="text-slate-400">
                                {notes || 'No notes yet. Click Edit to add your session notes.'}
                            </p>
                        )}
                    </div>

                    {/* Goals/Topics */}
                    {session.goals && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h3 className="font-semibold mb-3">Discussion Topics</h3>
                            <p className="text-slate-300">{session.goals}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Actions */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                        {canJoinCall() && (
                            <button
                                onClick={() => setInCall(true)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Video className="w-4 h-4" />
                                Join Video Call
                            </button>
                        )}
                        
                        {session.status === 'COMPLETED' && !session.feedbackSubmitted && (
                            <Link
                                href={`/mentorship/sessions/${sessionId}/feedback`}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Star className="w-4 h-4" />
                                Leave Feedback
                            </Link>
                        )}
                        
                        <a
                            href={`https://meet.jit.si/gimbi-session-${sessionId}-${generateRoomName()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 border border-slate-700 hover:bg-slate-800 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open in New Tab
                        </a>
                    </div>

                    {/* Mentor Info */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="font-medium mb-3">Your Mentor</h4>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold">
                                {session.mentor?.name?.charAt(0) || 'M'}
                            </div>
                            <div>
                                <p className="font-medium">{session.mentor?.name || 'Mentor'}</p>
                                <p className="text-sm text-slate-400">{session.mentor?.email}</p>
                            </div>
                        </div>
                        <Link
                            href={`/mentorship/${session.mentorId}`}
                            className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                        >
                            View Profile
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="font-medium mb-3">Quick Links</h4>
                        <div className="space-y-2">
                            <Link
                                href="/member/mentorship"
                                className="block w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                            >
                                My Sessions
                            </Link>
                            <Link
                                href="/mentorship/progress"
                                className="block w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                            >
                                View Progress
                            </Link>
                            <Link
                                href={`/mentorship/sessions/book?mentor=${session.mentorId}`}
                                className="block w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                            >
                                Book Another Session
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
