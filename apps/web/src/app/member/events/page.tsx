/**
 * Events & Cultural Gatherings Page
 * 
 * Discover career events, cultural gatherings, and networking opportunities.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import Link from 'next/link';

// Types
interface Event {
  id: string;
  title: string;
  description: string;
  type: 'CAREER_FAIR' | 'NETWORKING' | 'WORKSHOP' | 'CULTURAL' | 'WEBINAR' | 'CONFERENCE' | 'NAIDOC';
  format: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
  startDate: Date;
  endDate: Date;
  timezone: string;
  location?: {
    venue: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  onlineDetails?: {
    platform: string;
    link?: string;
  };
  coverImage?: string;
  organizer: {
    id: string;
    name: string;
    logo?: string;
    verified: boolean;
  };
  capacity?: number;
  attendeeCount: number;
  isRegistered: boolean;
  isSaved: boolean;
  isFeatured: boolean;
  tags: string[];
  culturalProtocols?: string[];
  price: {
    amount: number;
    currency: string;
    isFree: boolean;
  };
}

// Mock events data
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'NAIDOC Week Career Fair 2024',
    description: 'Join us for Australia\'s largest Indigenous career fair during NAIDOC Week. Meet top employers committed to Indigenous employment, attend workshops, and network with industry leaders.',
    type: 'NAIDOC',
    format: 'IN_PERSON',
    startDate: new Date('2024-07-07T09:00:00'),
    endDate: new Date('2024-07-07T17:00:00'),
    timezone: 'AEST',
    location: {
      venue: 'Melbourne Convention Centre',
      address: '1 Convention Centre Place',
      city: 'Melbourne',
      state: 'VIC',
      country: 'Australia',
    },
    organizer: {
      id: 'org1',
      name: 'Ngurra Pathways',
      verified: true,
    },
    capacity: 500,
    attendeeCount: 342,
    isRegistered: false,
    isSaved: true,
    isFeatured: true,
    tags: ['Career Fair', 'NAIDOC', 'Networking', 'Indigenous Employers'],
    culturalProtocols: ['Welcome to Country', 'Smoking Ceremony'],
    price: { amount: 0, currency: 'AUD', isFree: true },
  },
  {
    id: '2',
    title: 'Indigenous Tech Leaders Summit',
    description: 'A gathering of Indigenous technology professionals sharing knowledge, discussing opportunities, and building pathways for the next generation of tech leaders.',
    type: 'CONFERENCE',
    format: 'HYBRID',
    startDate: new Date('2024-08-15T10:00:00'),
    endDate: new Date('2024-08-16T16:00:00'),
    timezone: 'AEST',
    location: {
      venue: 'Sydney Tech Hub',
      address: '123 Technology Drive',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
    },
    onlineDetails: {
      platform: 'Zoom',
    },
    organizer: {
      id: 'org2',
      name: 'Indigenous Tech Alliance',
      verified: true,
    },
    capacity: 200,
    attendeeCount: 156,
    isRegistered: true,
    isSaved: false,
    isFeatured: true,
    tags: ['Technology', 'Leadership', 'Innovation', 'Startups'],
    culturalProtocols: ['Acknowledgement of Country'],
    price: { amount: 150, currency: 'AUD', isFree: false },
  },
  {
    id: '3',
    title: 'Resume Writing Workshop for Mob',
    description: 'Learn how to create a powerful resume that highlights your unique skills, cultural knowledge, and professional experience. Presented by Indigenous career coaches.',
    type: 'WORKSHOP',
    format: 'ONLINE',
    startDate: new Date('2024-06-20T14:00:00'),
    endDate: new Date('2024-06-20T16:00:00'),
    timezone: 'AEST',
    onlineDetails: {
      platform: 'Microsoft Teams',
    },
    organizer: {
      id: 'org3',
      name: 'Career Pathways Australia',
      verified: true,
    },
    capacity: 50,
    attendeeCount: 38,
    isRegistered: false,
    isSaved: false,
    isFeatured: false,
    tags: ['Resume', 'Career Development', 'Skills', 'Workshop'],
    price: { amount: 0, currency: 'AUD', isFree: true },
  },
  {
    id: '4',
    title: 'Yarn Up: Mining Industry Networking',
    description: 'An informal networking event for Indigenous professionals in the mining and resources sector. Share experiences, opportunities, and connect with industry peers.',
    type: 'NETWORKING',
    format: 'IN_PERSON',
    startDate: new Date('2024-06-28T17:30:00'),
    endDate: new Date('2024-06-28T20:00:00'),
    timezone: 'AWST',
    location: {
      venue: 'The Rooftop Bar',
      address: '45 St Georges Terrace',
      city: 'Perth',
      state: 'WA',
      country: 'Australia',
    },
    organizer: {
      id: 'org4',
      name: 'Indigenous Mining Network',
      verified: false,
    },
    capacity: 80,
    attendeeCount: 45,
    isRegistered: false,
    isSaved: false,
    isFeatured: false,
    tags: ['Mining', 'Resources', 'Networking', 'Yarn Up'],
    culturalProtocols: ['Noongar Welcome'],
    price: { amount: 25, currency: 'AUD', isFree: false },
  },
  {
    id: '5',
    title: 'Cultural Safety in the Workplace Webinar',
    description: 'Understanding cultural safety, building inclusive workplaces, and navigating challenges as an Indigenous professional. Featuring a panel of experienced leaders.',
    type: 'WEBINAR',
    format: 'ONLINE',
    startDate: new Date('2024-07-03T12:00:00'),
    endDate: new Date('2024-07-03T13:30:00'),
    timezone: 'AEST',
    onlineDetails: {
      platform: 'Zoom Webinar',
    },
    organizer: {
      id: 'org5',
      name: 'Workplace Inclusion Alliance',
      verified: true,
    },
    attendeeCount: 234,
    isRegistered: true,
    isSaved: true,
    isFeatured: false,
    tags: ['Cultural Safety', 'Inclusion', 'Workplace', 'Leadership'],
    price: { amount: 0, currency: 'AUD', isFree: true },
  },
  {
    id: '6',
    title: 'Corroboree: Traditional Dance & Career Stories',
    description: 'A cultural evening combining traditional dance, storytelling, and career journey sharing from successful Indigenous professionals across industries.',
    type: 'CULTURAL',
    format: 'IN_PERSON',
    startDate: new Date('2024-07-12T18:00:00'),
    endDate: new Date('2024-07-12T21:00:00'),
    timezone: 'AEST',
    location: {
      venue: 'Yiribana Gallery, Art Gallery of NSW',
      address: 'Art Gallery Road',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
    },
    organizer: {
      id: 'org6',
      name: 'First Nations Arts Council',
      verified: true,
    },
    capacity: 120,
    attendeeCount: 98,
    isRegistered: false,
    isSaved: false,
    isFeatured: true,
    tags: ['Culture', 'Dance', 'Storytelling', 'Arts', 'Networking'],
    culturalProtocols: ['Welcome to Country', 'Smoking Ceremony', 'Elder Led'],
    price: { amount: 35, currency: 'AUD', isFree: false },
  },
];

// Type colors and labels
const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  CAREER_FAIR: { bg: 'bg-blue-900/50', text: 'text-blue-400', label: 'Career Fair', icon: '💼' },
  NETWORKING: { bg: 'bg-purple-900/50', text: 'text-purple-400', label: 'Networking', icon: '🤝' },
  WORKSHOP: { bg: 'bg-green-900/50', text: 'text-green-400', label: 'Workshop', icon: '📝' },
  CULTURAL: { bg: 'bg-amber-900/50', text: 'text-amber-400', label: 'Cultural', icon: '🎭' },
  WEBINAR: { bg: 'bg-cyan-900/50', text: 'text-cyan-400', label: 'Webinar', icon: '💻' },
  CONFERENCE: { bg: 'bg-pink-900/50', text: 'text-pink-400', label: 'Conference', icon: '🎤' },
  NAIDOC: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'NAIDOC', icon: '🖤💛❤️' },
};

const FORMAT_CONFIG: Record<string, { label: string; icon: string }> = {
  IN_PERSON: { label: 'In Person', icon: '📍' },
  ONLINE: { label: 'Online', icon: '🌐' },
  HYBRID: { label: 'Hybrid', icon: '🔀' },
};

// Helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateRange(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Event Card Component
function EventCard({ event, viewMode }: { event: Event; viewMode: 'grid' | 'list' }) {
  const typeConfig = TYPE_CONFIG[event.type];
  const formatConfig = FORMAT_CONFIG[event.format];
  const spotsLeft = event.capacity ? event.capacity - event.attendeeCount : null;

  if (viewMode === 'list') {
    return (
      <div className={`bg-slate-800 rounded-xl border hover:border-slate-600 transition-all p-6 ${
        event.isFeatured ? 'border-amber-700/50' : 'border-slate-700'
      }`}>
        <div className="flex gap-6">
          {/* Date Block */}
          <div className="flex-shrink-0 text-center bg-slate-900 rounded-lg p-3 w-16">
            <div className="text-2xl font-bold text-white">{event.startDate.getDate()}</div>
            <div className="text-xs text-slate-400 uppercase">
              {event.startDate.toLocaleDateString('en-AU', { month: 'short' })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${typeConfig.bg} ${typeConfig.text}`}>
                    {typeConfig.icon} {typeConfig.label}
                  </span>
                  <span className="text-slate-500 text-xs">{formatConfig.icon} {formatConfig.label}</span>
                  {event.isFeatured && (
                    <span className="text-amber-400 text-xs">⭐ Featured</span>
                  )}
                </div>
                <Link href={`/member/events/${event.id}`} className="text-lg font-semibold text-white hover:text-green-400 transition-colors">
                  {event.title}
                </Link>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                {event.price.isFree ? (
                  <span className="text-green-400 font-medium">Free</span>
                ) : (
                  <span className="text-white font-medium">${event.price.amount}</span>
                )}
              </div>
            </div>

            <p className="text-slate-400 text-sm mt-2 line-clamp-1">{event.description}</p>

            <div className="flex items-center flex-wrap gap-4 mt-3 text-sm">
              <span className="text-slate-400">
                🕐 {formatDateRange(event.startDate, event.endDate)}
              </span>
              {event.location && (
                <span className="text-slate-400">📍 {event.location.city}, {event.location.state}</span>
              )}
              <span className="text-slate-500">👥 {event.attendeeCount} attending</span>
            </div>

            {/* Cultural Protocols */}
            {event.culturalProtocols && event.culturalProtocols.length > 0 && (
              <div className="flex gap-2 mt-2">
                {event.culturalProtocols.map((protocol) => (
                  <span key={protocol} className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded border border-amber-800/50">
                    {protocol}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              event.isRegistered
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}>
              {event.isRegistered ? '✓ Registered' : 'Register'}
            </button>
            <button className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              event.isSaved
                ? 'text-amber-400 bg-amber-900/30'
                : 'text-slate-400 bg-slate-700 hover:bg-slate-600'
            }`}>
              {event.isSaved ? '★ Saved' : '☆ Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 rounded-xl border overflow-hidden hover:border-slate-600 transition-all ${
      event.isFeatured ? 'border-amber-700/50' : 'border-slate-700'
    }`}>
      {/* Cover Image or Placeholder */}
      <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 relative">
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            cloudinary={isCloudinaryPublicId(event.coverImage || '')}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
            {typeConfig.icon}
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.text} backdrop-blur-sm`}>
            {typeConfig.label}
          </span>
        </div>

        {event.isFeatured && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-amber-600 text-white text-xs rounded font-medium">
            ⭐ Featured
          </div>
        )}

        {/* Format Badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
          {formatConfig.icon} {formatConfig.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <Link href={`/member/events/${event.id}`} className="text-lg font-semibold text-white hover:text-green-400 transition-colors line-clamp-2">
          {event.title}
        </Link>

        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
          <span>🕐</span>
          <span>{formatDateRange(event.startDate, event.endDate)}</span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
            <span>📍</span>
            <span>{event.location.venue}, {event.location.city}</span>
          </div>
        )}

        {event.onlineDetails && !event.location && (
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
            <span>🌐</span>
            <span>{event.onlineDetails.platform}</span>
          </div>
        )}

        {/* Organizer */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">
            {event.organizer.name[0]}
          </div>
          <span className="text-sm text-slate-300">{event.organizer.name}</span>
          {event.organizer.verified && (
            <span className="text-blue-400 text-xs">✓</span>
          )}
        </div>

        {/* Cultural Protocols */}
        {event.culturalProtocols && event.culturalProtocols.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {event.culturalProtocols.slice(0, 2).map((protocol) => (
              <span key={protocol} className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                {protocol}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">👥 {event.attendeeCount}</span>
            {spotsLeft !== null && spotsLeft < 20 && (
              <span className="text-orange-400 text-xs">{spotsLeft} spots left!</span>
            )}
          </div>
          {event.price.isFree ? (
            <span className="text-green-400 font-medium text-sm">Free</span>
          ) : (
            <span className="text-white font-medium text-sm">${event.price.amount}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            event.isRegistered
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : 'bg-green-600 text-white hover:bg-green-500'
          }`}>
            {event.isRegistered ? '✓ Registered' : 'Register'}
          </button>
          <button className={`px-4 py-2 rounded-lg transition-colors ${
            event.isSaved
              ? 'text-amber-400 bg-amber-900/30'
              : 'text-slate-400 bg-slate-700 hover:bg-slate-600'
          }`}>
            {event.isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'registered' | 'saved'>('upcoming');
  const [filters, setFilters] = useState({
    types: [] as string[],
    format: '',
    free: false,
  });

  useEffect(() => {
    const loadEvents = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setEvents(mockEvents);
      setLoading(false);
    };
    loadEvents();
  }, []);

  const filteredEvents = events
    .filter(event => {
      if (activeTab === 'registered' && !event.isRegistered) return false;
      if (activeTab === 'saved' && !event.isSaved) return false;
      if (filters.types.length > 0 && !filters.types.includes(event.type)) return false;
      if (filters.format && event.format !== filters.format) return false;
      if (filters.free && !event.price.isFree) return false;
      return true;
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">Events & Gatherings</h1>
          <p className="text-slate-400 mt-2">Career events, workshops, and cultural gatherings for our community</p>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-slate-700">
            {[
              { key: 'upcoming', label: 'Upcoming', count: events.length },
              { key: 'registered', label: 'Registered', count: events.filter(e => e.isRegistered).length },
              { key: 'saved', label: 'Saved', count: events.filter(e => e.isSaved).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  const types = filters.types.includes(key)
                    ? filters.types.filter(t => t !== key)
                    : [...filters.types, key];
                  setFilters({ ...filters, types });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filters.types.includes(key)
                    ? `${config.bg} ${config.text}`
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilters({ ...filters, free: !filters.free })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filters.free
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              Free Events
            </button>

            <select
              value={filters.format}
              onChange={(e) => setFilters({ ...filters, format: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-green-500 outline-none"
            >
              <option value="">All Formats</option>
              <option value="IN_PERSON">In Person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-slate-400 mb-6">
          <span className="text-white font-medium">{filteredEvents.length}</span> events found
        </p>

        {/* Events Grid/List */}
        {filteredEvents.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} viewMode="list" />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mt-4">No events found</h3>
            <p className="text-slate-400 mt-2">Try adjusting your filters or check back later</p>
            <button
              onClick={() => setFilters({ types: [], format: '', free: false })}
              className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Create Event CTA */}
        <div className="mt-12 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-700/30 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Host Your Own Event</h2>
          <p className="text-slate-300 mt-2 max-w-2xl mx-auto">
            Share your knowledge, bring community together, or host networking events for Indigenous professionals.
          </p>
          <button className="mt-6 px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium">
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
