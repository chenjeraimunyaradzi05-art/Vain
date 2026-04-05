/**
 * Member Settings Page
 * 
 * Comprehensive settings for account, privacy, notifications, and preferences.
 */

'use client';

import React, { useState, useEffect } from 'react';
import FoundationPreferences from '../../../components/settings/FoundationPreferences';

// Types
interface NotificationSettings {
  email: {
    jobAlerts: boolean;
    applicationUpdates: boolean;
    mentorshipReminders: boolean;
    eventReminders: boolean;
    communityDigest: boolean;
    marketingEmails: boolean;
  };
  push: {
    enabled: boolean;
    messages: boolean;
    applications: boolean;
    interviews: boolean;
    offers: boolean;
  };
  sms: {
    enabled: boolean;
    interviews: boolean;
    offers: boolean;
  };
}

interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'CONNECTIONS_ONLY' | 'PRIVATE';
  showCulturalIdentity: boolean;
  showLocation: boolean;
  showEmploymentStatus: boolean;
  allowMessagesFrom: 'EVERYONE' | 'CONNECTIONS' | 'EMPLOYERS' | 'NONE';
  showInSearch: boolean;
  showOnLeaderboard: boolean;
  dataSovereignty: {
    shareWithEmployers: boolean;
    shareWithMentors: boolean;
    shareAggregatedStats: boolean;
  };
}

interface AccountSettings {
  email: string;
  phone: string;
  twoFactorEnabled: boolean;
  language: string;
  timezone: string;
}

// Section Component
function SettingsSection({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </div>
  );
}

