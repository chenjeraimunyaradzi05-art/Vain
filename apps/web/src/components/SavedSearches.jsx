'use client';

/**
 * Saved Searches / Job Alerts Component
 * Allows users to save search criteria and manage job alerts
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { 
  Bell, 
  BellOff, 
  Search, 
  Trash2, 
  Play, 
  Plus,
  Briefcase,
  GraduationCap,
  Users,
  Clock,
  ChevronRight,
  Loader2,
  Settings,
  MapPin,
  Filter
} from 'lucide-react';

const SEARCH_TYPE_CONFIG = {
  job: { icon: Briefcase, label: 'Jobs', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  course: { icon: GraduationCap, label: 'Courses', color: 'text-green-400', bg: 'bg-green-900/30' },
  mentor: { icon: Users, label: 'Mentors', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const FREQUENCY_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

function SavedSearchCard({ search, onRun, onDelete, onToggleAlert, onUpdateFrequency }) {
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const config = SEARCH_TYPE_CONFIG[search.searchType] || SEARCH_TYPE_CONFIG.job;
  const Icon = config.icon;

  const handleRun = async () => {
    setRunning(true);
    await onRun(search.id);
    setRunning(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this saved search?')) return;
    setDeleting(true);
    await onDelete(search.id);
  };

  // Parse query for display
  const query = typeof search.query === 'string' 
    ? JSON.parse(search.query) 
    : search.query;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{search.name}</h3>
            
            {/* Search criteria summary */}
            <div className="flex flex-wrap gap-2 mt-2">
              {query.q && (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                  <Search className="w-3 h-3" />
                  {query.q}
                </span>
              )}
              {query.location && (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                  <MapPin className="w-3 h-3" />
                  {query.location}
                </span>
              )}
              {query.employment && (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                  <Filter className="w-3 h-3" />
                  {query.employment}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(search.createdAt).toLocaleDateString()}
              </span>
              {search.matchCount !== undefined && (
                <span>{search.matchCount} matches</span>
              )}
            </div>
          </div>
        </div>

        {/* Alert toggle */}
        <button
          onClick={() => onToggleAlert(search.id)}
          className={`p-2 rounded-lg transition-colors ${
            search.alertEnabled
              ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          }`}
          title={search.alertEnabled ? 'Alerts enabled' : 'Alerts disabled'}
        >
          {search.alertEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <label className="block text-xs text-slate-400 mb-2">Alert Frequency</label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onUpdateFrequency(search.id, option.value)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  search.alertFrequency === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/50">
        <button
          onClick={handleRun}
          disabled={running}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Search
            </>
          )}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// Dialog to create a new saved search
function CreateSavedSearchDialog({ isOpen, onClose, onCreate, initialQuery }) {
  const [name, setName] = useState('');
  const [searchType, setSearchType] = useState('job');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [query, setQuery] = useState(initialQuery || {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    await onCreate({
      name: name.trim(),
      searchType,
      query,
      alertEnabled,
      alertFrequency,
    });
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-white mb-4">Save This Search</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Remote tech jobs in Sydney"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Search Type</label>
            <div className="flex gap-2">
              {Object.entries(SEARCH_TYPE_CONFIG).map(([type, config]) => {
                const TypeIcon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSearchType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${
                      searchType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <TypeIcon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300">Enable email alerts</label>
            <button
              type="button"
              onClick={() => setAlertEnabled(!alertEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                alertEnabled ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  alertEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {alertEnabled && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Alert Frequency</label>
              <div className="flex gap-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAlertFrequency(option.value)}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      alertFrequency === option.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SavedSearches() {
  const { isAuthenticated } = useAuth();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const fetchSearches = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { ok, data } = await api('/saved-searches');

      if (ok) {
        setSearches(data.savedSearches || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved searches:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  const runSearch = async (id) => {
    try {
      const { ok, data } = await api(`/saved-searches/${id}/run`, { method: 'POST' });

      if (ok) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Failed to run search:', err);
    }
  };

  const deleteSearch = async (id) => {
    try {
      await api(`/saved-searches/${id}`, { method: 'DELETE' });
      setSearches(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete search:', err);
    }
  };

  const toggleAlert = async (id) => {
    try {
      const { ok, data: updated } = await api(`/saved-searches/${id}/toggle-alert`, { method: 'POST' });

      if (ok) {
        setSearches(prev => 
          prev.map(s => s.id === id ? { ...s, alertEnabled: updated.alertEnabled } : s)
        );
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const updateFrequency = async (id, frequency) => {
    try {
      const { ok } = await api(`/saved-searches/${id}`, {
        method: 'PUT',
        body: { alertFrequency: frequency },
      });

      if (ok) {
        setSearches(prev =>
          prev.map(s => s.id === id ? { ...s, alertFrequency: frequency } : s)
        );
      }
    } catch (err) {
      console.error('Failed to update frequency:', err);
    }
  };

  const createSearch = async (data) => {
    try {
      const { ok, data: newSearch } = await api('/saved-searches', {
        method: 'POST',
        body: data,
      });

      if (ok) {
        setSearches(prev => [newSearch, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create search:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Saved Searches & Job Alerts</h2>
          <p className="text-slate-400 text-sm mt-1">
            Get notified when new opportunities match your criteria
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Search
        </button>
      </div>

      {searches.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No saved searches yet</h3>
          <p className="text-slate-400 text-sm mb-4">
            Save your job searches to get alerted when new opportunities appear
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {searches.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              onRun={runSearch}
              onDelete={deleteSearch}
              onToggleAlert={toggleAlert}
              onUpdateFrequency={updateFrequency}
            />
          ))}
        </div>
      )}

      {/* Search Results Modal */}
      {searchResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">{searchResults.savedSearch?.name}</h3>
                <p className="text-sm text-slate-400">{searchResults.total} results found</p>
              </div>
              <button
                onClick={() => setSearchResults(null)}
                className="p-2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {searchResults.results?.map((result) => (
                <Link
                  key={result.id}
                  href={`/jobs/${result.id}`}
                  className="block p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <h4 className="font-medium text-white">{result.title}</h4>
                  <p className="text-sm text-purple-400">{result.company}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{result.location}</span>
                    {result.salary && <span>{result.salary}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <CreateSavedSearchDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={createSearch}
      />
    </div>
  );
}
