'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Mentor Availability Calendar Component
 * Allows mentors to set availability and mentees to book sessions
 */
export default function MentorCalendar({ mentorId, isOwnCalendar = false }) {
    const { user } = useAuth();
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState('week'); // 'week' or 'month'
    
    // Fetch availability slots
    const fetchSlots = useCallback(async () => {
        try {
            const startDate = new Date(selectedDate);
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (view === 'month' ? 35 : 7));
            
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            
            const url = mentorId
                ? `/mentorship/mentors/${mentorId}/availability?${params}`
                : `/mentorship/availability?${params}`;
            
            const { ok, data } = await api(url);
            
            if (!ok) throw new Error('Failed to fetch availability');
            
            setSlots(data.slots || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [mentorId, selectedDate, view]);
    
    useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);
    
    // Navigate weeks
    const navigateWeek = (direction) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setSelectedDate(newDate);
    };
    
    // Get days for current view
    const days = useMemo(() => {
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - start.getDay());
        
        const result = [];
        const numDays = view === 'month' ? 35 : 7;
        
        for (let i = 0; i < numDays; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            result.push(date);
        }
        
        return result;
    }, [selectedDate, view]);
    
    // Group slots by date
    const slotsByDate = useMemo(() => {
        const grouped = {};
        slots.forEach((slot) => {
            const dateKey = new Date(slot.startTime).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(slot);
        });
        return grouped;
    }, [slots]);
    
    // Time slots for the day (9 AM to 6 PM)
    const timeSlots = useMemo(() => {
        const times = [];
        for (let hour = 9; hour <= 17; hour++) {
            times.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return times;
    }, []);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                    {isOwnCalendar ? 'My Availability' : 'Available Times'}
                </h3>
                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setView('week')}
                            className={`px-3 py-1 text-sm rounded ${
                                view === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                            }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-1 text-sm rounded ${
                                view === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                            }`}
                        >
                            Month
                        </button>
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigateWeek(-1)}
                            className="p-2 hover:bg-gray-100 rounded"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="px-3 py-1 text-sm text-primary hover:bg-primary/5 rounded"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => navigateWeek(1)}
                            className="p-2 hover:bg-gray-100 rounded"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            
            {/* Add Availability (for mentors) */}
            {isOwnCalendar && (
                <AddAvailabilityForm 
                    onSuccess={fetchSlots}
                />
            )}
            
            {/* Calendar Grid */}
            <div className="mt-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Calendar Days */}
                <div className={`grid grid-cols-7 gap-1 ${view === 'month' ? 'grid-rows-5' : ''}`}>
                    {days.map((date, idx) => {
                        const dateKey = date.toDateString();
                        const daySlots = slotsByDate[dateKey] || [];
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPast = date < new Date() && !isToday;
                        const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                        
                        return (
                            <div
                                key={idx}
                                className={`min-h-24 border rounded-lg p-2 ${
                                    isToday ? 'border-primary bg-primary/5' :
                                    isPast ? 'bg-gray-50' :
                                    !isCurrentMonth ? 'bg-gray-50/50' : ''
                                }`}
                            >
                                <div className={`text-sm font-medium mb-1 ${
                                    isToday ? 'text-primary' :
                                    isPast ? 'text-gray-400' :
                                    !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                                }`}>
                                    {date.getDate()}
                                </div>
                                
                                {/* Slots */}
                                <div className="space-y-1">
                                    {daySlots.slice(0, 3).map((slot) => (
                                        <SlotPill
                                            key={slot.id}
                                            slot={slot}
                                            isOwnCalendar={isOwnCalendar}
                                            onBook={() => {}}
                                            onDelete={fetchSlots}
                                        />
                                    ))}
                                    {daySlots.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                            +{daySlots.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-300"></div>
                    <span>Unavailable</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Individual slot pill component
 */
function SlotPill({ slot, isOwnCalendar, onBook, onDelete }) {
    const [deleting, setDeleting] = useState(false);
    const [booking, setBooking] = useState(false);
    
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    const timeStr = `${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    
    const handleDelete = async () => {
        if (!confirm('Delete this availability slot?')) return;
        
        setDeleting(true);
        try {
            await api(`/mentorship/availability/${slot.id}`, { method: 'DELETE' });
            onDelete();
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setDeleting(false);
        }
    };
    
    const handleBook = async () => {
        setBooking(true);
        try {
            await api('/mentorship/sessions', {
                method: 'POST',
                body: { slotId: slot.id },
            });
            onBook();
        } catch (err) {
            console.error('Booking error:', err);
        } finally {
            setBooking(false);
        }
    };
    
    return (
        <div
            className={`text-xs px-2 py-1 rounded flex items-center justify-between group ${
                slot.isBooked 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
            }`}
        >
            <span>{timeStr}</span>
            
            {isOwnCalendar && !slot.isBooked && (
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                >
                    ×
                </button>
            )}
            
            {!isOwnCalendar && !slot.isBooked && (
                <button
                    onClick={handleBook}
                    disabled={booking}
                    className="opacity-0 group-hover:opacity-100 text-primary hover:underline"
                >
                    Book
                </button>
            )}
        </div>
    );
}

/**
 * Add availability form for mentors
 */
function AddAvailabilityForm({ onSuccess }) {
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        recurring: false,
        recurringWeeks: 4,
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            // Create datetime from date and time
            const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
            
            await api('/mentorship/availability', {
                method: 'POST',
                body: {
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    recurring: formData.recurring,
                    recurringWeeks: formData.recurringWeeks,
                },
            });
            
            setIsOpen(false);
            setFormData({
                date: '',
                startTime: '09:00',
                endTime: '10:00',
                recurring: false,
                recurringWeeks: 4,
            });
            onSuccess();
        } catch (err) {
            console.error('Add availability error:', err);
        } finally {
            setSubmitting(false);
        }
    };
    
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Availability
            </button>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.recurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.checked }))}
                    />
                    <span className="text-sm">Repeat weekly</span>
                </label>
                
                {formData.recurring && (
                    <select
                        value={formData.recurringWeeks}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurringWeeks: parseInt(e.target.value) }))}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value={2}>for 2 weeks</option>
                        <option value={4}>for 4 weeks</option>
                        <option value={8}>for 8 weeks</option>
                        <option value={12}>for 12 weeks</option>
                    </select>
                )}
            </div>
            
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                    {submitting ? 'Adding...' : 'Add Slot'}
                </button>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
