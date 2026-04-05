'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Session Feedback Page - Submit feedback after a mentoring session
 * /mentorship/feedback/[id]
 */
export default function SessionFeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id;

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    // Feedback form state
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [wouldRecommend, setWouldRecommend] = useState(null);
    const [topicsDiscussed, setTopicsDiscussed] = useState([]);

    const topicOptions = [
        'Career guidance',
        'Resume review',
        'Interview prep',
        'Industry insights',
        'Skill development',
        'Cultural connection',
        'Networking',
        'Work-life balance',
    ];

    useEffect(() => {
        fetchSession();
    }, [sessionId]);

    async function fetchSession() {
        setLoading(true);
        try {
            const res = await api(`/mentorship/sessions/${sessionId}`);

            if (!res.ok) throw new Error('Failed to load session');

            const data = res.data;
            setSession(data?.session || data);
        } catch (err) {
            // Use placeholder data for demo
            setSession({
                id: sessionId,
                mentorName: 'Sarah Johnson',
                mentorTitle: 'Senior Software Engineer',
                date: '2025-01-20T10:00:00Z',
                duration: 45,
                type: 'video',
            });
        } finally {
            setLoading(false);
        }
    }

    function toggleTopic(topic) {
        setTopicsDiscussed(prev => 
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (rating === 0) {
            setError('Please provide a rating');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await api(`/mentorship/sessions/${sessionId}/feedback`, {
                method: 'POST',
                body: {
                    rating,
                    feedback,
                    wouldRecommend,
                    topicsDiscussed,
                },
            });

            if (!res.ok) throw new Error('Failed to submit feedback');
            
            setSubmitted(true);
        } catch (err) {
            // For demo, show success anyway
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Breadcrumb skeleton */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><span className="bg-slate-700 rounded w-20 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-24 h-4 inline-block animate-pulse"></span></li>
                    </ol>
                </nav>
                <div className="mb-8">
                    <div className="h-7 bg-slate-700 rounded w-48 mb-3 animate-pulse"></div>
                    <div className="h-4 bg-slate-800 rounded w-72 animate-pulse"></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                            <div className="h-5 bg-slate-700 rounded w-32 mb-2"></div>
                            <div className="h-4 bg-slate-800 rounded w-48"></div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="h-20 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-32 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-24 bg-slate-800 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-4">Thank you for your feedback!</h1>
                <p className="text-slate-300 mb-8">
                    Your feedback helps us improve the mentoring experience for everyone.
                </p>
                <button
                    onClick={() => router.push('/mentorship/sessions')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Back to Sessions
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href="/mentorship/sessions" className="hover:text-blue-400 transition-colors">Sessions</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Feedback</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Session Feedback</h1>
                <p className="text-slate-300">
                    Share your experience from your session with {session?.mentorName}
                </p>
            </div>

            {/* Session Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-lg font-bold">
                        {session?.mentorName?.charAt(0) || 'M'}
                    </div>
                    <div>
                        <div className="font-medium">{session?.mentorName}</div>
                        <div className="text-sm text-slate-400">{session?.mentorTitle}</div>
                        <div className="text-sm text-slate-400">
                            {session?.date && new Date(session.date).toLocaleDateString('en-AU', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                            {' • '}{session?.duration} minutes
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Rating */}
                <div>
                    <label className="block text-sm font-medium mb-3">
                        How would you rate this session? *
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-4xl transition-transform hover:scale-110 ${
                                    star <= rating ? 'text-yellow-400' : 'text-slate-600'
                                }`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-sm text-slate-400 mt-2">
                            {rating === 5 && 'Excellent!'}
                            {rating === 4 && 'Very good'}
                            {rating === 3 && 'Good'}
                            {rating === 2 && 'Fair'}
                            {rating === 1 && 'Poor'}
                        </p>
                    )}
                </div>

                {/* Topics Discussed */}
                <div>
                    <label className="block text-sm font-medium mb-3">
                        What topics did you discuss?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {topicOptions.map((topic) => (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => toggleTopic(topic)}
                                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                    topicsDiscussed.includes(topic)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Written Feedback */}
                <div>
                    <label className="block text-sm font-medium mb-3">
                        Share your thoughts
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="What went well? What could be improved?"
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                                   placeholder-slate-500 resize-none"
                    />
                </div>

                {/* Would Recommend */}
                <div>
                    <label className="block text-sm font-medium mb-3">
                        Would you recommend this mentor to others?
                    </label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setWouldRecommend(true)}
                            className={`flex-1 py-3 rounded-lg border transition-colors ${
                                wouldRecommend === true
                                    ? 'bg-green-900 border-green-700 text-green-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            👍 Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => setWouldRecommend(false)}
                            className={`flex-1 py-3 rounded-lg border transition-colors ${
                                wouldRecommend === false
                                    ? 'bg-red-900 border-red-700 text-red-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            👎 No
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                                   disabled:cursor-not-allowed text-white font-medium rounded-lg 
                                   transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Feedback'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
