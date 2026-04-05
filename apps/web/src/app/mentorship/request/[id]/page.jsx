'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, 
    Star, 
    MapPin, 
    Calendar, 
    Clock,
    Target,
    MessageSquare,
    Send,
    Check,
    Users
} from 'lucide-react';

const TIME_PREFERENCES = [
    { value: 'morning', label: 'Mornings (9am - 12pm)' },
    { value: 'afternoon', label: 'Afternoons (12pm - 5pm)' },
    { value: 'evening', label: 'Evenings (5pm - 8pm)' },
    { value: 'weekend', label: 'Weekends' },
    { value: 'flexible', label: 'Flexible / Any time' },
];

const GOAL_SUGGESTIONS = [
    'Career guidance and advice',
    'Resume and LinkedIn review',
    'Interview preparation',
    'Industry insights and networking',
    'Skill development',
    'Cultural connection and community',
    'Work-life balance',
    'Starting a business',
];

export default function MentorRequestPage() {
    const { id: mentorId } = useParams();
    const router = useRouter();
    
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    
    // Form state
    const [goals, setGoals] = useState('');
    const [selectedGoals, setSelectedGoals] = useState([]);
    const [preferredTimes, setPreferredTimes] = useState([]);
    const [additionalNotes, setAdditionalNotes] = useState('');

    useEffect(() => {
        if (mentorId) {
            fetchMentor();
        }
    }, [mentorId]);

    async function fetchMentor() {
        try {
            const res = await api(`/mentorship/mentors/${mentorId}`);

            if (res.ok) {
                const data = res.data;
                setMentor(data?.mentor || data);
            } else {
                setError('Mentor not found');
            }
        } catch (err) {
            console.error('Failed to fetch mentor:', err);
            // Demo fallback
            setMentor({
                id: mentorId,
                name: 'Demo Mentor',
                title: 'Career Coach',
                expertise: 'Career Development, Resume Writing',
                location: 'Sydney, NSW',
                rating: 4.8,
                sessionCount: 50,
                activeMatches: 2,
                maxCapacity: 5,
            });
        } finally {
            setLoading(false);
        }
    }

    function toggleGoal(goal) {
        setSelectedGoals(prev => 
            prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
        );
    }

    function toggleTime(time) {
        setPreferredTimes(prev => 
            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (selectedGoals.length === 0 && !goals.trim()) {
            setError('Please select or describe at least one goal');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            // Combine selected goals with custom goals
            const allGoals = [...selectedGoals];
            if (goals.trim()) allGoals.push(goals.trim());
            
            const timeLabels = preferredTimes.map(t => 
                TIME_PREFERENCES.find(p => p.value === t)?.label || t
            );
            
            const notes = [
                `Goals: ${allGoals.join(', ')}`,
                `Preferred times: ${timeLabels.length > 0 ? timeLabels.join(', ') : 'Not specified'}`,
                additionalNotes ? `Notes: ${additionalNotes}` : ''
            ].filter(Boolean).join('\n');

            const res = await api('/mentorship/request', {
                method: 'POST',
                body: {
                    mentorId,
                    notes,
                    goals: allGoals.join(', '),
                    preferredTimes: timeLabels.join(', '),
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/');
                    return;
                }
                throw new Error(res.data?.error || res.error || 'Failed to send request');
            }
            
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading…</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-green-900/30 border border-green-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Request Sent!</h2>
                    <p className="text-slate-300 mb-6">
                        Your mentorship request has been sent to {mentor?.name}. 
                        They'll review your request and get back to you soon.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link 
                            href="/member/mentorship"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                        >
                            View My Requests
                        </Link>
                        <Link 
                            href="/mentorship/browse"
                            className="px-6 py-3 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Browse More Mentors
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/mentorship/browse" className="hover:text-blue-400">Browse Mentors</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href={`/mentorship/${mentorId}`} className="hover:text-blue-400">{mentor?.name || 'Mentor'}</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Request Mentorship</li>
                </ol>
            </nav>

            {/* Back link */}
            <Link href={`/mentorship/${mentorId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to profile
            </Link>

            <h1 className="text-2xl font-bold mb-2">Request Mentorship</h1>
            <p className="text-slate-400 mb-8">Tell {mentor?.name} about your goals and preferences</p>

            {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-300">{error}</p>
                </div>
            )}

            {/* Mentor Summary Card */}
            {mentor && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xl font-bold">
                            {mentor.name?.charAt(0) || 'M'}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">{mentor.name}</h3>
                            <p className="text-sm text-blue-400">{mentor.title || mentor.expertise?.split(',')[0]}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                {mentor.rating && (
                                    <span className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                        {mentor.rating}
                                    </span>
                                )}
                                {mentor.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {mentor.location}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {mentor.maxCapacity - (mentor.activeMatches || 0)} slots open
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Goals Selection */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">What are your goals?</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Select all that apply, or describe your own</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        {GOAL_SUGGESTIONS.map((goal) => (
                            <button
                                key={goal}
                                type="button"
                                onClick={() => toggleGoal(goal)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    selectedGoals.includes(goal)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {goal}
                            </button>
                        ))}
                    </div>
                    
                    <textarea
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="Describe any other specific goals or topics you'd like to discuss..."
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Time Preferences */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">When are you available?</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Select your preferred times for sessions</p>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                        {TIME_PREFERENCES.map((time) => (
                            <button
                                key={time.value}
                                type="button"
                                onClick={() => toggleTime(time.value)}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                                    preferredTimes.includes(time.value)
                                        ? 'border-blue-500 bg-blue-900/30'
                                        : 'border-slate-700 hover:border-slate-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    preferredTimes.includes(time.value)
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-slate-600'
                                }`}>
                                    {preferredTimes.includes(time.value) && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>
                                <span className="text-sm">{time.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Additional Notes */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">Anything else?</h2>
                    </div>
                    <textarea
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Share any additional context about yourself or what you're looking for in a mentor (optional)..."
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link 
                        href={`/mentorship/${mentorId}`}
                        className="px-6 py-3 border border-slate-700 hover:bg-slate-800 rounded-lg text-center transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting || (selectedGoals.length === 0 && !goals.trim())}
                        className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                            !submitting && (selectedGoals.length > 0 || goals.trim())
                                ? 'bg-blue-600 hover:bg-blue-500'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending Request…
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send Request
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
