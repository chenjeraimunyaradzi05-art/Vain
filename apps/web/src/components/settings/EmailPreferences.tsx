'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * EmailPreferences - Email notification management
 * 
 * Features:
 * - Manage email notification categories
 * - Set email frequency preferences
 * - Unsubscribe management
 * - Email digest settings
 */

interface EmailPreferences {
  enabled: boolean;
  emailAddress: string;
  verified: boolean;
  categories: EmailCategory[];
  digestSettings: DigestSettings;
  quietHours: QuietHours;
}

interface EmailCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly' | 'never';
  subcategories?: EmailSubcategory[];
}

interface EmailSubcategory {
  id: string;
  name: string;
  enabled: boolean;
}

interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  dayOfWeek?: number; // 0-6 for weekly
  timeOfDay: string; // HH:mm format
  includeJobAlerts: boolean;
  includeApplicationUpdates: boolean;
  includeMessages: boolean;
  includeCommunity: boolean;
}

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

// API functions
const emailApi = {
  async getPreferences(): Promise<EmailPreferences> {
    const res = await fetch('/api/email/preferences', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updatePreferences(preferences: Partial<EmailPreferences>): Promise<EmailPreferences> {
    const res = await fetch('/api/email/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(preferences),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
    return res.json();
  },

  async updateCategory(categoryId: string, updates: Partial<EmailCategory>): Promise<EmailCategory> {
    const res = await fetch(`/api/email/preferences/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async unsubscribeAll(): Promise<void> {
    const res = await fetch('/api/email/unsubscribe-all', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unsubscribe');
  },

  async verifyEmail(): Promise<void> {
    const res = await fetch('/api/email/verify', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to send verification');
  },
};

// Default categories if API doesn't return them
const defaultCategories: EmailCategory[] = [
  {
    id: 'jobs',
    name: 'Job Alerts',
    description: 'New jobs matching your preferences',
    icon: '💼',
    enabled: true,
    frequency: 'daily',
    subcategories: [
      { id: 'new-jobs', name: 'New job matches', enabled: true },
      { id: 'job-recommendations', name: 'Recommended jobs', enabled: true },
      { id: 'saved-searches', name: 'Saved search alerts', enabled: true },
    ],
  },
  {
    id: 'applications',
    name: 'Applications',
    description: 'Updates on your job applications',
    icon: '📝',
    enabled: true,
    frequency: 'instant',
    subcategories: [
      { id: 'status-updates', name: 'Status changes', enabled: true },
      { id: 'interview-invites', name: 'Interview invitations', enabled: true },
      { id: 'feedback', name: 'Application feedback', enabled: true },
    ],
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'New messages and replies',
    icon: '💬',
    enabled: true,
    frequency: 'instant',
    subcategories: [
      { id: 'direct-messages', name: 'Direct messages', enabled: true },
      { id: 'employer-messages', name: 'Employer messages', enabled: true },
      { id: 'group-messages', name: 'Group conversations', enabled: true },
    ],
  },
  {
    id: 'network',
    name: 'Network',
    description: 'Connection requests and updates',
    icon: '🤝',
    enabled: true,
    frequency: 'daily',
    subcategories: [
      { id: 'connection-requests', name: 'Connection requests', enabled: true },
      { id: 'profile-views', name: 'Profile views', enabled: true },
      { id: 'endorsements', name: 'Skill endorsements', enabled: true },
    ],
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Events, groups, and community updates',
    icon: '🏘️',
    enabled: true,
    frequency: 'weekly',
    subcategories: [
      { id: 'events', name: 'Upcoming events', enabled: true },
      { id: 'groups', name: 'Group activity', enabled: true },
      { id: 'cultural-calendar', name: 'Cultural calendar', enabled: true },
    ],
  },
  {
    id: 'learning',
    name: 'Learning',
    description: 'Course updates and recommendations',
    icon: '📚',
    enabled: true,
    frequency: 'weekly',
    subcategories: [
      { id: 'course-progress', name: 'Course reminders', enabled: true },
      { id: 'new-courses', name: 'New courses', enabled: true },
      { id: 'certificates', name: 'Certificate updates', enabled: true },
    ],
  },
  {
    id: 'account',
    name: 'Account & Security',
    description: 'Security alerts and account updates',
    icon: '🔒',
    enabled: true,
    frequency: 'instant',
    subcategories: [
      { id: 'security-alerts', name: 'Security alerts', enabled: true },
      { id: 'login-notifications', name: 'Login notifications', enabled: true },
      { id: 'account-changes', name: 'Account changes', enabled: true },
    ],
  },
  {
    id: 'marketing',
    name: 'Tips & News',
    description: 'Career tips, platform news, and updates',
    icon: '📰',
    enabled: false,
    frequency: 'weekly',
    subcategories: [
      { id: 'career-tips', name: 'Career tips', enabled: true },
      { id: 'platform-updates', name: 'Platform updates', enabled: true },
      { id: 'newsletter', name: 'Newsletter', enabled: true },
    ],
  },
];

// Frequency Badge
function FrequencyBadge({ frequency }: { frequency: string }) {
  const config = {
    instant: { label: 'Instant', color: 'bg-green-100 text-green-700' },
    daily: { label: 'Daily', color: 'bg-blue-100 text-blue-700' },
    weekly: { label: 'Weekly', color: 'bg-purple-100 text-purple-700' },
    never: { label: 'Off', color: 'bg-gray-100 text-gray-500' },
  };

  const badge = config[frequency as keyof typeof config] || config.never;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
      {badge.label}
    </span>
  );
}

// Category Card
function CategoryCard({
  category,
  onToggle,
  onFrequencyChange,
  onSubcategoryToggle,
}: {
  category: EmailCategory;
  onToggle: () => void;
  onFrequencyChange: (frequency: EmailCategory['frequency']) => void;
  onSubcategoryToggle: (subcategoryId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
              <FrequencyBadge frequency={category.enabled ? category.frequency : 'never'} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`w-12 h-6 rounded-full relative transition-colors ${
            category.enabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              category.enabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {category.enabled && (
        <div className="px-4 pb-4">
          {/* Frequency Selection */}
          <div className="flex gap-2 mb-3">
            {(['instant', 'daily', 'weekly', 'never'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => onFrequencyChange(freq)}
                className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                  category.frequency === freq
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 hover:bg-gray-200'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>

          {/* Subcategories */}
          {category.subcategories && category.subcategories.length > 0 && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:underline mb-2"
              >
                {isExpanded ? 'Hide' : 'Show'} {category.subcategories.length} options
              </button>

              {isExpanded && (
                <div className="space-y-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {category.subcategories.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">{sub.name}</span>
                      <button
                        onClick={() => onSubcategoryToggle(sub.id)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          sub.enabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            sub.enabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Digest Settings Section
function DigestSettingsSection({
  settings,
  onChange,
}: {
  settings: DigestSettings;
  onChange: (updates: Partial<DigestSettings>) => void;
}) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Digest</h3>
          <p className="text-sm text-gray-500">Get a summary email instead of individual notifications</p>
        </div>
        <button
          onClick={() => onChange({ enabled: !settings.enabled })}
          className={`w-12 h-6 rounded-full relative transition-colors ${
            settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.enabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => onChange({ frequency: freq })}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    settings.frequency === freq
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week (for weekly) */}
          {settings.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of Week
              </label>
              <select
                value={settings.dayOfWeek}
                onChange={(e) => onChange({ dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {daysOfWeek.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time of Day
            </label>
            <input
              type="time"
              value={settings.timeOfDay}
              onChange={(e) => onChange({ timeOfDay: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Include in digest
            </label>
            <div className="space-y-2">
              {[
                { key: 'includeJobAlerts', label: 'Job alerts' },
                { key: 'includeApplicationUpdates', label: 'Application updates' },
                { key: 'includeMessages', label: 'Message summaries' },
                { key: 'includeCommunity', label: 'Community updates' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <button
                    onClick={() => onChange({ [item.key]: !settings[item.key as keyof DigestSettings] })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      settings[item.key as keyof DigestSettings] ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings[item.key as keyof DigestSettings] ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quiet Hours Section
function QuietHoursSection({
  settings,
  onChange,
}: {
  settings: QuietHours;
  onChange: (updates: Partial<QuietHours>) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quiet Hours</h3>
          <p className="text-sm text-gray-500">Don't send emails during these hours</p>
        </div>
        <button
          onClick={() => onChange({ enabled: !settings.enabled })}
          className={`w-12 h-6 rounded-full relative transition-colors ${
            settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.enabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={settings.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={settings.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function EmailPreferencesPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const prefs = await emailApi.getPreferences();
      // Merge with defaults if categories are missing
      if (!prefs.categories || prefs.categories.length === 0) {
        prefs.categories = defaultCategories;
      }
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Set defaults
      setPreferences({
        enabled: true,
        emailAddress: user?.email || '',
        verified: true,
        categories: defaultCategories,
        digestSettings: {
          enabled: false,
          frequency: 'daily',
          timeOfDay: '09:00',
          includeJobAlerts: true,
          includeApplicationUpdates: true,
          includeMessages: true,
          includeCommunity: true,
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'Australia/Sydney',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCategoryUpdate = async (categoryId: string, updates: Partial<EmailCategory>) => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      await emailApi.updateCategory(categoryId, updates);
      setPreferences({
        ...preferences,
        categories: preferences.categories.map((c) =>
          c.id === categoryId ? { ...c, ...updates } : c
        ),
      });
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubcategoryToggle = (categoryId: string, subcategoryId: string) => {
    if (!preferences) return;
    const category = preferences.categories.find(c => c.id === categoryId);
    if (!category?.subcategories) return;

    const updatedSubcategories = category.subcategories.map(s =>
      s.id === subcategoryId ? { ...s, enabled: !s.enabled } : s
    );

    handleCategoryUpdate(categoryId, { subcategories: updatedSubcategories });
  };

  const handleDigestChange = async (updates: Partial<DigestSettings>) => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const updated = await emailApi.updatePreferences({
        digestSettings: { ...preferences.digestSettings, ...updates },
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to update digest settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuietHoursChange = async (updates: Partial<QuietHours>) => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const updated = await emailApi.updatePreferences({
        quietHours: { ...preferences.quietHours, ...updates },
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to update quiet hours:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!confirm('Are you sure you want to unsubscribe from all emails? You will still receive essential account and security emails.')) {
      return;
    }
    try {
      await emailApi.unsubscribeAll();
      setPreferences({
        ...preferences!,
        categories: preferences!.categories.map(c => ({
          ...c,
          enabled: c.id === 'account', // Keep security emails
        })),
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  if (isLoading || !preferences) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Preferences</h1>
          <p className="text-gray-500 mt-1">Manage what emails you receive</p>
        </div>
        <Button variant="outline" onClick={handleUnsubscribeAll}>
          Unsubscribe All
        </Button>
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </div>
      )}

      {/* Email Address */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Email address</p>
            <p className="font-medium text-gray-900 dark:text-white">{preferences.emailAddress}</p>
          </div>
          {preferences.verified ? (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verified
            </span>
          ) : (
            <Button onClick={() => emailApi.verifyEmail()}>Verify Email</Button>
          )}
        </div>
      </div>

      {/* Email Categories */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Categories</h2>
        {preferences.categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onToggle={() => handleCategoryUpdate(category.id, { enabled: !category.enabled })}
            onFrequencyChange={(frequency) => handleCategoryUpdate(category.id, { frequency })}
            onSubcategoryToggle={(subId) => handleSubcategoryToggle(category.id, subId)}
          />
        ))}
      </div>

      {/* Digest Settings */}
      <div className="mb-6">
        <DigestSettingsSection
          settings={preferences.digestSettings}
          onChange={handleDigestChange}
        />
      </div>

      {/* Quiet Hours */}
      <div className="mb-6">
        <QuietHoursSection
          settings={preferences.quietHours}
          onChange={handleQuietHoursChange}
        />
      </div>
    </div>
  );
}

export default EmailPreferencesPage;
