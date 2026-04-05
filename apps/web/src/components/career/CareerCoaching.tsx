'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CareerCoaching - Career coaching and mentorship matching
 * 
 * Features:
 * - Find career coaches
 * - Book coaching sessions
 * - Goal setting and tracking
 * - Session notes and resources
 * - Indigenous career pathways support
 */

interface Coach {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  specialties: string[];
  industries: string[];
  experience: number; // years
  rating: number;
  reviewCount: number;
  hourlyRate?: number;
  isFreeForIndigenous: boolean;
  isIndigenous: boolean;
  nation?: string;
  bio: string;
  credentials: string[];
  languages: string[];
  availability: string[];
  sessionTypes: ('video' | 'audio' | 'chat')[];
  isVerified: boolean;
}

interface CoachingSession {
  id: string;
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  scheduledAt: string;
  duration: number; // minutes
  type: 'video' | 'audio' | 'chat';
  status: 'upcoming' | 'completed' | 'cancelled';
  topic?: string;
  notes?: string;
  resources?: { name: string; url: string }[];
  goals?: string[];
  feedback?: {
    rating: number;
    comment: string;
  };
}

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'job' | 'education' | 'leadership' | 'personal';
  targetDate: string;
  progress: number;
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
  }[];
  coachId?: string;
  coachName?: string;
}

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

