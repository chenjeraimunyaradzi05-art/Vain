'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * EventsManager - Manage and attend events
 * 
 * Features:
 * - Browse upcoming events
 * - Event registration/RSVP
 * - Virtual and in-person events
 * - Calendar integration
 * - My events tracking
 * - Event categories and filtering
 */

interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  type: 'webinar' | 'workshop' | 'networking' | 'career-fair' | 'conference' | 'community' | 'cultural';
  format: 'virtual' | 'in-person' | 'hybrid';
  startDate: string;
  endDate: string;
  timezone: string;
  location?: {
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  virtualUrl?: string;
  image?: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
    organization?: string;
  };
  speakers?: {
    id: string;
    name: string;
    title: string;
    avatar?: string;
    bio?: string;
  }[];
  capacity?: number;
  registeredCount: number;
  isFree: boolean;
  price?: number;
  tags: string[];
  isRegistered: boolean;
  registrationStatus?: 'confirmed' | 'waitlist' | 'cancelled';
  isFeatured?: boolean;
  isIndigenousFocused?: boolean;
  culturalProtocol?: string;
}

interface EventFilter {
  type?: string;
  format?: string;
  dateRange?: 'today' | 'this-week' | 'this-month' | 'upcoming';
  isFree?: boolean;
  isIndigenousFocused?: boolean;
}

