'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * MentorCalendar - Calendar for scheduling mentorship sessions
 * 
 * Features:
 * - View mentor availability
 * - Book sessions
 * - View upcoming sessions
 * - Reschedule/cancel sessions
 * - Different session types
 * - Time zone handling
 */

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
}

interface MentorAvailability {
  date: string;
  slots: TimeSlot[];
}

interface Session {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  type: 'one-on-one' | 'group' | 'workshop';
  topic: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  meetingUrl?: string;
  notes?: string;
}

interface Mentor {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  specialties: string[];
  sessionTypes: { type: string; duration: number; price?: number }[];
}

// API functions
const calendarApi = {
  async getMentorAvailability(mentorId: string, startDate: string, endDate: string): Promise<{ availability: MentorAvailability[] }> {
    const res = await fetch(
      `/api/mentorship/availability/${mentorId}?start=${startDate}&end=${endDate}`,
      { credentials: 'include' }
    );
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },

  async getUpcomingSessions(): Promise<{ sessions: Session[] }> {
    const res = await fetch('/api/mentorship/sessions?status=upcoming', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async getPastSessions(): Promise<{ sessions: Session[] }> {
    const res = await fetch('/api/mentorship/sessions?status=past', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async bookSession(data: {
    mentorId: string;
    slotId: string;
    type: string;
    topic: string;
    description?: string;
  }): Promise<Session> {
    const res = await fetch('/api/mentorship/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to book session');
    return res.json();
  },

  async cancelSession(sessionId: string, reason?: string): Promise<void> {
    const res = await fetch(`/api/mentorship/sessions/${sessionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to cancel session');
  },

  async rescheduleSession(sessionId: string, newSlotId: string): Promise<Session> {
    const res = await fetch(`/api/mentorship/sessions/${sessionId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newSlotId }),
    });
    if (!res.ok) throw new Error('Failed to reschedule session');
    return res.json();
  },

  async getMentors(): Promise<{ mentors: Mentor[] }> {
    const res = await fetch('/api/mentorship/mentors', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch mentors');
    return res.json();
  },
};

// Helper functions
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Calendar Grid Component
function CalendarGrid({
  selectedDate,
  onSelectDate,
  availability,
  sessions,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  availability: MentorAvailability[];
  sessions: Session[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add days from previous month
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month
    const endDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getDateStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const hasAvailability = availability.some(
      a => a.date === dateStr && a.slots.some(s => s.isAvailable && !s.isBooked)
    );
    const hasSession = sessions.some(s => 
      new Date(s.startTime).toDateString() === date.toDateString()
    );
    return { hasAvailability, hasSession };
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {currentMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => {
          const { hasAvailability, hasSession } = getDateStatus(date);
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <button
              key={index}
              onClick={() => !isPast && onSelectDate(date)}
              disabled={isPast}
              className={`
                relative p-2 h-12 rounded-lg text-sm transition-colors
                ${isSelected(date) 
                  ? 'bg-blue-500 text-white' 
                  : isToday(date)
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : isCurrentMonth(date)
                      ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'text-gray-400 dark:text-gray-600'
                }
                ${isPast ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span>{date.getDate()}</span>
              {/* Indicators */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                {hasAvailability && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                {hasSession && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}

// Time Slots Component
function TimeSlots({
  date,
  slots,
  onSelectSlot,
}: {
  date: Date;
  slots: TimeSlot[];
  onSelectSlot: (slot: TimeSlot) => void;
}) {
  const availableSlots = slots.filter(s => s.isAvailable && !s.isBooked);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Available Times - {formatFullDate(date.toISOString())}
      </h3>

      {availableSlots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {availableSlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => onSelectSlot(slot)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-50 dark:bg-green-900/20 
                text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              {formatTime(slot.startTime)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          No available times on this date
        </p>
      )}
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  onCancel,
  onReschedule,
  onJoin,
}: {
  session: Session;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
}) {
  const isPast = new Date(session.endTime) < new Date();
  const isUpcoming = new Date(session.startTime) > new Date();
  const isNow = !isPast && !isUpcoming;

  return (
    <div className={`p-4 rounded-xl border ${
      session.status === 'cancelled' 
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60' 
        : isNow
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start gap-4">
        {/* Mentor Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
          {session.mentorAvatar ? (
            <OptimizedImage src={toCloudinaryAutoUrl(session.mentorAvatar)} alt={session.mentorName} width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-medium">
              {session.mentorName.charAt(0)}
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{session.topic}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">with {session.mentorName}</p>
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              session.status === 'confirmed' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : session.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : session.status === 'cancelled'
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {session.status}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(session.startTime)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </span>
          </div>

          {/* Actions */}
          {session.status !== 'cancelled' && session.status !== 'completed' && (
            <div className="mt-3 flex items-center gap-2">
              {isNow && session.meetingUrl && (
                <Button size="sm" onClick={onJoin}>
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Now
                </Button>
              )}
              {isUpcoming && (
                <>
                  <Button size="sm" variant="outline" onClick={onReschedule}>
                    Reschedule
                  </Button>
                  <button 
                    onClick={onCancel}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Booking Modal
function BookingModal({
  mentor,
  slot,
  onClose,
  onBook,
}: {
  mentor: Mentor | null;
  slot: TimeSlot | null;
  onClose: () => void;
  onBook: (data: { topic: string; description?: string; type: string }) => void;
}) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState(mentor?.sessionTypes[0]?.type || 'one-on-one');
  const [isLoading, setIsLoading] = useState(false);

  if (!mentor || !slot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onBook({ topic, description, type: sessionType });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Book Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session Details */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
              {mentor.avatar ? (
                <OptimizedImage src={toCloudinaryAutoUrl(mentor.avatar)} alt={mentor.name} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {mentor.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{mentor.name}</p>
              <p className="text-sm text-gray-500">{mentor.title}</p>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            <p>{formatFullDate(slot.startTime)}</p>
            <p>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {mentor.sessionTypes.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.type} ({type.duration} min){type.price ? ` - $${type.price}` : ' - Free'}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topic / What would you like to discuss? *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Career transition advice"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any background or specific questions..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading || !topic.trim()}>
            {isLoading ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Reschedule Modal
function RescheduleModal({
  session,
  slot,
  onClose,
  onConfirm,
  isLoading,
}: {
  session: Session | null;
  slot: TimeSlot | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!session || !slot) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reschedule Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="font-medium text-gray-900 dark:text-white">Current</div>
            <div>{formatFullDate(session.startTime)}</div>
            <div>{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="font-medium text-gray-900 dark:text-white">New</div>
            <div>{formatFullDate(slot.startTime)}</div>
            <div>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="flex-1">
            {isLoading ? 'Rescheduling...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function MentorCalendar({ mentorId }: { mentorId?: string }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availability, setAvailability] = useState<MentorAvailability[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsData, mentorsData] = await Promise.all([
        calendarApi.getUpcomingSessions(),
        calendarApi.getMentors(),
      ]);
      setSessions(sessionsData.sessions);
      setMentors(mentorsData.mentors);

      // If mentorId provided, set as selected
      if (mentorId) {
        const mentor = mentorsData.mentors.find(m => m.id === mentorId);
        if (mentor) setSelectedMentor(mentor);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load availability when mentor or month changes
  useEffect(() => {
    if (!selectedMentor) return;

    const loadAvailability = async () => {
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 2, 0);
      try {
        const data = await calendarApi.getMentorAvailability(
          selectedMentor.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        setAvailability(data.availability);
      } catch (error) {
        console.error('Failed to load availability:', error);
      }
    };

    loadAvailability();
  }, [selectedMentor, selectedDate]);

  // Get slots for selected date
  const selectedDateSlots = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayAvailability = availability.find(a => a.date === dateStr);
    return dayAvailability?.slots || [];
  }, [selectedDate, availability]);

  // Book session
  const handleBook = async (data: { topic: string; description?: string; type: string }) => {
    if (!selectedMentor || !selectedSlot) return;
    try {
      const session = await calendarApi.bookSession({
        mentorId: selectedMentor.id,
        slotId: selectedSlot.id,
        type: data.type,
        topic: data.topic,
        description: data.description,
      });
      setSessions(prev => [session, ...prev]);
      setShowBooking(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to book session:', error);
    }
  };

  // Cancel session
  const handleCancel = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    try {
      await calendarApi.cancelSession(sessionId);
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
      ));
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  };

  const handleStartReschedule = (session: Session) => {
    const mentor = mentors.find(m => m.id === session.mentorId) || null;
    setSelectedMentor(mentor);
    setSelectedDate(new Date(session.startTime));
    setRescheduleSession(session);
    setRescheduleSlot(null);
    setShowRescheduleModal(false);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleSession || !rescheduleSlot) return;
    setIsRescheduling(true);
    try {
      const updated = await calendarApi.rescheduleSession(rescheduleSession.id, rescheduleSlot.id);
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setRescheduleSession(null);
      setRescheduleSlot(null);
      setShowRescheduleModal(false);
    } catch (error) {
      console.error('Failed to reschedule session:', error);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Session filter
  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'upcoming') {
      return new Date(s.startTime) >= new Date() && s.status !== 'cancelled';
    }
    return new Date(s.startTime) < new Date();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mentorship Calendar</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Schedule and manage your mentorship sessions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Calendar & Booking */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mentor Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Mentor
            </label>
            <select
              value={selectedMentor?.id || ''}
              onChange={(e) => {
                const mentor = mentors.find(m => m.id === e.target.value);
                setSelectedMentor(mentor || null);
              }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose a mentor...</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name} - {mentor.title}
                </option>
              ))}
            </select>
          </div>

          {/* Calendar */}
          {selectedMentor && (
            <>
              <CalendarGrid
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                availability={availability}
                sessions={sessions}
              />

              {/* Time Slots */}
              <TimeSlots
                date={selectedDate}
                slots={selectedDateSlots}
                onSelectSlot={(slot) => {
                  if (rescheduleSession) {
                    setRescheduleSlot(slot);
                    setShowRescheduleModal(true);
                  } else {
                    setSelectedSlot(slot);
                    setShowBooking(true);
                  }
                }}
              />
            </>
          )}
        </div>

        {/* Right - Sessions */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'past'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Past
            </button>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onCancel={() => handleCancel(session.id)}
                  onReschedule={() => handleStartReschedule(session)}
                  onJoin={() => session.meetingUrl && window.open(session.meetingUrl, '_blank')}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No {activeTab} sessions</p>
                {activeTab === 'upcoming' && (
                  <p className="text-sm mt-1">Select a mentor and book a session</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <BookingModal
          mentor={selectedMentor}
          slot={selectedSlot}
          onClose={() => {
            setShowBooking(false);
            setSelectedSlot(null);
          }}
          onBook={handleBook}
        />
      )}

      {showRescheduleModal && (
        <RescheduleModal
          session={rescheduleSession}
          slot={rescheduleSlot}
          onClose={() => {
            setShowRescheduleModal(false);
            setRescheduleSlot(null);
            setRescheduleSession(null);
          }}
          onConfirm={handleConfirmReschedule}
          isLoading={isRescheduling}
        />
      )}
    </div>
  );
}

export default MentorCalendar;
