'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * AlumniNetwork - Connect with platform alumni
 * 
 * Features:
 * - Browse alumni directory
 * - Filter by industry, location, graduation year
 * - Alumni success stories
 * - Networking and mentorship opportunities
 */

interface Alumni {
  id: string;
  name: string;
  avatar?: string;
  currentRole: string;
  company: string;
  companyLogo?: string;
  industry: string;
  location: string;
  graduationYear: number;
  program: string;
  bio?: string;
  isIndigenous: boolean;
  nation?: string;
  achievements: string[];
  skills: string[];
  isAvailableForMentoring: boolean;
  isConnected: boolean;
  connectionPending: boolean;
  linkedIn?: string;
}

interface SuccessStory {
  id: string;
  alumni: {
    id: string;
    name: string;
    avatar?: string;
    currentRole: string;
    company: string;
  };
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  publishedAt: string;
  views: number;
  likes: number;
  isLiked: boolean;
}

interface AlumniEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  attendees: number;
  maxAttendees?: number;
  isRegistered: boolean;
  host: {
    name: string;
    avatar?: string;
    role: string;
  };
}

interface AlumniStats {
  totalAlumni: number;
  countriesRepresented: number;
  industriesCovered: number;
  mentorsAvailable: number;
  successStoriesCount: number;
}