// API functions
const eventsApi = {
  async getEvents(filters?: EventFilter): Promise<{ events: Event[] }> {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.format) params.set('format', filters.format);
    if (filters?.dateRange) params.set('dateRange', filters.dateRange);
    if (filters?.isFree !== undefined) params.set('isFree', String(filters.isFree));
    if (filters?.isIndigenousFocused) params.set('indigenousFocused', 'true');
    
    const res = await fetch(`/api/events?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getEvent(id: string): Promise<Event> {
    const res = await fetch(`/api/events/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  },

  async getMyEvents(): Promise<{ events: Event[] }> {
    const res = await fetch('/api/events/my-events', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch my events');
    return res.json();
  },

  async registerForEvent(id: string): Promise<{ status: 'confirmed' | 'waitlist' }> {
    const res = await fetch(`/api/events/${id}/register`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to register for event');
    return res.json();
  },

  async cancelRegistration(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}/register`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to cancel registration');
  },

  async addToCalendar(id: string): Promise<{ calendarUrl: string }> {
    const res = await fetch(`/api/events/${id}/calendar`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to add to calendar');
    return res.json();
  },
};

// Event type config
const eventTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  webinar: { label: 'Webinar', icon: '🎥', color: 'blue' },
  workshop: { label: 'Workshop', icon: '🛠️', color: 'purple' },
  networking: { label: 'Networking', icon: '🤝', color: 'green' },
  'career-fair': { label: 'Career Fair', icon: '💼', color: 'orange' },
  conference: { label: 'Conference', icon: '🎤', color: 'indigo' },
  community: { label: 'Community', icon: '👥', color: 'teal' },
  cultural: { label: 'Cultural', icon: '🎨', color: 'amber' },
};

// Format config
const formatConfig: Record<string, { label: string; icon: string }> = {
  virtual: { label: 'Virtual', icon: '💻' },
  'in-person': { label: 'In-Person', icon: '📍' },
  hybrid: { label: 'Hybrid', icon: '🔀' },
};

// Date formatting
function formatEventDate(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return `${startDate.toLocaleDateString('en-AU', options)} - ${endDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  return `${startDate.toLocaleDateString('en-AU', options)} - ${endDate.toLocaleDateString('en-AU', options)}`;
}

function isEventSoon(date: string): boolean {
  const eventDate = new Date(date);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  return diff > 0 && diff < 24 * 60 * 60 * 1000; // within 24 hours
}

function isEventLive(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

// Event Card Component
function EventCard({
  event,
  onView,
  onRegister,
  onCancel,
}: {
  event: Event;
  onView: () => void;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const typeConfig = eventTypeConfig[event.type] || eventTypeConfig.community;
  const format = formatConfig[event.format] || formatConfig.virtual;
  const isLive = isEventLive(event.startDate, event.endDate);
  const isSoon = isEventSoon(event.startDate);
  const isFull = event.capacity ? event.registeredCount >= event.capacity : false;
  const spotsLeft = event.capacity ? event.capacity - event.registeredCount : null;

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onView}
    >
      {/* Image */}
      {event.image && (
        <div className="relative h-40 bg-gray-100 dark:bg-gray-900">
          <OptimizedImage
            src={toCloudinaryAutoUrl(event.image)}
            alt={`${event.title} event image`}
            width={1200}
            height={160}
            className="w-full h-full object-cover"
          />
          {event.isFeatured && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded">
              Featured
            </span>
          )}
          {isLive && (
            <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live Now
            </span>
          )}
          {!isLive && isSoon && (
            <span className="absolute top-3 right-3 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded">
              Starting Soon
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Type & Format badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 text-xs font-medium rounded bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30 text-${typeConfig.color}-700 dark:text-${typeConfig.color}-400`}>
            {typeConfig.icon} {typeConfig.label}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            {format.icon} {format.label}
          </span>
          {event.isIndigenousFocused && (
            <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              🤝 Indigenous Focused
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{event.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {event.shortDescription || event.description}
        </p>

        {/* Date & Location */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatEventDate(event.startDate, event.endDate)}</span>
          </div>
          {event.format !== 'virtual' && event.location && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>
                {event.location.venue && `${event.location.venue}, `}
                {event.location.city}, {event.location.state}
              </span>
            </div>
          )}
        </div>

        {/* Host */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {event.host.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(event.host.avatar)}
              alt={`${event.host.name} avatar`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm font-medium">
              {event.host.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.host.name}</p>
            {event.host.organization && (
              <p className="text-xs text-gray-500 truncate">{event.host.organization}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 text-sm">
            {event.isFree ? (
              <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
            ) : (
              <span className="text-gray-900 dark:text-white font-medium">${event.price}</span>
            )}
            {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
              <span className="text-orange-600 dark:text-orange-400 text-xs">
                {spotsLeft} spots left
              </span>
            )}
            {isFull && !event.isRegistered && (
              <span className="text-red-600 dark:text-red-400 text-xs">Full</span>
            )}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            {event.isRegistered ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  event.registrationStatus === 'waitlist'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {event.registrationStatus === 'waitlist' ? 'Waitlisted' : 'Registered'}
                </span>
                <Button variant="outline" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={onRegister} disabled={isFull}>
                {isFull ? 'Join Waitlist' : 'Register'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  onClose,
  onRegister,
  onCancel,
}: {
  event: Event;
  onClose: () => void;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const typeConfig = eventTypeConfig[event.type] || eventTypeConfig.community;
  const format = formatConfig[event.format] || formatConfig.virtual;
  const isLive = isEventLive(event.startDate, event.endDate);

  const handleAddToCalendar = async () => {
    try {
      const { calendarUrl } = await eventsApi.addToCalendar(event.id);
      window.open(calendarUrl, '_blank');
    } catch (error) {
      console.error('Failed to add to calendar:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Image header */}
        {event.image && (
          <div className="relative h-48 bg-gray-100 dark:bg-gray-900 flex-shrink-0">
            <OptimizedImage
              src={toCloudinaryAutoUrl(event.image)}
              alt={`${event.title} event image`}
              width={1200}
              height={192}
              className="w-full h-full object-cover"
            />
            {isLive && (
              <span className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Live Now
              </span>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30 text-${typeConfig.color}-700 dark:text-${typeConfig.color}-400`}>
              {typeConfig.icon} {typeConfig.label}
            </span>
            <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              {format.icon} {format.label}
            </span>
            {event.isIndigenousFocused && (
              <span className="px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                🤝 Indigenous Focused
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{event.title}</h1>

          {/* Date & Location */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatEventDate(event.startDate, event.endDate)}</span>
            </div>
            {event.format !== 'virtual' && event.location && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <div>
                  {event.location.venue && <p className="font-medium">{event.location.venue}</p>}
                  <p>{event.location.address}, {event.location.city}, {event.location.state}</p>
                </div>
              </div>
            )}
            {event.format !== 'in-person' && event.virtualUrl && event.isRegistered && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <a href={event.virtualUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Join Virtual Event
                </a>
              </div>
            )}
          </div>

          {/* Cultural Protocol */}
          {event.culturalProtocol && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500 mb-6">
              <h3 className="font-medium text-amber-900 dark:text-amber-200 mb-1">Cultural Protocol</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">{event.culturalProtocol}</p>
            </div>
          )}

          {/* Description */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            {event.description.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Speakers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.speakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {speaker.avatar ? (
                      <OptimizedImage
                        src={toCloudinaryAutoUrl(speaker.avatar)}
                        alt={`${speaker.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                        {speaker.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{speaker.name}</p>
                      <p className="text-sm text-gray-500">{speaker.title}</p>
                      {speaker.bio && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{speaker.bio}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Hosted by</p>
            <div className="flex items-center gap-3">
              {event.host.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(event.host.avatar)}
                  alt={`${event.host.name} avatar`}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                  {event.host.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{event.host.name}</p>
                {event.host.organization && (
                  <p className="text-sm text-gray-500">{event.host.organization}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {event.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              {event.isFree ? (
                <span className="text-green-600 dark:text-green-400 font-semibold text-lg">Free</span>
              ) : (
                <span className="text-gray-900 dark:text-white font-semibold text-lg">${event.price}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {event.registeredCount} registered
              {event.capacity && ` of ${event.capacity}`}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {event.isRegistered && (
              <Button variant="outline" onClick={handleAddToCalendar}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </Button>
            )}
            {event.isRegistered ? (
              <Button variant="outline" onClick={onCancel}>
                Cancel Registration
              </Button>
            ) : (
              <Button onClick={onRegister}>
                Register Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function EventsManager() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [view, setView] = useState<'upcoming' | 'my-events'>('upcoming');
  const [filters, setFilters] = useState<EventFilter>({});

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsRes, myEventsRes] = await Promise.all([
        eventsApi.getEvents(filters),
        eventsApi.getMyEvents(),
      ]);
      setEvents(eventsRes.events);
      setMyEvents(myEventsRes.events);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRegister = async (eventId: string) => {
    try {
      await eventsApi.registerForEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Failed to register:', error);
    }
  };

  const handleCancelRegistration = async (eventId: string) => {
    try {
      await eventsApi.cancelRegistration(eventId);
      await loadEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(prev => prev ? { ...prev, isRegistered: false } : null);
      }
    } catch (error) {
      console.error('Failed to cancel registration:', error);
    }
  };

  const displayedEvents = view === 'my-events' ? myEvents : events;

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-gray-500 mt-1">Discover and join upcoming events</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView('upcoming')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            view === 'upcoming'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Upcoming Events
        </button>
        <button
          onClick={() => setView('my-events')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            view === 'my-events'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          My Events ({myEvents.length})
        </button>
      </div>

      {/* Filters */}
      {view === 'upcoming' && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Types</option>
            {Object.entries(eventTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.icon} {config.label}</option>
            ))}
          </select>

          <select
            value={filters.format || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value || undefined }))}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Formats</option>
            {Object.entries(formatConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.icon} {config.label}</option>
            ))}
          </select>

          <select
            value={filters.dateRange || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as EventFilter['dateRange'] || undefined }))}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isFree || false}
              onChange={(e) => setFilters(prev => ({ ...prev, isFree: e.target.checked || undefined }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Free Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isIndigenousFocused || false}
              onChange={(e) => setFilters(prev => ({ ...prev, isIndigenousFocused: e.target.checked || undefined }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Indigenous Focused</span>
          </label>
        </div>
      )}

      {/* Events Grid */}
      {displayedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onView={() => setSelectedEvent(event)}
              onRegister={() => handleRegister(event.id)}
              onCancel={() => handleCancelRegistration(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {view === 'my-events' ? 'No registered events' : 'No events found'}
          </h3>
          <p className="text-gray-500 mt-2">
            {view === 'my-events' 
              ? 'Browse upcoming events and register to attend'
              : 'Check back later for new events'
            }
          </p>
          {view === 'my-events' && (
            <Button className="mt-4" onClick={() => setView('upcoming')}>
              Browse Events
            </Button>
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRegister={() => handleRegister(selectedEvent.id)}
          onCancel={() => handleCancelRegistration(selectedEvent.id)}
        />
      )}
    </div>
  );
}

export default EventsManager;