// API functions
const coachingApi = {
  async getCoaches(params?: {
    specialty?: string;
    industry?: string;
    freeForIndigenous?: boolean;
  }): Promise<{ coaches: Coach[] }> {
    const searchParams = new URLSearchParams();
    if (params?.specialty) searchParams.set('specialty', params.specialty);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.freeForIndigenous) searchParams.set('freeForIndigenous', 'true');

    const res = await fetch(`/api/coaching/coaches?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch coaches');
    return res.json();
  },

  async getCoach(coachId: string): Promise<Coach> {
    const res = await fetch(`/api/coaching/coaches/${coachId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch coach');
    return res.json();
  },

  async getCoachAvailability(coachId: string, date: string): Promise<{ slots: TimeSlot[] }> {
    const res = await fetch(`/api/coaching/coaches/${coachId}/availability?date=${date}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },

  async bookSession(data: {
    coachId: string;
    date: string;
    time: string;
    duration: number;
    type: 'video' | 'audio' | 'chat';
    topic?: string;
  }): Promise<CoachingSession> {
    const res = await fetch('/api/coaching/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to book session');
    return res.json();
  },

  async getMySessions(): Promise<{ sessions: CoachingSession[] }> {
    const res = await fetch('/api/coaching/sessions', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async cancelSession(sessionId: string): Promise<void> {
    const res = await fetch(`/api/coaching/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to cancel session');
  },

  async submitFeedback(sessionId: string, rating: number, comment: string): Promise<void> {
    const res = await fetch(`/api/coaching/sessions/${sessionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
  },

  async getGoals(): Promise<{ goals: CareerGoal[] }> {
    const res = await fetch('/api/coaching/goals', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },

  async createGoal(data: Omit<CareerGoal, 'id' | 'milestones'>): Promise<CareerGoal> {
    const res = await fetch('/api/coaching/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },

  async updateGoal(goalId: string, data: Partial<CareerGoal>): Promise<CareerGoal> {
    const res = await fetch(`/api/coaching/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update goal');
    return res.json();
  },

  async toggleMilestone(goalId: string, milestoneId: string): Promise<void> {
    const res = await fetch(`/api/coaching/goals/${goalId}/milestones/${milestoneId}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to toggle milestone');
  },
};

// Specialties
const specialties = [
  { value: 'career-transition', label: 'Career Transition' },
  { value: 'leadership', label: 'Leadership Development' },
  { value: 'executive', label: 'Executive Coaching' },
  { value: 'interview-prep', label: 'Interview Preparation' },
  { value: 'resume-review', label: 'Resume & Personal Branding' },
  { value: 'salary-negotiation', label: 'Salary Negotiation' },
  { value: 'work-life-balance', label: 'Work-Life Balance' },
  { value: 'indigenous-pathways', label: 'Indigenous Career Pathways' },
];

// Goal categories
const goalCategories = [
  { value: 'skill', label: 'Skill Development', icon: '🎯', color: 'blue' },
  { value: 'job', label: 'Job/Role Change', icon: '💼', color: 'green' },
  { value: 'education', label: 'Education/Training', icon: '📚', color: 'purple' },
  { value: 'leadership', label: 'Leadership Growth', icon: '👑', color: 'yellow' },
  { value: 'personal', label: 'Personal Development', icon: '🌱', color: 'teal' },
];

// Star Rating
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Coach Card
function CoachCard({
  coach,
  onViewProfile,
  onBook,
}: {
  coach: Coach;
  onViewProfile: () => void;
  onBook: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4">
        {coach.avatar ? (
          <OptimizedImage src={toCloudinaryAutoUrl(coach.avatar)} alt={coach.name} width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {coach.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{coach.name}</h3>
            {coach.isVerified && (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{coach.title}</p>
          {coach.isIndigenous && coach.nation && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
              <span>🌿</span> {coach.nation}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <StarRating rating={coach.rating} size="sm" />
          <span className="text-gray-600 dark:text-gray-400">
            {coach.rating.toFixed(1)} ({coach.reviewCount})
          </span>
        </div>
        <span className="text-gray-400">•</span>
        <span className="text-gray-600 dark:text-gray-400">{coach.experience}+ years</span>
      </div>

      {/* Specialties */}
      <div className="mt-4 flex flex-wrap gap-1">
        {coach.specialties.slice(0, 3).map((specialty, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
          >
            {specialty}
          </span>
        ))}
        {coach.specialties.length > 3 && (
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
            +{coach.specialties.length - 3}
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="mt-4 flex items-center justify-between">
        {coach.isFreeForIndigenous ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-sm font-medium rounded-full">
            Free for Indigenous members
          </span>
        ) : coach.hourlyRate ? (
          <span className="text-gray-900 dark:text-white font-semibold">
            ${coach.hourlyRate}/hour
          </span>
        ) : (
          <span className="text-green-600 font-medium">Free</span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Button variant="outline" size="sm" onClick={onViewProfile} className="flex-1">
          View Profile
        </Button>
        <Button size="sm" onClick={onBook} className="flex-1">
          Book Session
        </Button>
      </div>
    </div>
  );
}

// Session Card
function SessionCard({
  session,
  onCancel,
  onJoin,
  onViewNotes,
  onLeaveFeedback,
}: {
  session: CoachingSession;
  onCancel: () => void;
  onJoin: () => void;
  onViewNotes: () => void;
  onLeaveFeedback: () => void;
}) {
  const sessionDate = new Date(session.scheduledAt);
  const isUpcoming = session.status === 'upcoming';
  const isPast = session.status === 'completed';

  const typeIcons = {
    video: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    audio: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    chat: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };

  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {session.coachAvatar ? (
            <OptimizedImage src={toCloudinaryAutoUrl(session.coachAvatar)} alt={session.coachName} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
              {session.coachName.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{session.coachName}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {typeIcons[session.type]}
              <span className="capitalize">{session.type} session</span>
              <span>•</span>
              <span>{session.duration} min</span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[session.status]}`}>
          {session.status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{sessionDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{sessionDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {session.topic && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Topic:</span> {session.topic}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {isUpcoming && (
          <>
            <Button size="sm" onClick={onJoin}>Join Session</Button>
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </>
        )}
        {isPast && (
          <>
            {session.notes && (
              <Button variant="outline" size="sm" onClick={onViewNotes}>View Notes</Button>
            )}
            {!session.feedback && (
              <Button size="sm" onClick={onLeaveFeedback}>Leave Feedback</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Goal Card
function GoalCard({
  goal,
  onToggleMilestone,
  onEdit,
}: {
  goal: CareerGoal;
  onToggleMilestone: (milestoneId: string) => void;
  onEdit: () => void;
}) {
  const category = goalCategories.find(c => c.value === goal.category);
  const completedMilestones = goal.milestones.filter(m => m.completed).length;
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category?.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
            <p className="text-sm text-gray-500">{category?.label}</p>
          </div>
        </div>
        <button onClick={onEdit} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {goal.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{goal.description}</p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="font-medium text-gray-900 dark:text-white">{goal.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Target Date */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-500">Target: {new Date(goal.targetDate).toLocaleDateString('en-AU')}</span>
        <span className={`font-medium ${daysRemaining < 0 ? 'text-red-500' : daysRemaining < 30 ? 'text-yellow-500' : 'text-green-500'}`}>
          {daysRemaining < 0 ? 'Overdue' : `${daysRemaining} days left`}
        </span>
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestones ({completedMilestones}/{goal.milestones.length})
          </h4>
          <div className="space-y-2">
            {goal.milestones.map((milestone) => (
              <label
                key={milestone.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={milestone.completed}
                  onChange={() => onToggleMilestone(milestone.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-sm ${
                  milestone.completed
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {milestone.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      {goal.coachName && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Coach: {goal.coachName}</span>
        </div>
      )}
    </div>
  );
}

// Booking Modal
function BookingModal({
  coach,
  onClose,
  onBook,
}: {
  coach: Coach;
  onClose: () => void;
  onBook: (data: { date: string; time: string; duration: number; type: 'video' | 'audio' | 'chat'; topic?: string }) => void;
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [sessionType, setSessionType] = useState<'video' | 'audio' | 'chat'>('video');
  const [topic, setTopic] = useState('');
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setIsLoadingSlots(true);
      coachingApi.getCoachAvailability(coach.id, selectedDate)
        .then(res => setAvailability(res.slots))
        .catch(console.error)
        .finally(() => setIsLoadingSlots(false));
    }
  }, [coach.id, selectedDate]);

  const handleSubmit = () => {
    if (selectedDate && selectedTime) {
      onBook({ date: selectedDate, time: selectedTime, duration, type: sessionType, topic });
    }
  };

  // Get next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book Session</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">with {coach.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((date) => {
                const d = new Date(date);
                return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-center ${
                      selectedDate === date
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-xs">{d.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                    <div className="font-medium">{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Time
              </label>
              {isLoadingSlots ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availability.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        selectedTime === slot.time
                          ? 'bg-blue-600 text-white'
                          : slot.available
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-lg ${
                    duration === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Type
            </label>
            <div className="flex gap-2">
              {coach.sessionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSessionType(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg capitalize ${
                    sessionType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What would you like to discuss? (optional)
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Career transition to tech industry, Interview preparation..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime}
            className="flex-1"
          >
            Book Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CareerCoaching() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'coaches' | 'sessions' | 'goals'>('coaches');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  
  // Filters
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [coachesRes, sessionsRes, goalsRes] = await Promise.all([
        coachingApi.getCoaches({ specialty: specialtyFilter, freeForIndigenous: freeOnly }),
        coachingApi.getMySessions(),
        coachingApi.getGoals(),
      ]);
      setCoaches(coachesRes.coaches);
      setSessions(sessionsRes.sessions);
      setGoals(goalsRes.goals);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [specialtyFilter, freeOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookSession = async (data: { date: string; time: string; duration: number; type: 'video' | 'audio' | 'chat'; topic?: string }) => {
    if (!selectedCoach) return;
    
    try {
      await coachingApi.bookSession({
        coachId: selectedCoach.id,
        ...data,
      });
      setShowBooking(false);
      setSelectedCoach(null);
      loadData();
    } catch (error) {
      console.error('Failed to book session:', error);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;
    
    try {
      await coachingApi.cancelSession(sessionId);
      loadData();
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    try {
      await coachingApi.toggleMilestone(goalId, milestoneId);
      loadData();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Career Coaching</h1>
        <p className="text-gray-500 mt-1">Connect with coaches to accelerate your career</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['coaches', 'sessions', 'goals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'sessions' && upcomingSessions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {upcomingSessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'coaches' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Specialties</option>
              {specialties.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Free for Indigenous members</span>
            </label>
          </div>

          {/* Coaches Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                onViewProfile={() => setSelectedCoach(coach)}
                onBook={() => { setSelectedCoach(coach); setShowBooking(true); }}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Sessions ({upcomingSessions.length})
            </h2>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onCancel={() => handleCancelSession(session.id)}
                    onJoin={() => window.open(`/coaching/session/${session.id}`, '_blank')}
                    onViewNotes={() => {}}
                    onLeaveFeedback={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-medium text-gray-900 dark:text-white">No upcoming sessions</h3>
                <p className="text-gray-500 mt-1 mb-4">Book a session with a coach to get started</p>
                <Button onClick={() => setActiveTab('coaches')}>Find a Coach</Button>
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Past Sessions
              </h2>
              <div className="space-y-4">
                {pastSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onCancel={() => {}}
                    onJoin={() => {}}
                    onViewNotes={() => {}}
                    onLeaveFeedback={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <div>
          {/* Add Goal Button */}
          <div className="flex justify-end mb-6">
            <Button onClick={() => {}}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Goal
            </Button>
          </div>

          {goals.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onToggleMilestone={(milestoneId) => handleToggleMilestone(goal.id, milestoneId)}
                  onEdit={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No career goals yet</h3>
              <p className="text-gray-500 mt-2 mb-4">Set goals to track your career progress</p>
              <Button>Create Your First Goal</Button>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && selectedCoach && (
        <BookingModal
          coach={selectedCoach}
          onClose={() => { setShowBooking(false); setSelectedCoach(null); }}
          onBook={handleBookSession}
        />
      )}
    </div>
  );
}

export default CareerCoaching;
