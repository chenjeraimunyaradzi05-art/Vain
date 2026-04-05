'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * InterviewScheduler - Interview scheduling and management for employers
 * 
 * Features:
 * - Calendar view
 * - Interview scheduling
 * - Candidate notifications
 * - Interview panel management
 */

interface Interview {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    currentRole?: string;
  };
  jobId: string;
  job: {
    id: string;
    title: string;
  };
  type: 'phone-screen' | 'video' | 'in-person' | 'technical' | 'panel' | 'final';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show';
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  meetingLink?: string;
  interviewers: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }[];
  notes?: string;
  feedback?: {
    rating: number;
    recommendation: 'strong-yes' | 'yes' | 'neutral' | 'no' | 'strong-no';
    comments: string;
    submittedBy: string;
    submittedAt: string;
  }[];
  createdAt: string;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  interviews: Interview[];
}

type InterviewQueryParams = Record<string, string>;

interface ScheduleInterviewData {
  candidateId: string;
  jobId: string;
  type: Interview['type'];
  date: string;
  startTime: string;
  endTime: string;
  interviewerIds: string[];
  location?: string;
  meetingLink?: string;
  notes?: string;
}

interface FeedbackData {
  rating: number;
  recommendation: string;
  comments: string;
  strengths?: string;
  improvements?: string;
}

interface SelectOption {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
  role?: string;
}

