'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CulturalCalendar - Calendar for Indigenous cultural events
 * 
 * Features:
 * - View cultural events and significant dates
 * - RSVP to events
 * - Filter by event type and region
 * - Add to personal calendar
 * - Community event submissions
 */

interface CulturalEvent {
  id: string;
  title: string;
  description: string;
  type: 'ceremony' | 'workshop' | 'festival' | 'meeting' | 'commemoration' | 'celebration';
  startDate: string;
  endDate?: string;
  location?: {
    name: string;
    address?: string;
    isVirtual: boolean;
    meetingUrl?: string;
  };
  region?: string;
  imageUrl?: string;
  organizer: {
    id: string;
    name: string;
    avatar?: string;
  };
  isPublic: boolean;
  attendeeCount: number;
  maxAttendees?: number;
  isRsvped: boolean;
  tags: string[];
  culturalSignificance?: string;
}

interface SignificantDate {
  id: string;
  title: string;
  date: string;
  description: string;
  type: 'national' | 'regional' | 'seasonal';
  isRecurring: boolean;
}

// API functions
const culturalApi = {
  async getEvents(params?: { 
    startDate?: string; 
    endDate?: string; 
    type?: string; 
    region?: string;
  }): Promise<{ events: CulturalEvent[] }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.region) searchParams.set('region', params.region);
    const res = await fetch(`/api/cultural/events?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getSignificantDates(): Promise<{ dates: SignificantDate[] }> {
    const res = await fetch('/api/cultural/significant-dates', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch significant dates');
    return res.json();
  },

  async rsvpEvent(eventId: string): Promise<void> {
    const res = await fetch(`/api/cultural/events/${eventId}/rsvp`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to RSVP');
  },

  async cancelRsvp(eventId: string): Promise<void> {
    const res = await fetch(`/api/cultural/events/${eventId}/rsvp`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to cancel RSVP');
  },

  async getUpcomingEvents(): Promise<{ events: CulturalEvent[] }> {
    const res = await fetch('/api/cultural/events/upcoming', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch upcoming events');
    return res.json();
  },
};

// Event type config
const eventTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  ceremony: { label: 'Ceremony', color: 'purple', icon: '🪶' },
  workshop: { label: 'Workshop', color: 'blue', icon: '🎨' },
  festival: { label: 'Festival', color: 'orange', icon: '🎉' },
  meeting: { label: 'Community Meeting', color: 'green', icon: '🤝' },
  commemoration: { label: 'Commemoration', color: 'gray', icon: '🕯️' },
  celebration: { label: 'Celebration', color: 'pink', icon: '✨' },
};

// Regions
const regions = [
  'All Regions',
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
];

// Format helpers
function formatEventDate(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  if (!endDate || new Date(endDate).toDateString() === start.toDateString()) {
    return start.toLocaleString('en-AU', options);
  }
  
  return `${start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

// Event Card Component
function EventCard({
  event,
  onRsvp,
  onViewDetails,
}: {
  event: CulturalEvent;
  onRsvp: () => void;
  onViewDetails: () => void;
}) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.celebration;
  const isFull = event.maxAttendees && event.attendeeCount >= event.maxAttendees;
  const isPast = new Date(event.endDate || event.startDate) < new Date();

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
        overflow-hidden hover:shadow-lg transition-shadow ${isPast ? 'opacity-60' : ''}`}
    >
      {/* Event Image */}
      {event.imageUrl && (
        <div className="relative h-40">
          <OptimizedImage src={toCloudinaryAutoUrl(event.imageUrl)} alt={event.title} width={400} height={160} className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${config.color}-100 text-${config.color}-700`}>
              {config.icon} {config.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Type badge (if no image) */}
        {!event.imageUrl && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full 
            bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-700 dark:text-${config.color}-400 mb-2`}>
            {config.icon} {config.label}
          </span>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{event.title}</h3>

        {/* Date & Location */}
        <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <p className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatEventDate(event.startDate, event.endDate)}
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              {event.location.isVirtual ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {event.location.isVirtual ? 'Virtual Event' : event.location.name}
            </p>
          )}
        </div>

        {/* Region & Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {event.region && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              {event.region}
            </span>
          )}
          {event.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              {tag}
            </span>
          ))}
        </div>

        {/* Attendees & Action */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900 dark:text-white">{event.attendeeCount}</span>
            {event.maxAttendees && <span> / {event.maxAttendees}</span>}
            <span> attending</span>
          </div>

          {!isPast && (
            event.isRsvped ? (
              <button
                onClick={onRsvp}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-lg flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Going
              </button>
            ) : isFull ? (
              <span className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg">
                Full
              </span>
            ) : (
              <Button size="sm" onClick={onRsvp}>RSVP</Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Significant Date Card
function SignificantDateCard({ date }: { date: SignificantDate }) {
  const eventDate = new Date(date.date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isPast = eventDate < new Date();

  return (
    <div className={`p-4 rounded-lg border-l-4 ${
      date.type === 'national' 
        ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' 
        : date.type === 'seasonal'
          ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
          : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    } ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{date.title}</h4>
            {isToday && (
              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                Today
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{date.description}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-gray-900 dark:text-white">
            {eventDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </p>
          {date.isRecurring && (
            <p className="text-xs text-gray-500">Annual</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  onClose,
  onRsvp,
}: {
  event: CulturalEvent;
  onClose: () => void;
  onRsvp: () => void;
}) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.celebration;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header Image */}
        {event.imageUrl && (
          <div className="relative h-48">
            <OptimizedImage src={toCloudinaryAutoUrl(event.imageUrl)} alt={event.title} width={600} height={192} className="w-full h-full object-cover" />
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Close button if no image */}
          {!event.imageUrl && (
            <div className="flex justify-end mb-4">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Type & Title */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full 
            bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-700 dark:text-${config.color}-400`}>
            {config.icon} {config.label}
          </span>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{event.title}</h2>

          {/* Details Grid */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Date & Time</p>
                <p className="text-sm text-gray-500">{formatEventDate(event.startDate, event.endDate)}</p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Location</p>
                  <p className="text-sm text-gray-500">
                    {event.location.isVirtual ? 'Virtual Event' : event.location.name}
                  </p>
                  {event.location.address && (
                    <p className="text-sm text-gray-400">{event.location.address}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Organizer</p>
                <p className="text-sm text-gray-500">{event.organizer.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Attendees</p>
                <p className="text-sm text-gray-500">
                  {event.attendeeCount} {event.maxAttendees && `/ ${event.maxAttendees}`} attending
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">About this event</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{event.description}</p>
          </div>

          {/* Cultural Significance */}
          {event.culturalSignificance && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">Cultural Significance</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">{event.culturalSignificance}</p>
            </div>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button 
            className="flex-1" 
            onClick={onRsvp}
            variant={event.isRsvped ? 'outline' : 'primary'}
          >
            {event.isRsvped ? 'Cancel RSVP' : 'RSVP Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CulturalCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [significantDates, setSignificantDates] = useState<SignificantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEvent, setSelectedEvent] = useState<CulturalEvent | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsData, datesData] = await Promise.all([
        culturalApi.getEvents({
          type: selectedType !== 'all' ? selectedType : undefined,
          region: selectedRegion !== 'All Regions' ? selectedRegion : undefined,
        }),
        culturalApi.getSignificantDates(),
      ]);
      setEvents(eventsData.events);
      setSignificantDates(datesData.dates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, selectedRegion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle RSVP
  const handleRsvp = async (event: CulturalEvent) => {
    try {
      if (event.isRsvped) {
        await culturalApi.cancelRsvp(event.id);
      } else {
        await culturalApi.rsvpEvent(event.id);
      }
      setEvents(prev => prev.map(e => 
        e.id === event.id 
          ? { 
              ...e, 
              isRsvped: !e.isRsvped,
              attendeeCount: e.isRsvped ? e.attendeeCount - 1 : e.attendeeCount + 1,
            } 
          : e
      ));
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          isRsvped: !prev.isRsvped,
          attendeeCount: prev.isRsvped ? prev.attendeeCount - 1 : prev.attendeeCount + 1,
        } : null);
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
    }
  };

  // Upcoming significant dates
  const upcomingDates = significantDates.filter(d => 
    new Date(d.date) >= new Date(new Date().setHours(0, 0, 0, 0))
  ).slice(0, 5);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cultural Calendar</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Connect with your community through cultural events and significant dates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedType === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                All Types
              </button>
              {Object.entries(eventTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1 transition-colors ${
                    selectedType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* View Mode */}
            <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Events Grid/List */}
          {events.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-6' 
              : 'space-y-4'
            }>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRsvp={() => handleRsvp(event)}
                  onViewDetails={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No events found
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Significant Dates */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Significant Dates
            </h2>
            <div className="space-y-3">
              {upcomingDates.map((date) => (
                <SignificantDateCard key={date.id} date={date} />
              ))}
              {upcomingDates.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming dates
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRsvp={() => handleRsvp(selectedEvent)}
        />
      )}
    </div>
  );
}

export default CulturalCalendar;
