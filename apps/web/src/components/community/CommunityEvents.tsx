'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CommunityEvents - Community events and gatherings
 * 
 * Features:
 * - Event discovery
 * - Event registration
 * - Virtual and in-person events
 * - Cultural events calendar
 */

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'networking' | 'cultural' | 'career-fair' | 'webinar' | 'meetup' | 'celebration';
  format: 'in-person' | 'virtual' | 'hybrid';
  startDate: string;
  endDate: string;
  location?: {
    venue: string;
    address: string;
    city: string;
    state: string;
  };
  virtualLink?: string;
  image?: string;
  organizer: {
    id: string;
    name: string;
    avatar?: string;
    type: 'organization' | 'user' | 'ngurra';
  };
  attendees: number;
  maxAttendees?: number;
  isRegistered: boolean;
  isFree: boolean;
  price?: number;
  tags: string[];
  isIndigenousEvent: boolean;
  requiresApproval: boolean;
}

interface EventCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// API functions
const eventsApi = {
  async getEvents(filters: any): Promise<{ events: CommunityEvent[]; total: number }> {
    const params = new URLSearchParams(filters);
    const response = await api(`/events?${params.toString()}`);
    if (!response.ok) return { events: [], total: 0 };
    
    const data = response.data;
    const events = (data?.events || []).map((e: any) => ({
      id: String(e.id),
      title: e.title,
      description: e.description,
      type: (e.eventType || 'meetup') as any,
      format: e.virtualLink ? 'virtual' : 'in-person',
      startDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      endDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      location: e.location ? {
        venue: e.location,
        address: '',
        city: (typeof e.location === 'string' ? e.location : ''),
        state: '',
      } : undefined,
      virtualLink: e.virtualLink || undefined,
      image: undefined,
      organizer: {
        id: String(e.organizer?.id ?? 'org'),
        name: e.organizer ? `${e.organizer.firstName ?? ''} ${e.organizer.lastName ?? ''}`.trim() : 'Community',
        avatar: e.organizer?.avatar,
        type: 'organization',
      },
      attendees: e.attendeeCount ?? 0,
      maxAttendees: e.capacity ?? undefined,
      isRegistered: !!e.isRegistered,
      isFree: e.isFree !== false,
      price: e.price ?? undefined,
      tags: [],
      isIndigenousEvent: false,
      requiresApproval: false,
    }));
    return { events, total: data?.pagination?.total ?? data?.pagination?.totalPages ? (data.pagination.total ?? 0) : (events.length) };
  },

  async getEvent(id: string): Promise<CommunityEvent> {
    const response = await api(`/events/${id}`);
    if (!response.ok || !response.data) throw new Error('Failed to load event');
    
    const e = response.data;
    return {
      id: String(e.id),
      title: e.title,
      description: e.description,
      type: (e.eventType || 'meetup') as any,
      format: e.virtualLink ? 'virtual' : 'in-person',
      startDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      endDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      location: e.location ? {
        venue: e.location,
        address: '',
        city: (typeof e.location === 'string' ? e.location : ''),
        state: '',
      } : undefined,
      virtualLink: e.virtualLink || undefined,
      image: undefined,
      organizer: {
        id: String(e.organizer?.id ?? 'org'),
        name: e.organizer ? `${e.organizer.firstName ?? ''} ${e.organizer.lastName ?? ''}`.trim() : 'Community',
        avatar: e.organizer?.avatar,
        type: 'organization',
      },
      attendees: e.attendeeCount ?? 0,
      maxAttendees: e.capacity ?? undefined,
      isRegistered: !!e.isRegistered,
      isFree: e.isFree !== false,
      price: e.price ?? undefined,
      tags: [],
      isIndigenousEvent: false,
      requiresApproval: false,
    };
  },

  async registerForEvent(eventId: string): Promise<void> {
    await api(`/events/${eventId}/register`, { method: 'POST' });
  },

  async cancelRegistration(eventId: string): Promise<void> {
    await api(`/events/${eventId}/register`, { method: 'DELETE' });
  },

  async getCategories(): Promise<EventCategory[]> {
    const response = await api('/events/categories');
    const categories = response.data;
    return Array.isArray(categories) ? categories : [];
  },

  async getMyEvents(): Promise<CommunityEvent[]> {
    const response = await api('/events/my-events');
    if (!response.ok) return [];
    
    const data = response.data;
    const events = (data?.events || []).map((e: any) => ({
      id: String(e.id),
      title: e.title,
      description: e.description,
      type: (e.eventType || 'meetup') as any,
      format: e.virtualLink ? 'virtual' : 'in-person',
      startDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      endDate: (e.eventDate ? new Date(e.eventDate) : new Date()).toISOString(),
      location: e.location ? {
        venue: e.location,
        address: '',
        city: (typeof e.location === 'string' ? e.location : ''),
        state: '',
      } : undefined,
      virtualLink: e.virtualLink || undefined,
      image: undefined,
      organizer: {
        id: String(e.organizer?.id ?? 'org'),
        name: e.organizer ? `${e.organizer.firstName ?? ''} ${e.organizer.lastName ?? ''}`.trim() : 'Community',
        avatar: e.organizer?.avatar,
        type: 'organization',
      },
      attendees: e._count?.registrations ?? e.attendeeCount ?? 0,
      maxAttendees: e.capacity ?? undefined,
      isRegistered: true,
      isFree: e.isFree !== false,
      price: e.price ?? undefined,
      tags: [],
      isIndigenousEvent: false,
      requiresApproval: false,
    }));
    return events;
  },
};

