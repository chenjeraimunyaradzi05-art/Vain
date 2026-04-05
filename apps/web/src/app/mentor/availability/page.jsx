'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

/**
 * Mentor Availability Page - Manage availability calendar
 * /mentor/availability
 */

// Skeleton loading component
function AvailabilitySkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <div className="h-10 w-24 bg-slate-700 rounded" />
                <div className="h-6 w-40 bg-slate-800 rounded" />
                <div className="h-10 w-24 bg-slate-700 rounded" />
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="text-center p-2">
                        <div className="h-4 w-8 bg-slate-800 rounded mx-auto mb-1" />
                        <div className="h-6 w-6 bg-slate-700 rounded mx-auto" />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="h-6 w-16 bg-slate-800 rounded" />
                        <div className="flex-1 h-10 bg-slate-900 border border-slate-800 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MentorAvailabilityPage() {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { showNotification } = useNotifications();

    useEffect(() => {
        fetchAvailability();
    }, []);

    async function fetchAvailability() {
        setLoading(true);
        try {
            const res = await api('/mentorship/availability');
            
            if (!res.ok) throw new Error('Failed to load availability');
            
            const data = res.data;
            setSlots(data?.slots || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function toggleSlot(slotId, isAvailable) {
        try {
            await api(`/mentorship/availability/${slotId}`, {
                method: 'PATCH',
                body: { isAvailable },
            });
            
            fetchAvailability();
        } catch (err) {
            showNotification({ message: 'Failed to update availability', variant: 'error' });
        }
    }

    // Generate week days
    const weekDays = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        weekDays.push(day);
    }

    // Time slots for the day
    const timeSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><Link href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">Mentor Dashboard</Link></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li className="text-white">Availability</li>
                    </ol>
                </nav>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Availability</h1>
                    <p className="text-slate-300">Manage your mentoring availability</p>
                </div>
                <AvailabilitySkeleton />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">Mentor Dashboard</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Availability</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Availability</h1>
                <p className="text-slate-300">Manage your mentoring availability</p>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() - 7);
                        setSelectedDate(newDate);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm"
                >
                    ← Previous Week
                </button>
                <span className="text-lg font-medium">
                    {weekDays[0].toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                </span>
                <button
                    onClick={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() + 7);
                        setSelectedDate(newDate);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm"
                >
                    Next Week →
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-8 border-b border-slate-800">
                    <div className="p-3 text-sm text-slate-400">Time</div>
                    {weekDays.map((day, i) => (
                        <div key={i} className="p-3 text-center border-l border-slate-800">
                            <div className="text-xs text-slate-400">
                                {day.toLocaleDateString('en-AU', { weekday: 'short' })}
                            </div>
                            <div className="text-sm font-medium">{day.getDate()}</div>
                        </div>
                    ))}
                </div>

                {/* Time Rows */}
                {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b border-slate-800 last:border-b-0">
                        <div className="p-3 text-sm text-slate-400">{time}</div>
                        {weekDays.map((day, i) => {
                            const slotKey = `${day.toISOString().split('T')[0]}-${time}`;
                            const slot = slots.find(s => {
                                const slotDate = new Date(s.startTime);
                                return slotDate.toISOString().includes(day.toISOString().split('T')[0]) &&
                                       slotDate.getHours() === parseInt(time.split(':')[0]);
                            });
                            
                            return (
                                <button
                                    key={slotKey}
                                    onClick={() => {
                                        if (slot) {
                                            toggleSlot(slot.id, slot.isBooked);
                                        }
                                    }}
                                    className={`p-3 border-l border-slate-800 text-xs transition-colors ${
                                        slot?.isBooked 
                                            ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed' 
                                            : slot 
                                                ? 'bg-green-900/30 hover:bg-green-900/50 text-green-300'
                                                : 'hover:bg-slate-800'
                                    }`}
                                >
                                    {slot?.isBooked ? 'Booked' : slot ? 'Available' : ''}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-900/30 border border-green-600 rounded" />
                    <span className="text-slate-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-900/50 border border-blue-600 rounded" />
                    <span className="text-slate-400">Booked</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 mt-8">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">
                        {slots.filter(s => !s.isBooked).length}
                    </div>
                    <div className="text-sm text-slate-400">Available Slots</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">
                        {slots.filter(s => s.isBooked).length}
                    </div>
                    <div className="text-sm text-slate-400">Booked Sessions</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-300">
                        {slots.length}
                    </div>
                    <div className="text-sm text-slate-400">Total Slots This Week</div>
                </div>
            </div>
        </div>
    );
}
