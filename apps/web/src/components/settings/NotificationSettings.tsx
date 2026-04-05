'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * NotificationSettings - Notification preferences management
 * 
 * Features:
 * - Push notifications
 * - In-app notifications
 * - Notification sounds
 * - Do not disturb
 */

interface NotificationPreferences {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  previewEnabled: boolean;
  categories: NotificationCategory[];
  doNotDisturb: DoNotDisturbSettings;
  digest: DigestSettings;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  channels: {
    push: boolean;
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  priority: 'high' | 'normal' | 'low';
}

interface DoNotDisturbSettings {
  enabled: boolean;
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: string[];
  };
  allowExceptions: boolean;
  exceptions: string[];
}

interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  includeCategories: string[];
}

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  {
    id: 'jobs',
    name: 'Job Opportunities',
    description: 'New job matches and application updates',
    icon: '💼',
    channels: { push: true, inApp: true, email: true, sms: false },
    priority: 'high',
  },
  {
    id: 'applications',
    name: 'Applications',
    description: 'Status changes, interview invites, offers',
    icon: '📝',
    channels: { push: true, inApp: true, email: true, sms: true },
    priority: 'high',
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Direct messages from employers and connections',
    icon: '💬',
    channels: { push: true, inApp: true, email: false, sms: false },
    priority: 'high',
  },
  {
    id: 'network',
    name: 'Network',
    description: 'Connection requests, profile views, endorsements',
    icon: '🤝',
    channels: { push: true, inApp: true, email: true, sms: false },
    priority: 'normal',
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Events, stories, group activities',
    icon: '🌏',
    channels: { push: true, inApp: true, email: true, sms: false },
    priority: 'normal',
  },
  {
    id: 'learning',
    name: 'Learning',
    description: 'Course updates, achievements, recommendations',
    icon: '📚',
    channels: { push: true, inApp: true, email: true, sms: false },
    priority: 'normal',
  },
  {
    id: 'mentorship',
    name: 'Mentorship',
    description: 'Mentor matching, session reminders',
    icon: '🎓',
    channels: { push: true, inApp: true, email: true, sms: true },
    priority: 'high',
  },
  {
    id: 'account',
    name: 'Account & Security',
    description: 'Login alerts, password changes, security notices',
    icon: '🔐',
    channels: { push: true, inApp: true, email: true, sms: true },
    priority: 'high',
  },
];

