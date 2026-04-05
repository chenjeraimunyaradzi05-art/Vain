'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * MentorshipProgram - Comprehensive mentorship platform
 * 
 * Features:
 * - Browse available mentors
 * - Apply to mentorship programs
 * - Track mentorship relationships
 * - Cultural mentorship circles
 * - Goal setting and progress tracking
 */

interface Mentor {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  company: string;
  bio: string;
  expertise: string[];
  industries: string[];
  yearsExperience: number;
  isIndigenous: boolean;
  culturalBackground?: string;
  availability: 'accepting' | 'waitlist' | 'closed';
  menteeCount: number;
  maxMentees: number;
  rating: number;
  reviewCount: number;
  programTypes: ('career' | 'technical' | 'leadership' | 'cultural' | 'business')[];
  preferredMeetingType: 'virtual' | 'in-person' | 'hybrid';
  location?: string;
  languages: string[];
  freeForIndigenous: boolean;
}

interface MentorshipProgram {
  id: string;
  name: string;
  description: string;
  duration: string;
  frequency: string;
  type: 'one-on-one' | 'group' | 'circle';
  focusAreas: string[];
  requirements: string[];
  benefits: string[];
  applicationDeadline?: string;
  startDate: string;
  spotsAvailable: number;
  totalSpots: number;
  mentors: Mentor[];
  isIndigenousFocused: boolean;
}

interface MentorshipRelationship {
  id: string;
  mentor: Mentor;
  program: MentorshipProgram;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt: string;
  endsAt?: string;
  nextMeeting?: {
    date: string;
    type: string;
    agenda?: string;
  };
  goals: MentorshipGoal[];
  meetingsCompleted: number;
  lastActivity: string;
}

interface MentorshipGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  milestones: {
    id: string;
    title: string;
    isCompleted: boolean;
  }[];
  progress: number;
}

interface MentorReview {
  id: string;
  mentorId: string;
  reviewer: {
    name: string;
    avatar?: string;
    title: string;
  };
  rating: number;
  content: string;
  createdAt: string;
  helpfulCount: number;
}

