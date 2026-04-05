'use client';

/**
 * Admin Cultural Events Management Page
 * Create, edit, and manage Indigenous cultural events
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  MapPin,
  Clock,
  ExternalLink,
  Globe,
  Users,
  Star,
  Leaf,
  Sun,
  Moon,
  Heart,
  Music,
  BookOpen,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  Upload
} from 'lucide-react';

// Category configuration
const CATEGORIES = [
  { id: 'ceremony', label: 'Ceremony', icon: Moon, color: 'purple' },
  { id: 'celebration', label: 'Celebration', icon: Star, color: 'yellow' },
  { id: 'naidoc', label: 'NAIDOC', icon: Heart, color: 'red' },
  { id: 'reconciliation', label: 'Reconciliation', icon: Users, color: 'blue' },
  { id: 'memorial', label: 'Memorial', icon: Leaf, color: 'slate' },
  { id: 'education', label: 'Education', icon: BookOpen, color: 'green' },
  { id: 'art', label: 'Art & Performance', icon: Music, color: 'pink' },
  { id: 'community', label: 'Community', icon: Users, color: 'indigo' },
  { id: 'land', label: 'Land & Country', icon: Sun, color: 'amber' },
  { id: 'other', label: 'Other', icon: Calendar, color: 'slate' },
];

// Australian regions
const REGIONS = [
  'National',
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
];

const colorClasses = {
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  yellow: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  slate: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  green: 'bg-green-600/20 text-green-400 border-green-600/30',
  pink: 'bg-pink-600/20 text-pink-400 border-pink-600/30',
  indigo: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30',
  amber: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
};

function EventForm({ event, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'community',
    startDate: event?.startDate?.split('T')[0] || '',
    endDate: event?.endDate?.split('T')[0] || '',
    location: event?.location || '',
    region: event?.region || 'National',
    externalUrl: event?.externalUrl || '',
    isPublic: event?.isPublic ?? true,
    isRecurring: event?.isRecurring || false,
    recurrencePattern: event?.recurrencePattern || 'yearly',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">
        {event ? 'Edit Event' : 'Create Cultural Event'}
      </h2>

      {/* Title */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Event Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          placeholder="Event title..."
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
          rows={4}
          placeholder="Event description..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 8).map((cat) => {
            const Icon = cat.icon;
            const isSelected = formData.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? colorClasses[cat.color]
                    : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Start Date *</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">End Date</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          />
        </div>
      </div>

      {/* Location and Region */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            placeholder="e.g., Sydney Opera House"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Region</label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          >
            {REGIONS.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {/* External URL */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Event URL (optional)</label>
        <input
          type="url"
          value={formData.externalUrl}
          onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          placeholder="https://..."
        />
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
          />
          <span className="text-sm text-slate-300">Public event</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
          />
          <span className="text-sm text-slate-300">Recurring event</span>
        </label>
        {formData.isRecurring && (
          <select
            value={formData.recurrencePattern}
            onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-purple-600"
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {event ? 'Save Changes' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}

function EventCard({ event, onEdit, onDelete, onToggle }) {
  const category = CATEGORIES.find(c => c.id === event.category) || CATEGORIES[CATEGORIES.length - 1];
  const CategoryIcon = category.icon;
  const startDate = new Date(event.startDate);

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-4 ${
      event.isPublic ? 'border-slate-700' : 'border-slate-700/50 opacity-60'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${colorClasses[category.color]}`}>
          <CategoryIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{event.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded border ${colorClasses[category.color]}`}>
                  {category.label}
                </span>
                {event.region && (
                  <span className="text-xs text-slate-500">{event.region}</span>
                )}
                {event.isRecurring && (
                  <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded">
                    Recurring
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggle(event.id)}
                className={`p-2 rounded-lg transition-colors ${
                  event.isPublic
                    ? 'text-green-400 hover:bg-green-900/30'
                    : 'text-slate-500 hover:bg-slate-700'
                }`}
                title={event.isPublic ? 'Make private' : 'Make public'}
              >
                {event.isPublic ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit(event)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(event.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.externalUrl && (
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
              >
                <ExternalLink className="w-3 h-3" />
                Event link
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCulturalEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchEvents = useCallback(async () => {
    try {
      const { ok, data } = await api('/cultural-events?all=true');
      if (ok) {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      // Demo data
      setEvents([
        {
          id: '1',
          title: 'NAIDOC Week 2024',
          description: 'National NAIDOC Week celebrations recognizing the history, culture, and achievements of Aboriginal and Torres Strait Islander peoples.',
          category: 'naidoc',
          startDate: '2024-07-07',
          endDate: '2024-07-14',
          region: 'National',
          isPublic: true,
          isRecurring: true,
          recurrencePattern: 'yearly',
        },
        {
          id: '2',
          title: 'Sorry Day',
          description: 'National Sorry Day - a day to remember and commemorate the mistreatment of Aboriginal and Torres Strait Islander people.',
          category: 'memorial',
          startDate: '2024-05-26',
          region: 'National',
          isPublic: true,
          isRecurring: true,
        },
        {
          id: '3',
          title: 'Reconciliation Week',
          description: 'National Reconciliation Week celebrates and builds on the respectful relationships between Aboriginal and Torres Strait Islander peoples and other Australians.',
          category: 'reconciliation',
          startDate: '2024-05-27',
          endDate: '2024-06-03',
          region: 'National',
          isPublic: true,
          isRecurring: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSave = async (formData) => {
    const url = editingEvent
      ? `/cultural-events/${editingEvent.id}`
      : '/cultural-events';
    const method = editingEvent ? 'PUT' : 'POST';

    try {
      const { ok } = await api(url, { method, body: formData });

      if (ok) {
        fetchEvents();
        setShowForm(false);
        setEditingEvent(null);
      }
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api(`/cultural-events/${id}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleToggle = async (id) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    try {
      await api(`/cultural-events/${id}`, {
        method: 'PUT',
        body: { isPublic: !event.isPublic },
      });
      setEvents(prev =>
        prev.map(e => e.id === id ? { ...e, isPublic: !e.isPublic } : e)
      );
    } catch (err) {
      console.error('Failed to toggle event:', err);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort by date
  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date(a.startDate) - new Date(b.startDate)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Leaf className="w-7 h-7 text-green-400" />
            Cultural Events
          </h1>
          <p className="text-slate-400">Manage Indigenous cultural events and significant dates</p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <EventForm
            event={editingEvent}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-600"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Events</h3>
            <p className="text-slate-400 mb-4">Add cultural events and significant dates</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add First Event
            </button>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
