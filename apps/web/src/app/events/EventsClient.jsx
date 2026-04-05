'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  ChevronRight,
  Plus,
  Video,
  Sparkles,
  Filter,
  ArrowRight,
  Globe,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Theme colors
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

const categories = ['All', 'Career', 'Workshop', 'Networking', 'Mentorship', 'Cultural'];
const eventTypes = ['All Types', 'In-Person', 'Virtual', 'Hybrid'];

// Mock events data
const mockEvents = [
  {
    id: '1',
    title: 'First Nations Tech Career Fair',
    description:
      'Connect with top employers committed to Indigenous inclusion. Network with industry professionals, explore opportunities, and take the next step in your tech career.',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    time: '10:00 AM - 4:00 PM AEST',
    location: 'Sydney Convention Centre',
    type: 'In-Person',
    category: 'Career',
    attendees: 234,
    isFeatured: true,
    image: '/images/events/career-fair.jpg',
    organizer: 'Ngurra Pathways',
  },
  {
    id: '2',
    title: 'Resume Writing Masterclass',
    description:
      'Learn how to craft a standout resume that highlights your unique skills and experiences. Get tips from HR professionals and career coaches.',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    time: '2:00 PM - 3:30 PM AEST',
    location: 'Online via Zoom',
    type: 'Virtual',
    category: 'Workshop',
    attendees: 89,
    isFeatured: true,
    image: '/images/events/workshop.jpg',
    organizer: 'Career Services',
  },
  {
    id: '3',
    title: 'Women in Leadership Panel',
    description:
      'Hear inspiring stories from First Nations women leaders across various industries. Q&A session included.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    time: '6:00 PM - 8:00 PM AEST',
    location: 'Brisbane City Library & Online',
    type: 'Hybrid',
    category: 'Networking',
    attendees: 156,
    isFeatured: false,
    organizer: "Women's Network",
  },
  {
    id: '4',
    title: 'Mentorship Circle: Tech Industry',
    description:
      'Join a supportive group session with experienced tech mentors. Share experiences, ask questions, and build your network.',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    time: '4:00 PM - 5:30 PM AEST',
    location: 'Online via Teams',
    type: 'Virtual',
    category: 'Mentorship',
    attendees: 32,
    isFeatured: false,
    organizer: 'Tech Mentors Program',
  },
  {
    id: '5',
    title: 'NAIDOC Week Celebration',
    description:
      'Celebrate NAIDOC Week with cultural performances, art exhibitions, and community gathering. All are welcome to join.',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    time: '11:00 AM - 6:00 PM AEST',
    location: 'Federation Square, Melbourne',
    type: 'In-Person',
    category: 'Cultural',
    attendees: 512,
    isFeatured: false,
    organizer: 'NAIDOC Committee',
  },
  {
    id: '6',
    title: 'Interview Skills Bootcamp',
    description:
      'Intensive workshop covering common interview questions, body language, and negotiation techniques.',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    time: '9:00 AM - 12:00 PM AEST',
    location: 'Perth CBD Hub',
    type: 'In-Person',
    category: 'Workshop',
    attendees: 45,
    isFeatured: false,
    organizer: 'Career Academy',
  },
];