// API functions
const alumniApi = {
  async getAlumni(params?: {
    industry?: string;
    location?: string;
    graduationYear?: string;
    program?: string;
    mentorsOnly?: boolean;
    search?: string;
  }): Promise<{ alumni: Alumni[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.graduationYear) searchParams.set('graduationYear', params.graduationYear);
    if (params?.program) searchParams.set('program', params.program);
    if (params?.mentorsOnly) searchParams.set('mentorsOnly', 'true');
    if (params?.search) searchParams.set('search', params.search);

    const res = await fetch(`/api/alumni?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch alumni');
    return res.json();
  },

  async getAlumniProfile(alumniId: string): Promise<Alumni> {
    const res = await fetch(`/api/alumni/${alumniId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async connectWithAlumni(alumniId: string, message?: string): Promise<void> {
    const res = await fetch(`/api/alumni/${alumniId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to send connection');
  },

  async getSuccessStories(): Promise<{ stories: SuccessStory[] }> {
    const res = await fetch('/api/alumni/success-stories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stories');
    return res.json();
  },

  async getSuccessStory(storyId: string): Promise<SuccessStory> {
    const res = await fetch(`/api/alumni/success-stories/${storyId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch story');
    return res.json();
  },

  async likeStory(storyId: string): Promise<void> {
    const res = await fetch(`/api/alumni/success-stories/${storyId}/like`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to like story');
  },

  async getEvents(): Promise<{ events: AlumniEvent[] }> {
    const res = await fetch('/api/alumni/events', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async registerForEvent(eventId: string): Promise<void> {
    const res = await fetch(`/api/alumni/events/${eventId}/register`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to register');
  },

  async unregisterFromEvent(eventId: string): Promise<void> {
    const res = await fetch(`/api/alumni/events/${eventId}/register`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unregister');
  },

  async getStats(): Promise<AlumniStats> {
    const res = await fetch('/api/alumni/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
};

// Industries and programs
const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Government',
  'Non-Profit', 'Mining & Resources', 'Construction', 'Retail',
  'Arts & Culture', 'Tourism', 'Agriculture', 'Media', 'Legal'
];

const programs = [
  'Career Transition Program',
  'Leadership Development',
  'Tech Skills Bootcamp',
  'Business Foundations',
  'Indigenous Business',
  'Community Development',
];

const australianCities = [
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
  'Hobart', 'Darwin', 'Canberra', 'Gold Coast', 'Newcastle'
];

// Alumni Card
function AlumniCard({
  alumni,
  onConnect,
  onViewProfile,
}: {
  alumni: Alumni;
  onConnect: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4">
        {alumni.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(alumni.avatar)}
            alt={`${alumni.name} avatar`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {alumni.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{alumni.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{alumni.currentRole}</p>
          <p className="text-sm text-gray-500 truncate">{alumni.company}</p>
          {alumni.isIndigenous && alumni.nation && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
              <span>🌿</span> {alumni.nation}
            </p>
          )}
        </div>
        {alumni.isAvailableForMentoring && (
          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full">
            Mentor
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {alumni.location}
        </span>
        <span>•</span>
        <span>{alumni.industry}</span>
        <span>•</span>
        <span>Class of {alumni.graduationYear}</span>
      </div>

      {/* Skills */}
      {alumni.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {alumni.skills.slice(0, 4).map((skill, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
            >
              {skill}
            </span>
          ))}
          {alumni.skills.length > 4 && (
            <span className="px-2 py-0.5 text-gray-500 text-xs">+{alumni.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Button variant="outline" size="sm" onClick={onViewProfile} className="flex-1">
          View Profile
        </Button>
        {alumni.isConnected ? (
          <Button size="sm" variant="outline" className="flex-1" disabled>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Connected
          </Button>
        ) : alumni.connectionPending ? (
          <Button size="sm" variant="outline" className="flex-1" disabled>
            Pending
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect} className="flex-1">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

// Story Card
function StoryCard({
  story,
  onRead,
  onLike,
}: {
  story: SuccessStory;
  onRead: () => void;
  onLike: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {story.imageUrl && (
        <OptimizedImage
          src={toCloudinaryAutoUrl(story.imageUrl)}
          alt={`${story.title} cover image`}
          width={1200}
          height={192}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          {story.alumni.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(story.alumni.avatar)}
              alt={`${story.alumni.name} avatar`}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
              {story.alumni.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{story.alumni.name}</p>
            <p className="text-xs text-gray-500">{story.alumni.currentRole} at {story.alumni.company}</p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{story.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">{story.excerpt}</p>

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {story.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {story.views}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className={`flex items-center gap-1 transition-colors ${
                story.isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <svg className="w-4 h-4" fill={story.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {story.likes}
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={onRead}>Read More</Button>
        </div>
      </div>
    </div>
  );
}

// Event Card
function EventCard({
  event,
  onRegister,
}: {
  event: AlumniEvent;
  onRegister: () => void;
}) {
  const eventDate = new Date(event.date);
  const isFull = event.maxAttendees ? event.attendees >= event.maxAttendees : false;

  const typeColors = {
    virtual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-person': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    hybrid: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-sm font-medium text-gray-500 uppercase">
            {eventDate.toLocaleDateString('en-AU', { month: 'short' })}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {eventDate.getDate()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${typeColors[event.type]}`}>
              {event.type}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {event.time}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {event.location}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''} attending
        </span>
      </div>

      {/* Host */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {event.host.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(event.host.avatar)}
              alt={`${event.host.name} avatar`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 text-xs">
              {event.host.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.host.name}</p>
            <p className="text-xs text-gray-500">Host</p>
          </div>
        </div>
        {event.isRegistered ? (
          <Button size="sm" variant="outline" onClick={onRegister}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Registered
          </Button>
        ) : (
          <Button size="sm" onClick={onRegister} disabled={isFull}>
            {isFull ? 'Full' : 'Register'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Profile Modal
function ProfileModal({
  alumni,
  onClose,
  onConnect,
}: {
  alumni: Alumni;
  onClose: () => void;
  onConnect: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alumni Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4 mb-6">
            {alumni.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(alumni.avatar)}
                alt={`${alumni.name} avatar`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {alumni.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{alumni.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{alumni.currentRole}</p>
              <div className="flex items-center gap-2 mt-1">
                {alumni.companyLogo && (
                  <OptimizedImage
                    src={toCloudinaryAutoUrl(alumni.companyLogo)}
                    alt={`${alumni.company} logo`}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded"
                  />
                )}
                <span className="text-gray-500">{alumni.company}</span>
              </div>
              {alumni.isIndigenous && alumni.nation && (
                <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                  <span>🌿</span> {alumni.nation}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {alumni.bio && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">About</h4>
              <p className="text-gray-600 dark:text-gray-400">{alumni.bio}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="font-medium text-gray-900 dark:text-white">{alumni.location}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Industry</p>
              <p className="font-medium text-gray-900 dark:text-white">{alumni.industry}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Program</p>
              <p className="font-medium text-gray-900 dark:text-white">{alumni.program}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Graduation Year</p>
              <p className="font-medium text-gray-900 dark:text-white">{alumni.graduationYear}</p>
            </div>
          </div>

          {/* Skills */}
          {alumni.skills.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {alumni.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {alumni.achievements.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Achievements</h4>
              <ul className="space-y-2">
                {alumni.achievements.map((achievement, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-yellow-500">🏆</span>
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {alumni.isConnected ? (
              <Button className="flex-1">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Send Message
              </Button>
            ) : alumni.connectionPending ? (
              <Button className="flex-1" disabled>Request Pending</Button>
            ) : (
              <Button className="flex-1" onClick={onConnect}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Connect
              </Button>
            )}
            {alumni.linkedIn && (
              <a
                href={alumni.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function AlumniNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'stories' | 'events'>('directory');
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [events, setEvents] = useState<AlumniEvent[]>([]);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [mentorsOnly, setMentorsOnly] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [alumniRes, storiesRes, eventsRes, statsRes] = await Promise.all([
        alumniApi.getAlumni({
          search: searchQuery,
          industry: industryFilter,
          location: locationFilter,
          mentorsOnly,
        }),
        alumniApi.getSuccessStories(),
        alumniApi.getEvents(),
        alumniApi.getStats(),
      ]);
      setAlumni(alumniRes.alumni);
      setStories(storiesRes.stories);
      setEvents(eventsRes.events);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, industryFilter, locationFilter, mentorsOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnect = async (alumniId: string) => {
    try {
      await alumniApi.connectWithAlumni(alumniId);
      loadData();
      setSelectedAlumni(null);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleLikeStory = async (storyId: string) => {
    try {
      await alumniApi.likeStory(storyId);
      setStories(prev =>
        prev.map(s =>
          s.id === storyId
            ? { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to like story:', error);
    }
  };

  const handleEventRegister = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    try {
      if (event.isRegistered) {
        await alumniApi.unregisterFromEvent(eventId);
      } else {
        await alumniApi.registerForEvent(eventId);
      }
      loadData();
    } catch (error) {
      console.error('Failed to update registration:', error);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alumni Network</h1>
        <p className="text-gray-500 mt-1">Connect with fellow Ngurra Pathways graduates</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalAlumni.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Alumni</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.mentorsAvailable}</div>
            <div className="text-sm text-gray-500">Mentors</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.industriesCovered}</div>
            <div className="text-sm text-gray-500">Industries</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.countriesRepresented}</div>
            <div className="text-sm text-gray-500">Countries</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-teal-600">{stats.successStoriesCount}</div>
            <div className="text-sm text-gray-500">Success Stories</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['directory', 'stories', 'events'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'stories' ? 'Success Stories' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'directory' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alumni..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Locations</option>
              {australianCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mentorsOnly}
                onChange={(e) => setMentorsOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mentors only</span>
            </label>
          </div>

          {/* Alumni Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alumni.map((member) => (
              <AlumniCard
                key={member.id}
                alumni={member}
                onViewProfile={() => setSelectedAlumni(member)}
                onConnect={() => handleConnect(member.id)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stories' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onRead={() => window.open(`/alumni/stories/${story.id}`, '_blank')}
              onLike={() => handleLikeStory(story.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRegister={() => handleEventRegister(event.id)}
            />
          ))}
        </div>
      )}

      {/* Profile Modal */}
      {selectedAlumni && (
        <ProfileModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onConnect={() => handleConnect(selectedAlumni.id)}
        />
      )}
    </div>
  );
}

export default AlumniNetwork;