// API functions
const notificationApi = {
  async getPreferences(): Promise<NotificationPreferences> {
    const res = await fetch('/api/settings/notifications', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    const res = await fetch('/api/settings/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
  },

  async updateCategory(categoryId: string, channels: NotificationCategory['channels']): Promise<void> {
    const res = await fetch(`/api/settings/notifications/categories/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ channels }),
    });
    if (!res.ok) throw new Error('Failed to update category');
  },

  async testNotification(channel: 'push' | 'email'): Promise<void> {
    const res = await fetch('/api/settings/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) throw new Error('Failed to send test');
  },

  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },
};

// Section Component
function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {children}
    </div>
  );
}

// Toggle Component
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

// Master Toggle
function MasterToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  onTest,
}: {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onTest?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onTest && checked && (
          <button
            onClick={onTest}
            className="text-sm text-blue-600 hover:underline"
          >
            Test
          </button>
        )}
        <Toggle checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

// Category Row
function CategoryRow({
  category,
  onUpdate,
  pushEnabled,
  inAppEnabled,
  emailEnabled,
  smsEnabled,
}: {
  category: NotificationCategory;
  onUpdate: (channels: NotificationCategory['channels']) => void;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (channel: keyof NotificationCategory['channels']) => {
    onUpdate({ ...category.channels, [channel]: !category.channels[channel] });
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div
        className="flex items-center justify-between py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{category.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[category.priority]}`}>
                {category.priority}
              </span>
            </div>
            <p className="text-sm text-gray-500">{category.description}</p>
          </div>
        </div>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="pb-4 pl-10 grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Toggle
              checked={category.channels.push}
              onChange={() => handleToggle('push')}
              disabled={!pushEnabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Push</span>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={category.channels.inApp}
              onChange={() => handleToggle('inApp')}
              disabled={!inAppEnabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">In-App</span>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={category.channels.email}
              onChange={() => handleToggle('email')}
              disabled={!emailEnabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={category.channels.sms}
              onChange={() => handleToggle('sms')}
              disabled={!smsEnabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Do Not Disturb Section
function DoNotDisturbSection({
  settings,
  onChange,
}: {
  settings: DoNotDisturbSettings;
  onChange: (settings: DoNotDisturbSettings) => void;
}) {
  const days = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' },
  ];

  const toggleDay = (day: string) => {
    const newDays = settings.schedule.days.includes(day)
      ? settings.schedule.days.filter(d => d !== day)
      : [...settings.schedule.days, day];
    onChange({
      ...settings,
      schedule: { ...settings.schedule, days: newDays },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Do Not Disturb</span>
          <p className="text-sm text-gray-500">Pause all notifications</p>
        </div>
        <Toggle
          checked={settings.enabled}
          onChange={(v) => onChange({ ...settings, enabled: v })}
        />
      </div>

      <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">Scheduled</span>
          <Toggle
            checked={settings.schedule.enabled}
            onChange={(v) =>
              onChange({ ...settings, schedule: { ...settings.schedule, enabled: v } })
            }
          />
        </div>

        {settings.schedule.enabled && (
          <>
            <div className="flex gap-4">
              <div>
                <label className="text-sm text-gray-500">From</label>
                <input
                  type="time"
                  value={settings.schedule.startTime}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      schedule: { ...settings.schedule, startTime: e.target.value },
                    })
                  }
                  className="block px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">To</label>
                <input
                  type="time"
                  value={settings.schedule.endTime}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      schedule: { ...settings.schedule, endTime: e.target.value },
                    })
                  }
                  className="block px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Days</label>
              <div className="flex gap-2">
                {days.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      settings.schedule.days.includes(day.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Allow exceptions</span>
            <p className="text-xs text-gray-500">Critical notifications will still come through</p>
          </div>
          <Toggle
            checked={settings.allowExceptions}
            onChange={(v) => onChange({ ...settings, allowExceptions: v })}
          />
        </div>
      </div>
    </div>
  );
}

// Main Component
export function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: false,
    inAppEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
    previewEnabled: true,
    categories: DEFAULT_CATEGORIES,
    doNotDisturb: {
      enabled: false,
      schedule: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
      allowExceptions: true,
      exceptions: ['applications', 'account'],
    },
    digest: {
      enabled: false,
      frequency: 'daily',
      time: '09:00',
      includeCategories: ['jobs', 'network', 'community'],
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const prefs = await notificationApi.getPreferences();
      setPreferences(prefs);
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    setIsSaving(true);
    try {
      await notificationApi.updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePush = async () => {
    const granted = await notificationApi.requestPushPermission();
    if (granted) {
      setPushPermission('granted');
      updatePreference('pushEnabled', true);
    }
  };

  const handleCategoryUpdate = async (categoryId: string, channels: NotificationCategory['channels']) => {
    const newCategories = preferences.categories.map(c =>
      c.id === categoryId ? { ...c, channels } : c
    );
    setPreferences({ ...preferences, categories: newCategories });

    try {
      await notificationApi.updateCategory(categoryId, channels);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleTest = async (channel: 'push' | 'email') => {
    try {
      await notificationApi.testNotification(channel);
      alert(`Test ${channel} notification sent!`);
    } catch (error) {
      console.error('Failed to send test:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h1>
      <p className="text-gray-500 mb-8">Control how and when you receive notifications</p>

      {/* Channels */}
      <SettingSection title="Notification Channels" description="Enable or disable notification methods">
        <div className="space-y-4">
          {pushPermission === 'denied' ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Push notifications are blocked in your browser. Please enable them in your browser settings.
              </p>
            </div>
          ) : pushPermission === 'default' ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Enable Push Notifications</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Get instant alerts for important updates
                </p>
              </div>
              <Button onClick={handleEnablePush}>Enable</Button>
            </div>
          ) : (
            <MasterToggle
              icon="🔔"
              label="Push Notifications"
              description="Instant alerts on your device"
              checked={preferences.pushEnabled}
              onChange={(v) => updatePreference('pushEnabled', v)}
              onTest={() => handleTest('push')}
            />
          )}

          <MasterToggle
            icon="📱"
            label="In-App Notifications"
            description="Notifications within the app"
            checked={preferences.inAppEnabled}
            onChange={(v) => updatePreference('inAppEnabled', v)}
          />

          <MasterToggle
            icon="📧"
            label="Email Notifications"
            description="Receive updates via email"
            checked={preferences.emailEnabled}
            onChange={(v) => updatePreference('emailEnabled', v)}
            onTest={() => handleTest('email')}
          />

          <MasterToggle
            icon="📱"
            label="SMS Notifications"
            description="Text messages for critical updates"
            checked={preferences.smsEnabled}
            onChange={(v) => updatePreference('smsEnabled', v)}
          />
        </div>
      </SettingSection>

      {/* Categories */}
      <SettingSection title="Notification Categories" description="Configure notifications for each category">
        <div>
          {preferences.categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onUpdate={(channels) => handleCategoryUpdate(category.id, channels)}
              pushEnabled={preferences.pushEnabled}
              inAppEnabled={preferences.inAppEnabled}
              emailEnabled={preferences.emailEnabled}
              smsEnabled={preferences.smsEnabled}
            />
          ))}
        </div>
      </SettingSection>

      {/* Behavior */}
      <SettingSection title="Notification Behavior">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Sound</span>
              <p className="text-sm text-gray-500">Play a sound for notifications</p>
            </div>
            <Toggle
              checked={preferences.soundEnabled}
              onChange={(v) => updatePreference('soundEnabled', v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Vibration</span>
              <p className="text-sm text-gray-500">Vibrate for notifications (mobile)</p>
            </div>
            <Toggle
              checked={preferences.vibrationEnabled}
              onChange={(v) => updatePreference('vibrationEnabled', v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Badge Count</span>
              <p className="text-sm text-gray-500">Show unread count on app icon</p>
            </div>
            <Toggle
              checked={preferences.badgeEnabled}
              onChange={(v) => updatePreference('badgeEnabled', v)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Show Preview</span>
              <p className="text-sm text-gray-500">Show notification content in alerts</p>
            </div>
            <Toggle
              checked={preferences.previewEnabled}
              onChange={(v) => updatePreference('previewEnabled', v)}
            />
          </div>
        </div>
      </SettingSection>

      {/* Do Not Disturb */}
      <SettingSection title="Do Not Disturb" description="Temporarily pause notifications">
        <DoNotDisturbSection
          settings={preferences.doNotDisturb}
          onChange={(dnd) => updatePreference('doNotDisturb', dnd)}
        />
      </SettingSection>

      {/* Save Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