// API functions
const mentorshipApi = {
  async getMentors(params?: {
    expertise?: string;
    industry?: string;
    availability?: string;
  }): Promise<{ mentors: Mentor[] }> {
    const searchParams = new URLSearchParams();
    if (params?.expertise) searchParams.set('expertise', params.expertise);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.availability) searchParams.set('availability', params.availability);

    const res = await fetch(`/api/mentorship/mentors?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch mentors');
    return res.json();
  },

  async getMentor(id: string): Promise<Mentor> {
    const res = await fetch(`/api/mentorship/mentors/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch mentor');
    return res.json();
  },

  async getMentorReviews(mentorId: string): Promise<{ reviews: MentorReview[] }> {
    const res = await fetch(`/api/mentorship/mentors/${mentorId}/reviews`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getPrograms(): Promise<{ programs: MentorshipProgram[] }> {
    const res = await fetch('/api/mentorship/programs', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch programs');
    return res.json();
  },

  async applyToProgram(programId: string, data: {
    motivation: string;
    goals: string[];
    preferredMentorId?: string;
  }): Promise<void> {
    const res = await fetch(`/api/mentorship/programs/${programId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to apply');
  },

  async getMyMentorships(): Promise<{ mentorships: MentorshipRelationship[] }> {
    const res = await fetch('/api/mentorship/my-mentorships', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch mentorships');
    return res.json();
  },

  async createGoal(mentorshipId: string, data: Partial<MentorshipGoal>): Promise<MentorshipGoal> {
    const res = await fetch(`/api/mentorship/${mentorshipId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },

  async updateGoal(mentorshipId: string, goalId: string, data: Partial<MentorshipGoal>): Promise<MentorshipGoal> {
    const res = await fetch(`/api/mentorship/${mentorshipId}/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update goal');
    return res.json();
  },

  async toggleMilestone(mentorshipId: string, goalId: string, milestoneId: string): Promise<void> {
    const res = await fetch(`/api/mentorship/${mentorshipId}/goals/${goalId}/milestones/${milestoneId}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to toggle milestone');
  },

  async becomeMentor(data: Partial<Mentor>): Promise<void> {
    const res = await fetch('/api/mentorship/become-mentor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit application');
  },
};

// Expertise areas
const expertiseAreas = [
  'Software Engineering',
  'Product Management',
  'Data Science',
  'UX Design',
  'Marketing',
  'Sales',
  'Finance',
  'HR & Recruitment',
  'Leadership',
  'Entrepreneurship',
  'Indigenous Business',
  'Cultural Leadership',
];

// Industries
const industries = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Government',
  'Non-Profit',
  'Mining',
  'Agriculture',
  'Arts & Culture',
  'Consulting',
];

// Star Rating Component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClasses} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Mentor Card Component
function MentorCard({
  mentor,
  onViewProfile,
  onApply,
}: {
  mentor: Mentor;
  onViewProfile: () => void;
  onApply: () => void;
}) {
  const availabilityConfig = {
    accepting: { label: 'Accepting', color: 'bg-green-100 text-green-700' },
    waitlist: { label: 'Waitlist', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: 'Not Accepting', color: 'bg-gray-100 text-gray-700' },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {mentor.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(mentor.avatar)}
              alt={`${mentor.name} avatar`}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {mentor.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{mentor.name}</h3>
              {mentor.isIndigenous && (
                <span className="text-lg" title="Indigenous Mentor">🪶</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{mentor.title}</p>
            <p className="text-sm text-gray-500">{mentor.company}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${availabilityConfig[mentor.availability].color}`}>
            {availabilityConfig[mentor.availability].label}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={Math.round(mentor.rating)} />
          <span className="text-sm text-gray-500">
            {mentor.rating.toFixed(1)} ({mentor.reviewCount} reviews)
          </span>
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{mentor.bio}</p>

        {/* Expertise */}
        <div className="flex flex-wrap gap-1 mb-4">
          {mentor.expertise.slice(0, 3).map((exp, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
            >
              {exp}
            </span>
          ))}
          {mentor.expertise.length > 3 && (
            <span className="text-xs text-gray-500">+{mentor.expertise.length - 3}</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span>{mentor.yearsExperience}+ years</span>
          <span>{mentor.menteeCount}/{mentor.maxMentees} mentees</span>
          {mentor.freeForIndigenous && (
            <span className="text-green-600">Free for Indigenous</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewProfile} className="flex-1">
            View Profile
          </Button>
          <Button onClick={onApply} className="flex-1" disabled={mentor.availability === 'closed'}>
            {mentor.availability === 'waitlist' ? 'Join Waitlist' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Program Card Component
function ProgramCard({
  program,
  onApply,
}: {
  program: MentorshipProgram;
  onApply: () => void;
}) {
  const typeConfig = {
    'one-on-one': { label: '1:1 Mentorship', icon: '👤' },
    group: { label: 'Group Program', icon: '👥' },
    circle: { label: 'Mentoring Circle', icon: '⭕' },
  };

  const spotsLeft = program.totalSpots - program.spotsAvailable;
  const fillPercentage = (spotsLeft / program.totalSpots) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {program.isIndigenousFocused && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm font-medium">
          🪶 Indigenous-Focused Program
        </div>
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-2xl">{typeConfig[program.type].icon}</span>
            <span className="ml-2 text-sm text-gray-500">{typeConfig[program.type].label}</span>
          </div>
          {program.applicationDeadline && (
            <span className="text-sm text-orange-600">
              Apply by {new Date(program.applicationDeadline).toLocaleDateString('en-AU')}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{program.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{program.description}</p>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📅</span>
            <span className="text-gray-600 dark:text-gray-400">{program.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🔄</span>
            <span className="text-gray-600 dark:text-gray-400">{program.frequency}</span>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="flex flex-wrap gap-1 mb-4">
          {program.focusAreas.slice(0, 3).map((area, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
            >
              {area}
            </span>
          ))}
        </div>

        {/* Spots */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Spots Available</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {program.spotsAvailable} / {program.totalSpots}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Mentors Preview */}
        {program.mentors.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {program.mentors.slice(0, 3).map((mentor) => (
                mentor.avatar ? (
                  <OptimizedImage
                    key={mentor.id}
                    src={toCloudinaryAutoUrl(mentor.avatar)}
                    alt={`${mentor.name} avatar`}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                  />
                ) : (
                  <div
                    key={mentor.id}
                    className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium"
                  >
                    {mentor.name.charAt(0)}
                  </div>
                )
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {program.mentors.length} mentor{program.mentors.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <Button onClick={onApply} className="w-full" disabled={program.spotsAvailable === 0}>
          {program.spotsAvailable === 0 ? 'No Spots Available' : 'Apply Now'}
        </Button>
      </div>
    </div>
  );
}

// Mentorship Relationship Card
function RelationshipCard({
  relationship,
  onViewDetails,
}: {
  relationship: MentorshipRelationship;
  onViewDetails: () => void;
}) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    active: { label: 'Active', color: 'bg-green-100 text-green-700' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  };

  const completedGoals = relationship.goals.filter(g => g.status === 'completed').length;
  const totalGoals = relationship.goals.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4 mb-4">
        {relationship.mentor.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(relationship.mentor.avatar)}
            alt={`${relationship.mentor.name} avatar`}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {relationship.mentor.name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{relationship.mentor.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[relationship.status].color}`}>
              {statusConfig[relationship.status].label}
            </span>
          </div>
          <p className="text-sm text-gray-500">{relationship.program.name}</p>
        </div>
      </div>

      {/* Next Meeting */}
      {relationship.nextMeeting && relationship.status === 'active' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600">📅</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Next: {new Date(relationship.nextMeeting.date).toLocaleDateString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {relationship.nextMeeting.agenda && (
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">{relationship.nextMeeting.agenda}</p>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Goals Completed</span>
          <span className="font-medium text-gray-900 dark:text-white">{completedGoals}/{totalGoals}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: totalGoals > 0 ? `${(completedGoals / totalGoals) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{relationship.meetingsCompleted} meetings completed</span>
          <span>Since {new Date(relationship.startedAt).toLocaleDateString('en-AU')}</span>
        </div>
      </div>

      <Button variant="outline" onClick={onViewDetails} className="w-full">
        View Details
      </Button>
    </div>
  );
}

// Application Modal
function ApplicationModal({
  mentor,
  program,
  onClose,
  onSubmit,
}: {
  mentor?: Mentor;
  program?: MentorshipProgram;
  onClose: () => void;
  onSubmit: (data: { motivation: string; goals: string[]; preferredMentorId?: string }) => void;
}) {
  const [motivation, setMotivation] = useState('');
  const [goals, setGoals] = useState<string[]>(['', '', '']);

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const handleSubmit = () => {
    const filteredGoals = goals.filter(g => g.trim());
    if (!motivation.trim() || filteredGoals.length === 0) return;
    onSubmit({
      motivation: motivation.trim(),
      goals: filteredGoals,
      preferredMentorId: mentor?.id,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mentor ? `Apply to work with ${mentor.name}` : `Apply to ${program?.name}`}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mentor/Program Info */}
          {mentor && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {mentor.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(mentor.avatar)}
                  alt={`${mentor.name} avatar`}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {mentor.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{mentor.name}</h3>
                <p className="text-sm text-gray-500">{mentor.title} at {mentor.company}</p>
              </div>
            </div>
          )}

          {/* Motivation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Why are you interested in this mentorship? *
            </label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={4}
              placeholder="Share your motivation and what you hope to gain..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What are your top goals? *
            </label>
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <input
                  key={index}
                  type="text"
                  value={goal}
                  onChange={(e) => updateGoal(index, e.target.value)}
                  placeholder={`Goal ${index + 1}`}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Application Tips</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Be specific about what you want to achieve</li>
              <li>• Explain why this mentor/program is right for you</li>
              <li>• Share your commitment level and availability</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!motivation.trim() || !goals.some(g => g.trim())}
          >
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function MentorshipProgram() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'find' | 'programs' | 'my-mentorships'>('find');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [programs, setPrograms] = useState<MentorshipProgram[]>([]);
  const [myMentorships, setMyMentorships] = useState<MentorshipRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [expertiseFilter, setExpertiseFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Modals
  const [applyingToMentor, setApplyingToMentor] = useState<Mentor | null>(null);
  const [applyingToProgram, setApplyingToProgram] = useState<MentorshipProgram | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mentorsRes, programsRes, mentorshipsRes] = await Promise.all([
        mentorshipApi.getMentors({
          expertise: expertiseFilter,
          industry: industryFilter,
          availability: availabilityFilter,
        }),
        mentorshipApi.getPrograms(),
        mentorshipApi.getMyMentorships(),
      ]);
      setMentors(mentorsRes.mentors);
      setPrograms(programsRes.programs);
      setMyMentorships(mentorshipsRes.mentorships);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [expertiseFilter, industryFilter, availabilityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = async (data: { motivation: string; goals: string[]; preferredMentorId?: string }) => {
    try {
      if (applyingToProgram) {
        await mentorshipApi.applyToProgram(applyingToProgram.id, data);
      }
      // Handle mentor application similarly
      setApplyingToMentor(null);
      setApplyingToProgram(null);
      loadData();
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mentorship</h1>
        <p className="text-gray-500 mt-1">Connect with mentors and accelerate your career</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{mentors.length}</div>
          <div className="text-sm text-gray-500">Mentors</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{programs.length}</div>
          <div className="text-sm text-gray-500">Programs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{myMentorships.filter(m => m.status === 'active').length}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {mentors.filter(m => m.isIndigenous).length}
          </div>
          <div className="text-sm text-gray-500">Indigenous Mentors</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'find', label: 'Find Mentors' },
          { key: 'programs', label: 'Programs' },
          { key: 'my-mentorships', label: 'My Mentorships' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'find' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={expertiseFilter}
              onChange={(e) => setExpertiseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Expertise</option>
              {expertiseAreas.map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Any Availability</option>
              <option value="accepting">Accepting</option>
              <option value="waitlist">Waitlist</option>
            </select>
          </div>

          {/* Mentors Grid */}
          {mentors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor) => (
                <MentorCard
                  key={mentor.id}
                  mentor={mentor}
                  onViewProfile={() => window.location.href = `/mentors/${mentor.id}`}
                  onApply={() => setApplyingToMentor(mentor)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No mentors found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.length > 0 ? (
            programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onApply={() => setApplyingToProgram(program)}
              />
            ))
          ) : (
            <div className="col-span-3 text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No programs available</h3>
              <p className="text-gray-500 mt-2">Check back soon for new programs</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-mentorships' && (
        <div>
          {myMentorships.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {myMentorships.map((relationship) => (
                <RelationshipCard
                  key={relationship.id}
                  relationship={relationship}
                  onViewDetails={() => window.location.href = `/mentorships/${relationship.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No mentorships yet</h3>
              <p className="text-gray-500 mt-2 mb-6">Find a mentor or join a program to get started</p>
              <Button onClick={() => setActiveTab('find')}>Browse Mentors</Button>
            </div>
          )}
        </div>
      )}

      {/* Application Modal */}
      {(applyingToMentor || applyingToProgram) && (
        <ApplicationModal
          mentor={applyingToMentor || undefined}
          program={applyingToProgram || undefined}
          onClose={() => {
            setApplyingToMentor(null);
            setApplyingToProgram(null);
          }}
          onSubmit={handleApply}
        />
      )}
    </div>
  );
}

export default MentorshipProgram;
