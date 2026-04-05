'use client';

/**
 * Cultural Calendar Component
 * Displays Indigenous cultural events and significant dates
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ExternalLink,
  Download,
  Filter,
  Star,
  Leaf,
  Sun,
  Moon,
  Users,
  Heart,
  Music,
  BookOpen,
  Loader2
} from 'lucide-react';

// Category configuration with icons and colors
const CATEGORY_CONFIG = {
  ceremony: { icon: Moon, label: 'Ceremony', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  celebration: { icon: Star, label: 'Celebration', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  naidoc: { icon: Heart, label: 'NAIDOC', color: 'text-red-400', bg: 'bg-red-900/30' },
  reconciliation: { icon: Users, label: 'Reconciliation', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  memorial: { icon: Leaf, label: 'Memorial', color: 'text-slate-400', bg: 'bg-slate-700/30' },
  education: { icon: BookOpen, label: 'Education', color: 'text-green-400', bg: 'bg-green-900/30' },
  art: { icon: Music, label: 'Art & Performance', color: 'text-pink-400', bg: 'bg-pink-900/30' },
  language: { icon: BookOpen, label: 'Language', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  land: { icon: Sun, label: 'Land & Country', color: 'text-amber-400', bg: 'bg-amber-900/30' },
  health: { icon: Heart, label: 'Health', color: 'text-rose-400', bg: 'bg-rose-900/30' },
  community: { icon: Users, label: 'Community', color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
  other: { icon: CalendarIcon, label: 'Other', color: 'text-slate-400', bg: 'bg-slate-700/30' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function EventCard({ event }) {
  const category = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;
  const CategoryIcon = category.icon;
  
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const formatDate = (date) => {
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all group">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${category.bg} flex-shrink-0`}>
          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
              {event.title}
            </h3>
            {event.isPublic === false && (
              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                Private
              </span>
            )}
          </div>
          
          {event.description && (
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(startDate)}
              {endDate && ` - ${formatDate(endDate)}`}
            </span>
            
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            
            {event.region && (
              <span className="inline-flex items-center px-2 py-0.5 bg-slate-700/50 rounded">
                {event.region}
              </span>
            )}
          </div>
          
          {event.externalUrl && (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 mt-2"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SignificantDateCard({ date }) {
  const category = CATEGORY_CONFIG[date.category] || CATEGORY_CONFIG.other;
  const CategoryIcon = category.icon;
  const eventDate = new Date(date.date);

  return (
    <div className={`border-l-4 ${category.color.replace('text-', 'border-')} bg-slate-800/30 p-4 rounded-r-lg`}>
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[50px]">
          <div className="text-2xl font-bold text-white">{eventDate.getDate()}</div>
          <div className="text-xs text-slate-400 uppercase">
            {MONTHS[eventDate.getMonth()].substring(0, 3)}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{date.name}</h4>
            {date.isNational && (
              <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded">
                National
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {date.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function CalendarGrid({ year, month, events, onDateClick }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Group events by date
  const eventsByDate = {};
  events.forEach(event => {
    const date = new Date(event.startDate);
    if (date.getMonth() === month && date.getFullYear() === year) {
      const day = date.getDate();
      if (!eventsByDate[day]) eventsByDate[day] = [];
      eventsByDate[day].push(event);
    }
  });

  const cells = [];
  
  // Padding for days before the first
  for (let i = 0; i < startPadding; i++) {
    cells.push(<div key={`pad-${i}`} className="h-20 bg-slate-900/30" />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const dayEvents = eventsByDate[day] || [];
    
    cells.push(
      <button
        key={day}
        onClick={() => onDateClick(new Date(year, month, day))}
        className={`h-20 p-1 text-left border border-slate-700/30 hover:bg-slate-700/30 transition-colors ${
          isToday ? 'bg-purple-900/30 border-purple-600/50' : 'bg-slate-800/30'
        }`}
      >
        <div className={`text-sm font-medium ${isToday ? 'text-purple-400' : 'text-slate-400'}`}>
          {day}
        </div>
        
        {dayEvents.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map((event, i) => {
              const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;
              return (
                <div
                  key={i}
                  className={`text-xs truncate px-1 py-0.5 rounded ${cat.bg} ${cat.color}`}
                >
                  {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-slate-500 px-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-800">
        {DAYS.map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-slate-400">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells}
      </div>
    </div>
  );
}

export default function CulturalCalendar() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [events, setEvents] = useState([]);
  const [significantDates, setSignificantDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Calendar state
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const [eventsRes, datesRes] = await Promise.all([
        api(`/cultural-events?year=${currentYear}&upcoming=true`),
        api(`/cultural-events/significant-dates?year=${currentYear}`),
      ]);

      if (eventsRes.ok) {
        setEvents(eventsRes.data.events || []);
      }

      if (datesRes.ok) {
        setSignificantDates(datesRes.data.significantDates || []);
      }
    } catch (err) {
      console.error('Failed to fetch cultural events:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleExportIcal = () => {
    window.open(`${API_BASE}/cultural-events/export/ical?year=${currentYear}`, '_blank');
  };

  const filteredEvents = selectedCategory === 'all'
    ? events
    : events.filter(e => e.category === selectedCategory);

  const categories = Object.entries(CATEGORY_CONFIG);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-400" />
            Cultural Calendar
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Indigenous cultural events and significant dates
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === 'calendar'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Calendar
            </button>
          </div>
          
          <button
            onClick={handleExportIcal}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Events
        </button>
        {categories.slice(0, 6).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCategory === key
                  ? `${config.bg} ${config.color}`
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-semibold text-white">
              {MONTHS[currentMonth]} {currentYear}
            </h3>
            
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            events={filteredEvents}
            onDateClick={(date) => console.log('Clicked:', date)}
          />
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Events */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Upcoming Events</h3>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/30 rounded-xl">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.slice(0, 10).map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Significant Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Significant Dates {currentYear}</h3>
            <div className="space-y-3">
              {significantDates.map((date, i) => (
                <SignificantDateCard key={i} date={date} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