export default function EventsClient({ initialEvents, hasPrefetched }) {
  const [events, setEvents] = useState(hasPrefetched ? initialEvents : mockEvents);
  const [loading, setLoading] = useState(!hasPrefetched);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All Types');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (hasPrefetched) return;

    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE}/events`);
        if (res.ok) {
          const data = await res.json();
          const normalizedEvents = (data.events || data || []).map((e) => ({
            id: e.id || e._id,
            title: e.title || 'Untitled Event',
            description: e.description || '',
            date: e.date || e.startDate || new Date().toISOString(),
            time: e.time || e.startTime || 'TBA',
            location: e.location || 'TBA',
            type: e.type || e.eventType || 'In-Person',
            category: e.category || 'Career',
            attendees: e.attendees || e.attendeeCount || 0,
            isFeatured: e.isFeatured || e.featured || false,
            image: e.image || e.imageUrl || null,
            organizer: e.organizer || e.organizerName || 'Ngurra Pathways',
          }));
          if (normalizedEvents.length > 0) {
            setEvents(normalizedEvents);
          }
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [hasPrefetched]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    const matchesType = selectedType === 'All Types' || event.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const featuredEvents = filteredEvents.filter((e) => e.isFeatured);
  const upcomingEvents = filteredEvents.filter((e) => !e.isFeatured);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date TBA';
      return date.toLocaleDateString('en-AU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Date TBA';
    }
  };

  const formatDay = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--';
      return date.getDate();
    } catch {
      return '--';
    }
  };

  const formatMonth = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '---';
      return date.toLocaleString('en-AU', { month: 'short' }).toUpperCase();
    } catch {
      return '---';
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Virtual':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
      case 'Hybrid':
        return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
      default:
        return { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' };
    }
  };

  if (loading) {
    return (
      <div className="ngurra-page flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: accentPink }} />
          <p className="text-slate-600 font-medium">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ngurra-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${accentPink}30, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${accentPurple}30, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/" className="text-slate-500 hover:text-pink-600 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-pink-600 font-medium">Events</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/25">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border border-pink-200">
                  {events.length} Events
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                Community Events
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Connect, learn, and grow with the Ngurra Pathways community. Join workshops,
                networking events, and cultural celebrations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/events/cultural"
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 shadow-sm"
              >
                🎭 Cultural Calendar
              </Link>
              <Link
                href="/events/create"
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-xl hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                  boxShadow: '0 8px 20px rgba(233, 30, 140, 0.25)',
                }}
              >
                <Plus className="w-5 h-5" />
                Create Event
              </Link>
            </div>
          </div>

          {/* Search & Filters Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search events by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Filter Toggle (Mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>

              {/* Filter Dropdowns */}
              <div
                className={`flex flex-col sm:flex-row gap-3 ${showFilters ? '' : 'hidden lg:flex'}`}
              >
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-900 font-medium cursor-pointer transition-all min-w-[140px]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-900 font-medium cursor-pointer transition-all min-w-[140px]"
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Events</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {featuredEvents.map((event) => {
                const typeStyle = getTypeStyle(event.type);
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:shadow-pink-500/10 hover:border-pink-200 transition-all duration-300"
                  >
                    {/* Featured Badge */}
                    <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg">
                      ⭐ Featured
                    </div>

                    {/* Event Image/Gradient */}
                    <div
                      className="h-44 flex items-center justify-center relative"
                      style={{
                        background: `linear-gradient(135deg, ${accentPink}15, ${accentPurple}15)`,
                      }}
                    >
                      <Calendar className="w-20 h-20 text-pink-200" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                    </div>

                    <div className="p-6">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}
                        >
                          {event.type === 'Virtual' && <Video className="w-3.5 h-3.5" />}
                          {event.type === 'Hybrid' && <Globe className="w-3.5 h-3.5" />}
                          {event.type}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200">
                          {event.category}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-pink-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Event Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3 text-slate-600">
                          <Calendar className="w-4 h-4 text-pink-500 flex-shrink-0" />
                          <span className="font-medium">{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <Clock className="w-4 h-4 text-pink-500 flex-shrink-0" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <MapPin className="w-4 h-4 text-pink-500 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees} attending</span>
                        </div>
                        <div className="flex items-center gap-1 text-pink-600 font-semibold text-sm group-hover:gap-2 transition-all">
                          View Details
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Upcoming Events</h2>
            </div>
            <span className="text-sm text-slate-500 font-medium">
              {upcomingEvents.length} events
            </span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-lg">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No events found</h3>
              <p className="text-slate-500 mb-6">Try adjusting your filters or search terms</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedType('All Types');
                }}
                className="px-6 py-2.5 rounded-xl font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const typeStyle = getTypeStyle(event.type);
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group flex flex-col md:flex-row gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all duration-300"
                  >
                    {/* Date Card */}
                    <div className="flex md:flex-col items-center md:items-center justify-center gap-3 md:gap-1 w-full md:w-24 h-auto md:h-24 rounded-xl flex-shrink-0 bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 p-3">
                      <div className="text-3xl md:text-4xl font-bold text-pink-600">
                        {formatDay(event.date)}
                      </div>
                      <div className="text-sm font-semibold text-purple-600">
                        {formatMonth(event.date)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text}`}
                        >
                          {event.type === 'Virtual' && <Video className="w-3 h-3" />}
                          {event.type}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">
                          {event.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-500 text-sm mb-3 line-clamp-1">
                        {event.description}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          {event.attendees} attending
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-pink-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="mt-16">
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-12"
            style={{
              background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
            }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Want to host your own event?
                </h3>
                <p className="text-white/80 text-lg">
                  Share your knowledge with the community and make an impact.
                </p>
              </div>
              <Link
                href="/events/create"
                className="flex items-center gap-2 px-8 py-4 bg-white rounded-xl font-bold text-pink-600 hover:bg-pink-50 transition-colors shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Create Event
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