// Toggle Component
function Toggle({ 
  enabled, 
  onChange, 
  label, 
  description,
  disabled = false,
}: { 
  enabled: boolean; 
  onChange: (value: boolean) => void; 
  label: string; 
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`font-medium ${disabled ? 'text-slate-500' : 'text-white'}`}>{label}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-600' : 'bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Select Component
function SelectOption({ 
  value, 
  options, 
  onChange, 
  label, 
  description 
}: { 
  value: string; 
  options: { value: string; label: string }[]; 
  onChange: (value: string) => void; 
  label: string; 
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-white">{label}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'data' | 'preferences' | 'interests'>('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      jobAlerts: true,
      applicationUpdates: true,
      mentorshipReminders: true,
      eventReminders: true,
      communityDigest: true,
      marketingEmails: false,
    },
    push: {
      enabled: true,
      messages: true,
      applications: true,
      interviews: true,
      offers: true,
    },
    sms: {
      enabled: false,
      interviews: false,
      offers: false,
    },
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'MEMBERS_ONLY',
    showCulturalIdentity: true,
    showLocation: true,
    showEmploymentStatus: true,
    allowMessagesFrom: 'EVERYONE',
    showInSearch: true,
    showOnLeaderboard: true,
    dataSovereignty: {
      shareWithEmployers: true,
      shareWithMentors: true,
      shareAggregatedStats: true,
    },
  });

  const [account, setAccount] = useState<AccountSettings>({
    email: 'user@example.com',
    phone: '+61 412 345 678',
    twoFactorEnabled: false,
    language: 'en-AU',
    timezone: 'Australia/Sydney',
  });

  useEffect(() => {
    const loadSettings = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setHasChanges(false);
  };

  const updateNotifications = (path: string, value: boolean) => {
    const [category, key] = path.split('.');
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof NotificationSettings] as Record<string, boolean>,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const updatePrivacy = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const tabs = [
    { key: 'account', label: 'Account', icon: '👤' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'privacy', label: 'Privacy', icon: '🔒' },
    { key: 'data', label: 'Data & Sovereignty', icon: '🌏' },
    { key: 'interests', label: 'Interests & Alerts', icon: '🎯' },
    { key: 'preferences', label: 'Preferences', icon: '⚙️' },
  ];

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
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-2">Manage your account, privacy, and preferences</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Account Settings */}
            {activeTab === 'account' && (
              <>
                <SettingsSection title="Account Information" description="Manage your account details">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={account.email}
                        onChange={(e) => {
                          setAccount({ ...account, email: e.target.value });
                          setHasChanges(true);
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={account.phone}
                        onChange={(e) => {
                          setAccount({ ...account, phone: e.target.value });
                          setHasChanges(true);
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection title="Security" description="Protect your account">
                  <Toggle
                    enabled={account.twoFactorEnabled}
                    onChange={(value) => {
                      setAccount({ ...account, twoFactorEnabled: value });
                      setHasChanges(true);
                    }}
                    label="Two-Factor Authentication"
                    description="Add an extra layer of security to your account"
                  />
                  <div className="pt-4">
                    <button className="text-green-400 hover:text-green-300 text-sm font-medium">
                      Change Password
                    </button>
                  </div>
                </SettingsSection>

                <SettingsSection title="Danger Zone" description="Irreversible account actions">
                  <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-400">Delete Account</p>
                      <p className="text-sm text-slate-400">Permanently delete your account and all data</p>
                    </div>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors text-sm font-medium">
                      Delete Account
                    </button>
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <>
                <SettingsSection title="Email Notifications" description="Manage email preferences">
                  <Toggle
                    enabled={notifications.email.jobAlerts}
                    onChange={(v) => updateNotifications('email.jobAlerts', v)}
                    label="Job Alerts"
                    description="Get notified when new jobs match your profile"
                  />
                  <Toggle
                    enabled={notifications.email.applicationUpdates}
                    onChange={(v) => updateNotifications('email.applicationUpdates', v)}
                    label="Application Updates"
                    description="Receive updates on your job applications"
                  />
                  <Toggle
                    enabled={notifications.email.mentorshipReminders}
                    onChange={(v) => updateNotifications('email.mentorshipReminders', v)}
                    label="Mentorship Reminders"
                    description="Get reminded about upcoming mentorship sessions"
                  />
                  <Toggle
                    enabled={notifications.email.eventReminders}
                    onChange={(v) => updateNotifications('email.eventReminders', v)}
                    label="Event Reminders"
                    description="Receive reminders for events you're attending"
                  />
                  <Toggle
                    enabled={notifications.email.communityDigest}
                    onChange={(v) => updateNotifications('email.communityDigest', v)}
                    label="Community Digest"
                    description="Weekly digest of community updates"
                  />
                  <Toggle
                    enabled={notifications.email.marketingEmails}
                    onChange={(v) => updateNotifications('email.marketingEmails', v)}
                    label="Marketing Emails"
                    description="Promotional emails and special offers"
                  />
                </SettingsSection>

                <SettingsSection title="Push Notifications" description="Mobile and browser notifications">
                  <Toggle
                    enabled={notifications.push.enabled}
                    onChange={(v) => updateNotifications('push.enabled', v)}
                    label="Enable Push Notifications"
                    description="Receive notifications on your device"
                  />
                  <Toggle
                    enabled={notifications.push.messages}
                    onChange={(v) => updateNotifications('push.messages', v)}
                    label="Messages"
                    description="Get notified about new messages"
                    disabled={!notifications.push.enabled}
                  />
                  <Toggle
                    enabled={notifications.push.applications}
                    onChange={(v) => updateNotifications('push.applications', v)}
                    label="Application Updates"
                    description="Updates on your job applications"
                    disabled={!notifications.push.enabled}
                  />
                  <Toggle
                    enabled={notifications.push.interviews}
                    onChange={(v) => updateNotifications('push.interviews', v)}
                    label="Interview Reminders"
                    description="Never miss an interview"
                    disabled={!notifications.push.enabled}
                  />
                  <Toggle
                    enabled={notifications.push.offers}
                    onChange={(v) => updateNotifications('push.offers', v)}
                    label="Job Offers"
                    description="Instant notification when you receive an offer"
                    disabled={!notifications.push.enabled}
                  />
                </SettingsSection>

                <SettingsSection title="SMS Notifications" description="Text message alerts">
                  <Toggle
                    enabled={notifications.sms.enabled}
                    onChange={(v) => updateNotifications('sms.enabled', v)}
                    label="Enable SMS Notifications"
                    description="Receive critical alerts via SMS"
                  />
                  <Toggle
                    enabled={notifications.sms.interviews}
                    onChange={(v) => updateNotifications('sms.interviews', v)}
                    label="Interview Reminders"
                    description="SMS reminder before interviews"
                    disabled={!notifications.sms.enabled}
                  />
                  <Toggle
                    enabled={notifications.sms.offers}
                    onChange={(v) => updateNotifications('sms.offers', v)}
                    label="Job Offers"
                    description="SMS alert when you receive an offer"
                    disabled={!notifications.sms.enabled}
                  />
                </SettingsSection>
              </>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <>
                <SettingsSection title="Profile Visibility" description="Control who can see your profile">
                  <SelectOption
                    value={privacy.profileVisibility}
                    onChange={(v) => updatePrivacy('profileVisibility', v as any)}
                    label="Profile Visibility"
                    description="Who can view your profile"
                    options={[
                      { value: 'PUBLIC', label: 'Public' },
                      { value: 'MEMBERS_ONLY', label: 'Members Only' },
                      { value: 'CONNECTIONS_ONLY', label: 'Connections Only' },
                      { value: 'PRIVATE', label: 'Private' },
                    ]}
                  />
                  <Toggle
                    enabled={privacy.showCulturalIdentity}
                    onChange={(v) => updatePrivacy('showCulturalIdentity', v)}
                    label="Show Cultural Identity"
                    description="Display your nation/mob on your profile"
                  />
                  <Toggle
                    enabled={privacy.showLocation}
                    onChange={(v) => updatePrivacy('showLocation', v)}
                    label="Show Location"
                    description="Display your city and state"
                  />
                  <Toggle
                    enabled={privacy.showEmploymentStatus}
                    onChange={(v) => updatePrivacy('showEmploymentStatus', v)}
                    label="Show Employment Status"
                    description="Let employers know if you're seeking work"
                  />
                </SettingsSection>

                <SettingsSection title="Communication" description="Control who can contact you">
                  <SelectOption
                    value={privacy.allowMessagesFrom}
                    onChange={(v) => updatePrivacy('allowMessagesFrom', v as any)}
                    label="Allow Messages From"
                    description="Who can send you messages"
                    options={[
                      { value: 'EVERYONE', label: 'Everyone' },
                      { value: 'CONNECTIONS', label: 'Connections Only' },
                      { value: 'EMPLOYERS', label: 'Employers Only' },
                      { value: 'NONE', label: 'No One' },
                    ]}
                  />
                </SettingsSection>

                <SettingsSection title="Discovery" description="Control how others find you">
                  <Toggle
                    enabled={privacy.showInSearch}
                    onChange={(v) => updatePrivacy('showInSearch', v)}
                    label="Appear in Search"
                    description="Allow others to find you in search results"
                  />
                  <Toggle
                    enabled={privacy.showOnLeaderboard}
                    onChange={(v) => updatePrivacy('showOnLeaderboard', v)}
                    label="Appear on Leaderboards"
                    description="Show your name on community leaderboards"
                  />
                </SettingsSection>
              </>
            )}

            {/* Data Sovereignty Settings */}
            {activeTab === 'data' && (
              <>
                <SettingsSection 
                  title="Indigenous Data Sovereignty" 
                  description="Control how your data is used, in line with Indigenous data sovereignty principles"
                >
                  <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg mb-4">
                    <p className="text-amber-400 text-sm">
                      🌏 We respect Indigenous data sovereignty principles. You have full control over your personal 
                      and cultural data. Your data will never be shared without your explicit consent.
                    </p>
                  </div>
                  <Toggle
                    enabled={privacy.dataSovereignty.shareWithEmployers}
                    onChange={(v) => updatePrivacy('dataSovereignty', { ...privacy.dataSovereignty, shareWithEmployers: v })}
                    label="Share Profile with Employers"
                    description="Allow verified employers to view your profile for job opportunities"
                  />
                  <Toggle
                    enabled={privacy.dataSovereignty.shareWithMentors}
                    onChange={(v) => updatePrivacy('dataSovereignty', { ...privacy.dataSovereignty, shareWithMentors: v })}
                    label="Share Profile with Mentors"
                    description="Allow potential mentors to view your profile for mentorship matching"
                  />
                  <Toggle
                    enabled={privacy.dataSovereignty.shareAggregatedStats}
                    onChange={(v) => updatePrivacy('dataSovereignty', { ...privacy.dataSovereignty, shareAggregatedStats: v })}
                    label="Contribute to Community Statistics"
                    description="Allow your anonymized data to contribute to Indigenous employment statistics"
                  />
                </SettingsSection>

                <SettingsSection title="Your Data" description="Download or delete your data">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Download Your Data</p>
                      <p className="text-sm text-slate-500">Get a copy of all your personal data</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                      Request Download
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Data Portability</p>
                      <p className="text-sm text-slate-500">Export your data in a portable format</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                      Export Data
                    </button>
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Interests & Job Alerts */}
            {activeTab === 'interests' && (
              <FoundationPreferences />
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <>
                <SettingsSection title="Language & Region" description="Customize your experience">
                  <SelectOption
                    value={account.language}
                    onChange={(v) => {
                      setAccount({ ...account, language: v });
                      setHasChanges(true);
                    }}
                    label="Language"
                    description="Display language for the platform"
                    options={[
                      { value: 'en-AU', label: 'English (Australia)' },
                      { value: 'en-US', label: 'English (US)' },
                      { value: 'yolngu', label: 'Yolngu Matha (Beta)' },
                      { value: 'warlpiri', label: 'Warlpiri (Beta)' },
                    ]}
                  />
                  <SelectOption
                    value={account.timezone}
                    onChange={(v) => {
                      setAccount({ ...account, timezone: v });
                      setHasChanges(true);
                    }}
                    label="Timezone"
                    description="Used for scheduling and reminders"
                    options={[
                      { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
                      { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
                      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
                      { value: 'Australia/Perth', label: 'Perth (AWST)' },
                      { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
                      { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
                    ]}
                  />
                </SettingsSection>

                <SettingsSection title="Appearance" description="Customize the look and feel">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Theme</p>
                      <p className="text-sm text-slate-500">Choose your preferred theme</p>
                    </div>
                    <div className="flex gap-2">
                      {['Dark', 'Light', 'System'].map((theme) => (
                        <button
                          key={theme}
                          className={`px-4 py-2 rounded-lg text-sm ${
                            theme === 'Dark'
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Save Button */}
            {hasChanges && (
              <div className="sticky bottom-4 bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
                <p className="text-slate-300">You have unsaved changes</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasChanges(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
