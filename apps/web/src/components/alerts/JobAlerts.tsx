'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * JobAlerts - Job alerts configuration and management
 * 
 * Features:
 * - Create and manage job alerts
 * - Set alert criteria (keywords, location, salary, etc.)
 * - Choose notification frequency
 * - View alert matches
 */

interface JobAlert {
  id: string;
  name: string;
  keywords: string[];
  locations: string[];
  industries: string[];
  jobTypes: ('full-time' | 'part-time' | 'contract' | 'casual')[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'any';
  salaryRange: {
    min?: number;
    max?: number;
  };
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  frequency: 'instant' | 'daily' | 'weekly';
  isActive: boolean;
  matchCount: number;
  lastMatched: string | null;
  createdAt: string;
}

interface AlertMatch {
  id: string;
  alertId: string;
  job: {
    id: string;
    title: string;
    company: string;
    logo?: string;
    location: string;
    salary?: string;
    isRemote: boolean;
    postedAt: string;
  };
  matchedAt: string;
  isViewed: boolean;
}

// API functions
const alertsApi = {
  async getAlerts(): Promise<{ alerts: JobAlert[] }> {
    const res = await fetch('/api/job-alerts', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async createAlert(data: Omit<JobAlert, 'id' | 'matchCount' | 'lastMatched' | 'createdAt'>): Promise<JobAlert> {
    const res = await fetch('/api/job-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },

  async updateAlert(id: string, data: Partial<JobAlert>): Promise<JobAlert> {
    const res = await fetch(`/api/job-alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  async deleteAlert(id: string): Promise<void> {
    const res = await fetch(`/api/job-alerts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete alert');
  },

  async toggleAlert(id: string, isActive: boolean): Promise<void> {
    const res = await fetch(`/api/job-alerts/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error('Failed to toggle alert');
  },

  async getMatches(alertId: string): Promise<{ matches: AlertMatch[] }> {
    const res = await fetch(`/api/job-alerts/${alertId}/matches`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  async markMatchViewed(matchId: string): Promise<void> {
    const res = await fetch(`/api/job-alerts/matches/${matchId}/view`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to mark as viewed');
  },
};

// Predefined options
const australianCities = [
  'Sydney, NSW',
  'Melbourne, VIC',
  'Brisbane, QLD',
  'Perth, WA',
  'Adelaide, SA',
  'Canberra, ACT',
  'Hobart, TAS',
  'Darwin, NT',
  'Gold Coast, QLD',
  'Newcastle, NSW',
];

const industries = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Government',
  'Mining & Resources',
  'Construction',
  'Retail',
  'Professional Services',
  'Manufacturing',
];

const jobTypes = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
];

const experienceLevels = [
  { value: 'any', label: 'Any Level' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive' },
];

const remoteOptions = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote Only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const frequencies = [
  { value: 'instant', label: 'Instant', description: 'Get notified immediately' },
  { value: 'daily', label: 'Daily Digest', description: 'Once per day' },
  { value: 'weekly', label: 'Weekly Digest', description: 'Once per week' },
];

// Alert Card Component
function AlertCard({
  alert,
  onEdit,
  onToggle,
  onDelete,
  onViewMatches,
}: {
  alert: JobAlert;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onViewMatches: () => void;
}) {
  const frequencyLabels = {
    instant: '⚡ Instant',
    daily: '📅 Daily',
    weekly: '📆 Weekly',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${
      alert.isActive 
        ? 'border-gray-200 dark:border-gray-700' 
        : 'border-gray-100 dark:border-gray-800 opacity-60'
    } p-6`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{alert.name}</h3>
            {!alert.isActive && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded">
                Paused
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {frequencyLabels[alert.frequency]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              alert.isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                alert.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Criteria Summary */}
      <div className="space-y-2 mb-4">
        {alert.keywords.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400">🔍</span>
            <span className="text-gray-600 dark:text-gray-400">{alert.keywords.join(', ')}</span>
          </div>
        )}
        {alert.locations.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400">📍</span>
            <span className="text-gray-600 dark:text-gray-400">{alert.locations.join(', ')}</span>
          </div>
        )}
        {alert.industries.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400">🏢</span>
            <span className="text-gray-600 dark:text-gray-400">{alert.industries.join(', ')}</span>
          </div>
        )}
        {alert.salaryRange.min || alert.salaryRange.max ? (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400">💰</span>
            <span className="text-gray-600 dark:text-gray-400">
              {alert.salaryRange.min && alert.salaryRange.max
                ? `$${alert.salaryRange.min.toLocaleString()} - $${alert.salaryRange.max.toLocaleString()}`
                : alert.salaryRange.min
                  ? `$${alert.salaryRange.min.toLocaleString()}+`
                  : `Up to $${alert.salaryRange.max?.toLocaleString()}`}
            </span>
          </div>
        ) : null}
      </div>

      {/* Match Info */}
      {alert.matchCount > 0 && (
        <button
          onClick={onViewMatches}
          className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between mb-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{alert.matchCount}</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">matching jobs</span>
          </div>
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onEdit} className="flex-1">
          Edit
        </Button>
        <button
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Create/Edit Alert Modal
function AlertModal({
  alert,
  onClose,
  onSave,
}: {
  alert: JobAlert | null;
  onClose: () => void;
  onSave: (data: Partial<JobAlert>) => void;
}) {
  const [name, setName] = useState(alert?.name || '');
  const [keywords, setKeywords] = useState<string[]>(alert?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [locations, setLocations] = useState<string[]>(alert?.locations || []);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(alert?.industries || []);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(alert?.jobTypes || []);
  const [experienceLevel, setExperienceLevel] = useState(alert?.experienceLevel || 'any');
  const [salaryMin, setSalaryMin] = useState(alert?.salaryRange?.min?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(alert?.salaryRange?.max?.toString() || '');
  const [remotePreference, setRemotePreference] = useState(alert?.remotePreference || 'any');
  const [frequency, setFrequency] = useState(alert?.frequency || 'daily');

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const toggleLocation = (loc: string) => {
    setLocations(locations.includes(loc) 
      ? locations.filter(l => l !== loc) 
      : [...locations, loc]
    );
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(selectedIndustries.includes(ind) 
      ? selectedIndustries.filter(i => i !== ind) 
      : [...selectedIndustries, ind]
    );
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes(selectedJobTypes.includes(type) 
      ? selectedJobTypes.filter(t => t !== type) 
      : [...selectedJobTypes, type]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      keywords,
      locations,
      industries: selectedIndustries,
      jobTypes: selectedJobTypes as JobAlert['jobTypes'],
      experienceLevel: experienceLevel as JobAlert['experienceLevel'],
      salaryRange: {
        min: salaryMin ? parseInt(salaryMin) : undefined,
        max: salaryMax ? parseInt(salaryMax) : undefined,
      },
      remotePreference: remotePreference as JobAlert['remotePreference'],
      frequency: frequency as JobAlert['frequency'],
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {alert ? 'Edit Alert' : 'Create Job Alert'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alert Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alert Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Engineer Jobs in Sydney"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Keywords
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="Add keyword..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button onClick={addKeyword}>Add</Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="hover:text-blue-900">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Locations
            </label>
            <div className="flex flex-wrap gap-2">
              {australianCities.map((city) => (
                <button
                  key={city}
                  onClick={() => toggleLocation(city)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    locations.includes(city)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Industries
            </label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedIndustries.includes(industry)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          {/* Job Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Types
            </label>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleJobType(type.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedJobTypes.includes(type.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level & Remote */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as JobAlert['experienceLevel'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {experienceLevels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Arrangement
              </label>
              <select
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value as JobAlert['remotePreference'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {remoteOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Salary Range (Annual)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="Min"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="Max"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Frequency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {frequencies.map((freq) => (
                <button
                  key={freq.value}
                  onClick={() => setFrequency(freq.value as JobAlert['frequency'])}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    frequency === freq.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{freq.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{freq.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1" disabled={!name.trim()}>
            {alert ? 'Save Changes' : 'Create Alert'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Matches Modal
function MatchesModal({
  alert,
  matches,
  onClose,
  onViewJob,
}: {
  alert: JobAlert;
  matches: AlertMatch[];
  onClose: () => void;
  onViewJob: (jobId: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Matching Jobs</h2>
              <p className="text-gray-500 text-sm mt-1">{alert.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => onViewJob(match.job.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors hover:border-blue-300 ${
                    match.isViewed
                      ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {match.job.logo ? (
                      <OptimizedImage src={toCloudinaryAutoUrl(match.job.logo)} alt={match.job.company} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                        🏢
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{match.job.title}</h3>
                        {!match.isViewed && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">New</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{match.job.company}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>📍 {match.job.location}</span>
                        {match.job.salary && <span>💰 {match.job.salary}</span>}
                        {match.job.isRemote && (
                          <span className="text-green-600">🏠 Remote</span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-medium text-gray-900 dark:text-white">No matches yet</h3>
              <p className="text-gray-500 mt-2">We'll notify you when matching jobs are posted</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function JobAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [viewingMatches, setViewingMatches] = useState<{ alert: JobAlert; matches: AlertMatch[] } | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { alerts } = await alertsApi.getAlerts();
      setAlerts(alerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleCreateAlert = async (data: Partial<JobAlert>) => {
    try {
      const newAlert = await alertsApi.createAlert(data as any);
      setAlerts([newAlert, ...alerts]);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleUpdateAlert = async (data: Partial<JobAlert>) => {
    if (!editingAlert) return;
    try {
      const updated = await alertsApi.updateAlert(editingAlert.id, data);
      setAlerts(alerts.map(a => a.id === updated.id ? updated : a));
      setEditingAlert(null);
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const handleToggleAlert = async (alert: JobAlert) => {
    try {
      await alertsApi.toggleAlert(alert.id, !alert.isActive);
      setAlerts(alerts.map(a => a.id === alert.id ? { ...a, isActive: !a.isActive } : a));
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await alertsApi.deleteAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleViewMatches = async (alert: JobAlert) => {
    try {
      const { matches } = await alertsApi.getMatches(alert.id);
      setViewingMatches({ alert, matches });
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  const handleViewJob = (jobId: string) => {
    // Navigate to job page
    window.location.href = `/jobs/${jobId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Alerts</h1>
          <p className="text-gray-500 mt-1">Get notified when new jobs match your criteria</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Alert
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</div>
          <div className="text-sm text-gray-500">Total Alerts</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{alerts.filter(a => a.isActive).length}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{alerts.reduce((acc, a) => acc + a.matchCount, 0)}</div>
          <div className="text-sm text-gray-500">Total Matches</div>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onEdit={() => setEditingAlert(alert)}
              onToggle={() => handleToggleAlert(alert)}
              onDelete={() => handleDeleteAlert(alert.id)}
              onViewMatches={() => handleViewMatches(alert)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No job alerts yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Create your first alert to get notified about matching jobs</p>
          <Button onClick={() => setShowModal(true)}>Create Job Alert</Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showModal || editingAlert) && (
        <AlertModal
          alert={editingAlert}
          onClose={() => {
            setShowModal(false);
            setEditingAlert(null);
          }}
          onSave={editingAlert ? handleUpdateAlert : handleCreateAlert}
        />
      )}

      {/* Matches Modal */}
      {viewingMatches && (
        <MatchesModal
          alert={viewingMatches.alert}
          matches={viewingMatches.matches}
          onClose={() => setViewingMatches(null)}
          onViewJob={handleViewJob}
        />
      )}
    </div>
  );
}

export default JobAlerts;