// API functions
const interviewsApi = {
  async getInterviews(params: InterviewQueryParams): Promise<{ interviews: Interview[]; total: number }> {
    const query = new URLSearchParams(params);
    const res = await api<{ interviews: Interview[]; total: number }>(`/employer/interviews?${query.toString()}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch interviews');
    return res.data;
  },

  async getInterview(id: string): Promise<Interview> {
    const res = await api<Interview>(`/employer/interviews/${id}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch interview');
    return res.data;
  },

  async scheduleInterview(data: ScheduleInterviewData): Promise<Interview> {
    const res = await api<Interview>('/employer/interviews', {
      method: 'POST',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to schedule interview');
    return res.data;
  },

  async updateInterview(id: string, data: Partial<ScheduleInterviewData>): Promise<Interview> {
    const res = await api<Interview>(`/employer/interviews/${id}`, {
      method: 'PUT',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to update interview');
    return res.data;
  },

  async cancelInterview(id: string, reason: string): Promise<void> {
    const res = await api(`/employer/interviews/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to cancel interview');
  },

  async submitFeedback(interviewId: string, data: FeedbackData): Promise<void> {
    const res = await api(`/employer/interviews/${interviewId}/feedback`, {
      method: 'POST',
      body: data,
    });
    if (!res.ok) throw new Error(res.error || 'Failed to submit feedback');
  },

  async getAvailableSlots(params: InterviewQueryParams): Promise<TimeSlot[]> {
    const query = new URLSearchParams(params);
    const res = await api<TimeSlot[]>(`/employer/interviews/available-slots?${query.toString()}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch slots');
    return res.data;
  },

  async getTeamMembers(): Promise<SelectOption[]> {
    const res = await api<SelectOption[]>('/employer/team');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch team');
    return res.data;
  },

  async getCandidates(jobId?: string): Promise<SelectOption[]> {
    const query = jobId ? `?jobId=${jobId}` : '';
    const res = await api<SelectOption[]>(`/employer/candidates${query}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch candidates');
    return res.data;
  },

  async getJobs(): Promise<SelectOption[]> {
    const res = await api<SelectOption[]>('/employer/jobs');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch jobs');
    return res.data;
  },
};

const INTERVIEW_TYPES: { type: Interview['type']; label: string; icon: string; color: string }[] = [
  { type: 'phone-screen', label: 'Phone Screen', icon: '📞', color: 'bg-blue-100 text-blue-700' },
  { type: 'video', label: 'Video Call', icon: '🎥', color: 'bg-purple-100 text-purple-700' },
  { type: 'in-person', label: 'In Person', icon: '🏢', color: 'bg-green-100 text-green-700' },
  { type: 'technical', label: 'Technical', icon: '💻', color: 'bg-orange-100 text-orange-700' },
  { type: 'panel', label: 'Panel', icon: '👥', color: 'bg-pink-100 text-pink-700' },
  { type: 'final', label: 'Final', icon: '🎯', color: 'bg-red-100 text-red-700' },
];

const STATUS_STYLES: Record<Interview['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  'no-show': 'bg-red-100 text-red-700',
};

// Calendar Component
function CalendarView({
  interviews,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onSelectInterview,
}: {
  interviews: Interview[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
  onSelectInterview: (interview: Interview) => void;
}) {
  const today = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: CalendarDay[] = [];

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(firstDay);
    date.setDate(date.getDate() - i - 1);
    days.push({
      date: date.toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false,
      interviews: [],
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      interviews: interviews.filter(int => int.date === dateStr),
    });
  }

  // Next month days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(lastDay);
    date.setDate(date.getDate() + i);
    days.push({
      date: date.toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false,
      interviews: [],
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onPrevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          ◀
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {currentMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          ▶
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => (
          <div
            key={idx}
            onClick={() => day.isCurrentMonth && onSelectDate(day.date)}
            className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 ${
              !day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''
            }`}
          >
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
              day.isToday
                ? 'bg-blue-500 text-white'
                : day.isCurrentMonth
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400'
            }`}>
              {new Date(day.date).getDate()}
            </div>
            <div className="space-y-1">
              {day.interviews.slice(0, 2).map((interview) => {
                const typeInfo = INTERVIEW_TYPES.find(t => t.type === interview.type);
                return (
                  <div
                    key={interview.id}
                    onClick={(e) => { e.stopPropagation(); onSelectInterview(interview); }}
                    className={`text-xs p-1 rounded truncate ${typeInfo?.color || 'bg-gray-100'}`}
                  >
                    {interview.startTime} {interview.candidate.name.split(' ')[0]}
                  </div>
                );
              })}
              {day.interviews.length > 2 && (
                <div className="text-xs text-gray-500">+{day.interviews.length - 2} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interview Card
function InterviewCard({
  interview,
  onClick,
}: {
  interview: Interview;
  onClick: () => void;
}) {
  const typeInfo = INTERVIEW_TYPES.find(t => t.type === interview.type);
  const interviewDate = new Date(interview.date);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {interview.candidate.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(interview.candidate.avatar)}
                alt={`${interview.candidate.name} avatar`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{interview.candidate.name[0]}</span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{interview.candidate.name}</p>
            <p className="text-sm text-gray-500">{interview.job.title}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[interview.status]}`}>
          {interview.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs ${typeInfo?.color}`}>
          {typeInfo?.icon} {typeInfo?.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>📅 {interviewDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
        <span>🕐 {interview.startTime} - {interview.endTime}</span>
      </div>

      {interview.interviewers.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 mr-2">Panel:</span>
          <div className="flex -space-x-2">
            {interview.interviewers.slice(0, 3).map((interviewer) => (
              <div
                key={interviewer.id}
                className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                title={interviewer.name}
              >
                {interviewer.avatar ? (
                  <OptimizedImage
                    src={toCloudinaryAutoUrl(interviewer.avatar)}
                    alt={`${interviewer.name} avatar`}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">{interviewer.name[0]}</span>
                )}
              </div>
            ))}
            {interview.interviewers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-500">
                +{interview.interviewers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Schedule Interview Modal
function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSchedule,
  candidates,
  jobs,
  teamMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleInterviewData) => void;
  candidates: SelectOption[];
  jobs: SelectOption[];
  teamMembers: SelectOption[];
}) {
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [type, setType] = useState<Interview['type']>('video');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSchedule({
      candidateId,
      jobId,
      type,
      date,
      startTime,
      endTime,
      interviewerIds,
      location,
      meetingLink,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Interview</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Candidate *
              </label>
              <select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              >
                <option value="">Select candidate</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Position *
              </label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              >
                <option value="">Select job</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interview Type *
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setType(t.type)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    type === t.type
                      ? t.color
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interviewers
            </label>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setInterviewerIds(
                      interviewerIds.includes(member.id)
                        ? interviewerIds.filter(id => id !== member.id)
                        : [...interviewerIds, member.id]
                    );
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    interviewerIds.includes(member.id)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <OptimizedImage
                        src={toCloudinaryAutoUrl(member.avatar)}
                        alt={`${member.name} avatar`}
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs">{member.name[0]}</span>
                    )}
                  </div>
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {type === 'in-person' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office address or room"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          )}

          {(type === 'video' || type === 'phone-screen') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/..."
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes for Interviewers
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Topics to cover, specific questions..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!candidateId || !jobId || !date || !startTime || !endTime}
          >
            Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// Feedback Modal
function FeedbackModal({
  interview,
  isOpen,
  onClose,
  onSubmit,
}: {
  interview: Interview | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FeedbackData) => void;
}) {
  const [rating, setRating] = useState(3);
  const [recommendation, setRecommendation] = useState<string>('neutral');
  const [comments, setComments] = useState('');

  if (!isOpen || !interview) return null;

  const RECOMMENDATIONS = [
    { value: 'strong-yes', label: 'Strong Yes', icon: '🌟', color: 'bg-green-100 text-green-700' },
    { value: 'yes', label: 'Yes', icon: '👍', color: 'bg-green-50 text-green-600' },
    { value: 'neutral', label: 'Neutral', icon: '🤔', color: 'bg-gray-100 text-gray-600' },
    { value: 'no', label: 'No', icon: '👎', color: 'bg-red-50 text-red-600' },
    { value: 'strong-no', label: 'Strong No', icon: '❌', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit Feedback</h2>
          <p className="text-sm text-gray-500 mt-1">{interview.candidate.name} - {interview.job.title}</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-3xl hover:scale-110 transition-transform"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recommendation
            </label>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDATIONS.map((rec) => (
                <button
                  key={rec.value}
                  onClick={() => setRecommendation(rec.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    recommendation === rec.value ? rec.color : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {rec.icon} {rec.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Your feedback on the candidate..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ rating, recommendation, comments })}>
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function InterviewScheduler() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });

  const loadInterviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const { interviews: data } = await interviewsApi.getInterviews({
        month: currentMonth.toISOString().slice(0, 7),
        ...filters,
      });
      setInterviews(data);
    } catch (error) {
      console.error('Failed to load interviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, filters]);

  const loadFormData = useCallback(async () => {
    try {
      const [candidatesData, jobsData, teamData] = await Promise.all([
        interviewsApi.getCandidates(),
        interviewsApi.getJobs(),
        interviewsApi.getTeamMembers(),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
      setTeamMembers(teamData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleSchedule = async (data: ScheduleInterviewData) => {
    try {
      await interviewsApi.scheduleInterview(data);
      setShowScheduleModal(false);
      loadInterviews();
    } catch (error) {
      console.error('Failed to schedule:', error);
    }
  };

  const handleSubmitFeedback = async (data: FeedbackData) => {
    if (!selectedInterview) return;
    try {
      await interviewsApi.submitFeedback(selectedInterview.id, data);
      setShowFeedbackModal(false);
      loadInterviews();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const upcomingInterviews = interviews.filter(i =>
    i.status === 'scheduled' && new Date(i.date) >= new Date()
  ).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interview Scheduler</h1>
          <p className="text-gray-500 mt-1">Manage and schedule candidate interviews</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)}>
          📅 Schedule Interview
        </Button>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg text-sm ${
              view === 'calendar' ? 'bg-white dark:bg-gray-700 shadow' : ''
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm ${
              view === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''
            }`}
          >
            📋 List
          </button>
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">All Types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.icon} {t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : view === 'calendar' ? (
            <CalendarView
              interviews={interviews}
              currentMonth={currentMonth}
              onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              onSelectDate={() => {}}
              onSelectInterview={setSelectedInterview}
            />
          ) : (
            <div className="space-y-4">
              {interviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No interviews scheduled
                  </h3>
                  <p className="text-gray-500 mb-4">Schedule your first interview</p>
                  <Button onClick={() => setShowScheduleModal(true)}>Schedule Interview</Button>
                </div>
              ) : (
                interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    onClick={() => setSelectedInterview(interview)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upcoming</h3>
            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming interviews</p>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                      {interview.candidate.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(interview.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} • {interview.startTime}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">This Month</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Scheduled</span>
                <span className="font-medium">{interviews.filter(i => i.status === 'scheduled').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium">{interviews.filter(i => i.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cancelled</span>
                <span className="font-medium">{interviews.filter(i => i.status === 'cancelled').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleInterviewModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        candidates={candidates}
        jobs={jobs}
        teamMembers={teamMembers}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        interview={selectedInterview}
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}

export default InterviewScheduler;