const EVENT_TYPES: { type: CommunityEvent['type']; label: string; icon: string }[] = [
  { type: 'workshop', label: 'Workshop', icon: '🛠️' },
  { type: 'networking', label: 'Networking', icon: '🤝' },
  { type: 'cultural', label: 'Cultural', icon: '🌏' },
  { type: 'career-fair', label: 'Career Fair', icon: '💼' },
  { type: 'webinar', label: 'Webinar', icon: '💻' },
  { type: 'meetup', label: 'Meetup', icon: '👥' },
  { type: 'celebration', label: 'Celebration', icon: '🎉' },
];

// Event Card
function EventCard({
  event,
  onRegister,
  onClick,
}: {
  event: CommunityEvent;
  onRegister: () => void;
  onClick: () => void;
}) {
  const typeInfo = EVENT_TYPES.find(t => t.type === event.type);
  const startDate = new Date(event.startDate);
  const isUpcoming = startDate > new Date();
  const isFull = event.maxAttendees && event.attendees >= event.maxAttendees;

  const formatColors = {
    'in-person': 'bg-green-100 text-green-700',
    'virtual': 'bg-blue-100 text-blue-700',
    'hybrid': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-r from-blue-500 to-purple-500">
        {event.image && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(event.image)}
            alt={`${event.title} event image`}
            width={1200}
            height={160}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${formatColors[event.format]}`}>
            {event.format}
          </span>
          {event.isIndigenousEvent && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              🌏 Indigenous
            </span>
          )}
        </div>
        {event.isFree && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">
            FREE
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{typeInfo?.icon}</span>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {startDate.getDate()}
            </div>
            <div className="text-xs text-gray-500 uppercase">
              {startDate.toLocaleDateString('en-AU', { month: 'short' })}
            </div>
          </div>
        </div>

        <h3
          className="font-semibold text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-blue-600"
          onClick={onClick}
        >
          {event.title}
        </h3>

        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>

        {/* Location/Time */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🕐</span>
            <span>
              {startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>📍</span>
              <span>{event.location.city}, {event.location.state}</span>
            </div>
          )}
          {event.format === 'virtual' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>💻</span>
              <span>Online Event</span>
            </div>
          )}
        </div>

        {/* Organizer */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {event.organizer.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(event.organizer.avatar)}
                alt={`${event.organizer.name} avatar`}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs">🏢</span>
            )}
          </div>
          <span className="text-sm text-gray-500">{event.organizer.name}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            👥 {event.attendees}{event.maxAttendees && ` / ${event.maxAttendees}`}
          </div>
          {isUpcoming && (
            event.isRegistered ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                ✓ Registered
              </span>
            ) : isFull ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-sm">
                Full
              </span>
            ) : (
              <Button size="sm" onClick={onRegister}>
                Register
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  isOpen,
  onClose,
  onRegister,
  onCancel,
}: {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onCancel: () => void;
}) {
  if (!isOpen || !event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const typeInfo = EVENT_TYPES.find(t => t.type === event.type);
  const isUpcoming = startDate > new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Image */}
        <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-500">
          {event.image && (
            <OptimizedImage
              src={toCloudinaryAutoUrl(event.image)}
              alt={`${event.title} event image`}
              width={1200}
              height={192}
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 text-center p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {startDate.getDate()}
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {startDate.toLocaleDateString('en-AU', { month: 'short' })}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {typeInfo?.icon} {typeInfo?.label}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-sm">
                  {event.format}
                </span>
                {event.isIndigenousEvent && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
                    🌏 Indigenous Event
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Date & Time</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - 
                {endDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Location</p>
              {event.location ? (
                <>
                  <p className="font-medium text-gray-900 dark:text-white">{event.location.venue}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{event.location.address}</p>
                </>
              ) : (
                <p className="font-medium text-gray-900 dark:text-white">Online Event</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About This Event</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {event.organizer.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(event.organizer.avatar)}
                  alt={`${event.organizer.name} avatar`}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">🏢</span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Organized by</p>
              <p className="font-medium text-gray-900 dark:text-white">{event.organizer.name}</p>
            </div>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-500">
                👥 {event.attendees} attending
                {event.maxAttendees && ` • ${event.maxAttendees - event.attendees} spots left`}
              </p>
              {!event.isFree && (
                <p className="font-semibold text-gray-900 dark:text-white">${event.price}</p>
              )}
            </div>
            {isUpcoming && (
              event.isRegistered ? (
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                    ✓ You're registered
                  </span>
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={onRegister}>
                  {event.requiresApproval ? 'Request to Join' : 'Register Now'}
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Filters Bar
function FiltersBar({
  filters,
  onChange,
}: {
  filters: any;
  onChange: (filters: any) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search events..."
            value={filters.query || ''}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          />
        </div>

        {/* Type */}
        <select
          value={filters.type || ''}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
        >
          <option value="">All Types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type.type} value={type.type}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>

        {/* Format */}
        <select
          value={filters.format || ''}
          onChange={(e) => onChange({ ...filters, format: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
        >
          <option value="">All Formats</option>
          <option value="in-person">In Person</option>
          <option value="virtual">Virtual</option>
          <option value="hybrid">Hybrid</option>
        </select>

        {/* Indigenous Only */}
        <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={filters.indigenousOnly || false}
            onChange={(e) => onChange({ ...filters, indigenousOnly: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">🌏 Indigenous Events</span>
        </label>

        {/* Free Only */}
        <label className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={filters.freeOnly || false}
            onChange={(e) => onChange({ ...filters, freeOnly: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Free Events</span>
        </label>
      </div>
    </div>
  );
}

// Main Component
export function CommunityEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [myEvents, setMyEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-events'>('discover');
  const [filters, setFilters] = useState({
    query: '',
    type: '',
    format: '',
    indigenousOnly: false,
    freeOnly: false,
  });

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { events: data } = await eventsApi.getEvents(filters);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadMyEvents = useCallback(async () => {
    try {
      const data = await eventsApi.getMyEvents();
      setMyEvents(data);
    } catch (error) {
      console.error('Failed to load my events:', error);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadMyEvents();
  }, [loadEvents, loadMyEvents]);

  const handleRegister = async (eventId: string) => {
    try {
      await eventsApi.registerForEvent(eventId);
      loadEvents();
      loadMyEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, isRegistered: true, attendees: selectedEvent.attendees + 1 });
      }
    } catch (error) {
      console.error('Failed to register:', error);
    }
  };

  const handleCancelRegistration = async (eventId: string) => {
    try {
      await eventsApi.cancelRegistration(eventId);
      loadEvents();
      loadMyEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, isRegistered: false, attendees: selectedEvent.attendees - 1 });
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const displayEvents = activeTab === 'my-events' ? myEvents : events;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Community Events</h1>
          <p className="text-gray-500 mt-1">Connect, learn, and celebrate with our community</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'discover'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
              : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          🔍 Discover
        </button>
        <button
          onClick={() => setActiveTab('my-events')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'my-events'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
              : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          📅 My Events ({myEvents.length})
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'discover' && (
        <FiltersBar filters={filters} onChange={setFilters} />
      )}

      {/* Events Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {activeTab === 'my-events' ? 'No registered events' : 'No events found'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'my-events'
              ? 'Register for events to see them here'
              : 'Try adjusting your filters or check back later'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRegister={() => handleRegister(event.id)}
              onClick={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRegister={() => selectedEvent && handleRegister(selectedEvent.id)}
        onCancel={() => selectedEvent && handleCancelRegistration(selectedEvent.id)}
      />
    </div>
  );
}

export default CommunityEvents;
