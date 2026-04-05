'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Calendar, 
    Clock, 
    ChevronLeft, 
    ChevronRight, 
    Check,
    User,
    Video
} from 'lucide-react';

export default function BookSessionClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mentorId = searchParams.get('mentor');
    
    const [mentor, setMentor] = useState(null);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');
    const [currentWeek, setCurrentWeek] = useState(new Date());

    useEffect(() => {
        if (mentorId) {
            fetchMentorAndSlots();
        }
    }, [mentorId]);

    async function fetchMentorAndSlots() {
        setLoading(true);
        try {
            const mentorRes = await api(`/mentorship/mentors/${mentorId}`);
            if (mentorRes.ok) {
                const data = mentorRes.data;
                setMentor(data?.mentor || data);
            }

            const slotsRes = await api(`/mentorship/mentors/${mentorId}/slots`);
            if (slotsRes.ok) {
                const data = slotsRes.data;
                setSlots(data?.slots || []);
            } else {
                generateFallbackSlots();
            }
        } catch (err) {
            console.error('Failed to load booking data:', err);
            generateFallbackSlots();
        } finally {
            setLoading(false);
        }
    }

    function generateFallbackSlots() {
        // Generate demo slots for next 14 days
        const demoSlots = [];
        const now = new Date();
        
        for (let d = 1; d <= 14; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() + d);
            
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            // Add 9 AM, 11 AM, 2 PM, 4 PM slots
            for (const hour of [9, 11, 14, 16]) {
                const start = new Date(date);
                start.setHours(hour, 0, 0, 0);
                const end = new Date(start);
                end.setHours(hour + 1, 0, 0, 0);

                demoSlots.push({
                    start: start.toISOString(),
                    end: end.toISOString(),
                    duration: 60,
                });
            }
        }

        setSlots(demoSlots);
    }

    async function handleBook() {
        if (!selectedSlot) return;
        
        setBooking(true);
        setError(null);
        
        try {
            const res = await api('/mentorship/sessions', {
                method: 'POST',
                body: {
                    mentorId,
                    scheduledAt: selectedSlot.start,
                    duration: selectedSlot.duration || 60,
                    notes,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/');
                    return;
                }
                throw new Error(res.data?.error || res.error || 'Failed to book session');
            }
            
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBooking(false);
        }
    }

    // Get dates for current week view
    const getWeekDates = () => {
        const dates = [];
        const start = new Date(currentWeek);
        start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    // Get slots for a specific date
    const getSlotsForDate = (date) => {
        return slots.filter((slot) => {
            const slotDate = new Date(slot.start);
            return slotDate.toDateString() === date.toDateString();
        });
    };

    const weekDates = getWeekDates();

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading available times…</p>
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
                    <h2 className="text-2xl font-bold mb-2">Session Booked!</h2>
                    <p className="text-slate-300 mb-6">
                        Your mentorship session has been scheduled for{' '}
                        {new Date(selectedSlot.start).toLocaleString('en-AU', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link 
                            href="/member/mentorship"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                        >
                            View My Sessions
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
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/mentorship/browse" className="hover:text-blue-400">Browse Mentors</a></li>
                    {mentor && (
                        <>
                            <li><span className="text-slate-600">/</span></li>
                            <li><a href={`/mentorship/${mentorId}`} className="hover:text-blue-400">{mentor.name}</a></li>
                        </>
                    )}
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Book Session</li>
                </ol>
            </nav>

            <h1 className="text-2xl font-bold mb-2">Book a Session</h1>
            <p className="text-slate-400 mb-8">Select a time that works for you</p>

            {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-300">{error}</p>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => {
                                const prev = new Date(currentWeek);
                                prev.setDate(prev.getDate() - 7);
                                setCurrentWeek(prev);
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="font-semibold">
                            {weekDates[0].toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={() => {
                                const next = new Date(currentWeek);
                                next.setDate(next.getDate() + 7);
                                setCurrentWeek(next);
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Week Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-6">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-center text-xs text-slate-500 font-medium py-2">
                                {day}
                            </div>
                        ))}
                        {weekDates.map((date, i) => {
                            const dateSlots = getSlotsForDate(date);
                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                            const isPast = date < new Date().setHours(0, 0, 0, 0);
                            const hasSlots = dateSlots.length > 0;
                            
                            return (
                                <button
                                    key={i}
                                    onClick={() => !isPast && hasSlots && setSelectedDate(date)}
                                    disabled={isPast || !hasSlots}
                                    className={`p-3 rounded-lg text-center transition-colors ${
                                        isSelected 
                                            ? 'bg-blue-600 text-white' 
                                            : isPast 
                                            ? 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
                                            : hasSlots
                                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                            : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="text-lg font-semibold">{date.getDate()}</div>
                                    {hasSlots && !isPast && (
                                        <div className="text-xs mt-1 text-slate-400">
                                            {dateSlots.length} slot{dateSlots.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time Slots */}
                    {selectedDate && (
                        <div>
                            <h4 className="font-medium mb-3">
                                Available times for {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {getSlotsForDate(selectedDate).map((slot, i) => {
                                    const time = new Date(slot.start);
                                    const isSelected = selectedSlot?.start === slot.start;
                                    
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                            }`}
                                        >
                                            {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Booking Summary */}
                <div className="space-y-6">
                    {/* Mentor Card */}
                    {mentor && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-lg font-bold">
                                    {mentor.name?.charAt(0) || 'M'}
                                </div>
                                <div>
                                    <h4 className="font-medium">{mentor.name}</h4>
                                    <p className="text-sm text-slate-400">{mentor.title || mentor.expertise?.split(',')[0]}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Session Details */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="font-medium mb-4">Session Details</h4>
                        
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>60 minutes</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Video className="w-4 h-4 text-slate-500" />
                                <span>Video call (link provided after booking)</span>
                            </div>
                            {selectedSlot && (
                                <div className="flex items-center gap-3 text-blue-300 font-medium">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        {new Date(selectedSlot.start).toLocaleString('en-AU', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <label className="block text-sm font-medium mb-2">
                            What would you like to discuss? (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Share your goals or topics..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Book Button */}
                    <button
                        onClick={handleBook}
                        disabled={!selectedSlot || booking}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
                            selectedSlot && !booking
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {booking ? 'Booking...' : selectedSlot ? 'Confirm Booking' : 'Select a time slot'}
                    </button>
                </div>
            </div>
        </div>
    );
}
