'use client';

/**
 * Admin Announcements Management Page
 * Create, edit, and manage platform announcements
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Bell,
  Loader2,
  Search,
  Filter
} from 'lucide-react';

// Announcement types
const TYPES = [
  { id: 'info', label: 'Information', icon: Info, color: 'blue' },
  { id: 'success', label: 'Success', icon: CheckCircle, color: 'green' },
  { id: 'warning', label: 'Warning', icon: AlertTriangle, color: 'amber' },
  { id: 'banner', label: 'Banner', icon: Bell, color: 'purple' },
  { id: 'modal', label: 'Modal', icon: Megaphone, color: 'red' },
];

// Target audiences
const AUDIENCES = [
  { id: 'all', label: 'All Users' },
  { id: 'candidate', label: 'Candidates' },
  { id: 'employer', label: 'Employers' },
  { id: 'mentor', label: 'Mentors' },
  { id: 'tafe', label: 'TAFE Staff' },
  { id: 'admin', label: 'Admins' },
];

const colorClasses = {
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  green: 'bg-green-600/20 text-green-400 border-green-600/30',
  amber: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
};

function AnnouncementForm({ announcement, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    type: announcement?.type || 'info',
    audience: announcement?.audience || ['all'],
    priority: announcement?.priority || 'normal',
    dismissible: announcement?.dismissible ?? true,
    actionUrl: announcement?.actionUrl || '',
    actionLabel: announcement?.actionLabel || '',
    startsAt: announcement?.startsAt?.split('T')[0] || '',
    expiresAt: announcement?.expiresAt?.split('T')[0] || '',
    isActive: announcement?.isActive ?? true,
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

  const handleAudienceChange = (audienceId) => {
    if (audienceId === 'all') {
      setFormData({ ...formData, audience: ['all'] });
    } else {
      const newAudience = formData.audience.includes(audienceId)
        ? formData.audience.filter(a => a !== audienceId && a !== 'all')
        : [...formData.audience.filter(a => a !== 'all'), audienceId];
      setFormData({ ...formData, audience: newAudience.length ? newAudience : ['all'] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">
        {announcement ? 'Edit Announcement' : 'Create Announcement'}
      </h2>

      {/* Title */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          placeholder="Announcement title..."
          required
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Content *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
          rows={4}
          placeholder="Announcement content..."
          required
        />
      </div>

      {/* Type and Priority */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    isSelected
                      ? colorClasses[type.color]
                      : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Target Audience</label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((audience) => {
            const isSelected = formData.audience.includes(audience.id);
            return (
              <button
                key={audience.id}
                type="button"
                onClick={() => handleAudienceChange(audience.id)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-600/30 text-purple-400'
                    : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                {audience.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action button */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Action URL (optional)</label>
          <input
            type="url"
            value={formData.actionUrl}
            onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Action Label</label>
          <input
            type="text"
            value={formData.actionLabel}
            onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            placeholder="Learn more"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Starts At</label>
          <input
            type="date"
            value={formData.startsAt}
            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Expires At</label>
          <input
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.dismissible}
            onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
          />
          <span className="text-sm text-slate-300">Can be dismissed</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
          />
          <span className="text-sm text-slate-300">Active immediately</span>
        </label>
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
          {announcement ? 'Save Changes' : 'Create Announcement'}
        </button>
      </div>
    </form>
  );
}

function AnnouncementCard({ announcement, onEdit, onDelete, onToggle }) {
  const type = TYPES.find(t => t.id === announcement.type) || TYPES[0];
  const TypeIcon = type.icon;

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-4 ${
      announcement.isActive ? 'border-slate-700' : 'border-slate-700/50 opacity-60'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${colorClasses[type.color]}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{announcement.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded border ${colorClasses[type.color]}`}>
                  {type.label}
                </span>
                <span className="text-xs text-slate-500">
                  {announcement.audience?.join(', ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggle(announcement.id)}
                className={`p-2 rounded-lg transition-colors ${
                  announcement.isActive
                    ? 'text-green-400 hover:bg-green-900/30'
                    : 'text-slate-500 hover:bg-slate-700'
                }`}
                title={announcement.isActive ? 'Deactivate' : 'Activate'}
              >
                {announcement.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit(announcement)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(announcement.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-2 line-clamp-2">
            {announcement.content}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            {announcement.startsAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Starts: {new Date(announcement.startsAt).toLocaleDateString()}
              </span>
            )}
            {announcement.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
              </span>
            )}
            {announcement.dismissCount > 0 && (
              <span>
                {announcement.dismissCount} dismissals
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { ok, data } = await api('/announcements/all');
      if (ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      // Demo data
      setAnnouncements([
        {
          id: '1',
          title: 'Welcome to Ngurra Pathways',
          content: 'We are excited to have you here. Explore jobs, courses, and mentorship opportunities.',
          type: 'info',
          audience: ['all'],
          priority: 'normal',
          dismissible: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'NAIDOC Week Events',
          content: 'Celebrate NAIDOC Week with special events and activities across the platform.',
          type: 'banner',
          audience: ['all'],
          priority: 'high',
          dismissible: true,
          isActive: true,
          startsAt: '2024-07-07',
          expiresAt: '2024-07-14',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSave = async (formData) => {
    const url = editingAnnouncement
      ? `/announcements/${editingAnnouncement.id}`
      : '/announcements';
    const method = editingAnnouncement ? 'PUT' : 'POST';

    try {
      const { ok } = await api(url, { method, body: formData });

      if (ok) {
        fetchAnnouncements();
        setShowForm(false);
        setEditingAnnouncement(null);
      }
    } catch (err) {
      console.error('Failed to save announcement:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api(`/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const handleToggle = async (id) => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    try {
      await api(`/announcements/${id}`, {
        method: 'PUT',
        body: { isActive: !announcement.isActive },
      });
      setAnnouncements(prev =>
        prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a)
      );
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && a.isActive) ||
      (filterActive === 'inactive' && !a.isActive);
    return matchesSearch && matchesFilter;
  });

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
            <Megaphone className="w-7 h-7 text-purple-400" />
            Announcements
          </h1>
          <p className="text-slate-400">Manage platform announcements and notifications</p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Announcement
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingAnnouncement(null);
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
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-600"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl">
            <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Announcements</h3>
            <p className="text-slate-400 mb-4">Create your first announcement to notify users</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Announcement
            </button>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
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
