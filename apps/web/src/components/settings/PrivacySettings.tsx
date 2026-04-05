'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * PrivacySettings - Privacy and data control center
 * 
 * Features:
 * - Data privacy controls
 * - Profile visibility settings
 * - Data export and deletion
 * - Consent management
 */

interface PrivacySettings {
  profileVisibility: 'public' | 'connections' | 'employers' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showEmploymentHistory: boolean;
  showEducation: boolean;
  showSkills: boolean;
  showCulturalInfo: boolean;
  searchableByEmployers: boolean;
  searchableByRecruiters: boolean;
  allowMessages: 'everyone' | 'connections' | 'employers' | 'nobody';
  showOnlineStatus: boolean;
  showLastActive: boolean;
  allowConnectionRequests: boolean;
  shareActivityWithConnections: boolean;
  shareApplicationStatus: boolean;
}

interface DataConsent {
  id: string;
  name: string;
  description: string;
  required: boolean;
  granted: boolean;
  grantedAt?: string;
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
}

interface DataExport {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired' | 'failed';
  requestedAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  fileSize?: string;
}

interface ConnectedApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  connectedAt: string;
  lastUsedAt: string;
  permissions: string[];
}

// API functions
const privacyApi = {
  async getSettings(): Promise<PrivacySettings> {
    const res = await fetch('/api/privacy/settings', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const res = await fetch('/api/privacy/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getConsents(): Promise<{ consents: DataConsent[] }> {
    const res = await fetch('/api/privacy/consents', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch consents');
    return res.json();
  },

  async updateConsent(id: string, granted: boolean): Promise<DataConsent> {
    const res = await fetch(`/api/privacy/consents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ granted }),
    });
    if (!res.ok) throw new Error('Failed to update consent');
    return res.json();
  },

  async getDataExports(): Promise<{ exports: DataExport[] }> {
    const res = await fetch('/api/privacy/exports', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch exports');
    return res.json();
  },

  async requestDataExport(): Promise<DataExport> {
    const res = await fetch('/api/privacy/exports', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to request export');
    return res.json();
  },

  async getConnectedApps(): Promise<{ apps: ConnectedApp[] }> {
    const res = await fetch('/api/privacy/connected-apps', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch apps');
    return res.json();
  },

  async disconnectApp(id: string): Promise<void> {
    const res = await fetch(`/api/privacy/connected-apps/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to disconnect app');
  },

  async requestAccountDeletion(reason?: string): Promise<void> {
    const res = await fetch('/api/privacy/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to request deletion');
  },
};

// Visibility Settings Section
function VisibilitySection({
  settings,
  onUpdate,
}: {
  settings: PrivacySettings;
  onUpdate: (updates: Partial<PrivacySettings>) => void;
}) {
  const visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can view' },
    { value: 'connections', label: 'Connections', description: 'Only your connections' },
    { value: 'employers', label: 'Employers', description: 'Only registered employers' },
    { value: 'private', label: 'Private', description: 'Only you' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Visibility</h3>
      
      <div className="space-y-4">
        {/* Main Profile Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Who can see your profile?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate({ profileVisibility: opt.value as PrivacySettings['profileVisibility'] })}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  settings.profileVisibility === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Individual Field Visibility */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Show on profile
          </h4>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'showEmail', label: 'Email address' },
              { key: 'showPhone', label: 'Phone number' },
              { key: 'showLocation', label: 'Location' },
              { key: 'showEmploymentHistory', label: 'Employment history' },
              { key: 'showEducation', label: 'Education' },
              { key: 'showSkills', label: 'Skills' },
              { key: 'showCulturalInfo', label: 'Cultural information' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                <button
                  onClick={() => onUpdate({ [item.key]: !settings[item.key as keyof PrivacySettings] })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    settings[item.key as keyof PrivacySettings] ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings[item.key as keyof PrivacySettings] ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Search & Discovery Section
function DiscoverySection({
  settings,
  onUpdate,
}: {
  settings: PrivacySettings;
  onUpdate: (updates: Partial<PrivacySettings>) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search & Discovery</h3>
      
      <div className="space-y-4">
        {[
          { key: 'searchableByEmployers', label: 'Searchable by employers', description: 'Employers can find your profile in candidate searches' },
          { key: 'searchableByRecruiters', label: 'Searchable by recruiters', description: 'Recruiters can discover your profile' },
          { key: 'allowConnectionRequests', label: 'Allow connection requests', description: 'Others can send you connection requests' },
          { key: 'shareActivityWithConnections', label: 'Share activity', description: 'Your connections can see your activity updates' },
          { key: 'shareApplicationStatus', label: 'Share application status', description: 'Show application milestones in activity' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <button
              onClick={() => onUpdate({ [item.key]: !settings[item.key as keyof PrivacySettings] })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings[item.key as keyof PrivacySettings] ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings[item.key as keyof PrivacySettings] ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Communication Section
function CommunicationSection({
  settings,
  onUpdate,
}: {
  settings: PrivacySettings;
  onUpdate: (updates: Partial<PrivacySettings>) => void;
}) {
  const messageOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'connections', label: 'Connections only' },
    { value: 'employers', label: 'Employers only' },
    { value: 'nobody', label: 'Nobody' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Communication</h3>
      
      <div className="space-y-4">
        {/* Message Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Who can send you messages?
          </label>
          <select
            value={settings.allowMessages}
            onChange={(e) => onUpdate({ allowMessages: e.target.value as PrivacySettings['allowMessages'] })}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {messageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Show online status</p>
            <p className="text-sm text-gray-500">Others can see when you're online</p>
          </div>
          <button
            onClick={() => onUpdate({ showOnlineStatus: !settings.showOnlineStatus })}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              settings.showOnlineStatus ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.showOnlineStatus ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Last Active */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Show last active</p>
            <p className="text-sm text-gray-500">Others can see when you were last active</p>
          </div>
          <button
            onClick={() => onUpdate({ showLastActive: !settings.showLastActive })}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              settings.showLastActive ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.showLastActive ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Data Consents Section
function ConsentsSection({
  consents,
  onUpdate,
}: {
  consents: DataConsent[];
  onUpdate: (id: string, granted: boolean) => void;
}) {
  const categoryLabels = {
    essential: { label: 'Essential', color: 'bg-green-100 text-green-700' },
    functional: { label: 'Functional', color: 'bg-blue-100 text-blue-700' },
    analytics: { label: 'Analytics', color: 'bg-purple-100 text-purple-700' },
    marketing: { label: 'Marketing', color: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Data & Cookies</h3>
      <p className="text-sm text-gray-500 mb-4">Manage how we use your data</p>
      
      <div className="space-y-3">
        {consents.map((consent) => {
          const category = categoryLabels[consent.category];
          return (
            <div
              key={consent.id}
              className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">{consent.name}</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${category.color}`}>
                    {category.label}
                  </span>
                  {consent.required && (
                    <span className="text-xs text-gray-500">(Required)</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{consent.description}</p>
              </div>
              <button
                onClick={() => !consent.required && onUpdate(consent.id, !consent.granted)}
                disabled={consent.required}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  consent.granted ? 'bg-blue-500' : 'bg-gray-300'
                } ${consent.required ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    consent.granted ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Data Export Section
function DataExportSection({
  exports,
  onRequestExport,
}: {
  exports: DataExport[];
  onRequestExport: () => void;
}) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'text-yellow-600' },
    processing: { label: 'Processing', color: 'text-blue-600' },
    ready: { label: 'Ready', color: 'text-green-600' },
    expired: { label: 'Expired', color: 'text-gray-500' },
    failed: { label: 'Failed', color: 'text-red-600' },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Download Your Data</h3>
          <p className="text-sm text-gray-500">Request a copy of your personal data</p>
        </div>
        <Button onClick={onRequestExport}>Request Export</Button>
      </div>

      {exports.length > 0 && (
        <div className="space-y-3">
          {exports.map((exp) => {
            const status = statusConfig[exp.status];
            return (
              <div
                key={exp.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Export requested {new Date(exp.requestedAt).toLocaleDateString('en-AU')}
                  </p>
                  <p className={`text-sm ${status.color}`}>{status.label}</p>
                </div>
                {exp.status === 'ready' && exp.downloadUrl && (
                  <a
                    href={exp.downloadUrl}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Download
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Connected Apps Section
function ConnectedAppsSection({
  apps,
  onDisconnect,
}: {
  apps: ConnectedApp[];
  onDisconnect: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connected Apps</h3>
      <p className="text-sm text-gray-500 mb-4">Apps and services with access to your data</p>

      {apps.length > 0 ? (
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{app.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{app.name}</p>
                  <p className="text-sm text-gray-500">{app.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Connected {new Date(app.connectedAt).toLocaleDateString('en-AU')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDisconnect(app.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">No connected apps</p>
      )}
    </div>
  );
}

// Delete Account Section
function DeleteAccountSection({
  onDelete,
}: {
  onDelete: (reason?: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 p-6">
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Delete Account</h3>
      <p className="text-sm text-red-600 dark:text-red-300 mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>

      {!showConfirm ? (
        <Button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          Delete My Account
        </Button>
      ) : (
        <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Why are you leaving? (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Your feedback helps us improve..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type "DELETE" to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => onDelete(reason)}
              disabled={confirmText !== 'DELETE'}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function PrivacySettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [consents, setConsents] = useState<DataConsent[]>([]);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, consentsRes, exportsRes, appsRes] = await Promise.all([
        privacyApi.getSettings(),
        privacyApi.getConsents(),
        privacyApi.getDataExports(),
        privacyApi.getConnectedApps(),
      ]);
      setSettings(settingsRes);
      setConsents(consentsRes.consents);
      setExports(exportsRes.exports);
      setApps(appsRes.apps);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateSettings = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await privacyApi.updateSettings(updates);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConsent = async (id: string, granted: boolean) => {
    try {
      const updated = await privacyApi.updateConsent(id, granted);
      setConsents(consents.map(c => c.id === id ? updated : c));
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const handleRequestExport = async () => {
    try {
      const newExport = await privacyApi.requestDataExport();
      setExports([newExport, ...exports]);
    } catch (error) {
      console.error('Failed to request export:', error);
    }
  };

  const handleDisconnectApp = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this app?')) return;
    try {
      await privacyApi.disconnectApp(id);
      setApps(apps.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to disconnect app:', error);
    }
  };

  const handleDeleteAccount = async (reason?: string) => {
    try {
      await privacyApi.requestAccountDeletion(reason);
      // Redirect to logout or confirmation page
      window.location.href = '/account-deleted';
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Settings</h1>
        <p className="text-gray-500 mt-1">Control your privacy and data</p>
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        <VisibilitySection settings={settings} onUpdate={handleUpdateSettings} />
        <DiscoverySection settings={settings} onUpdate={handleUpdateSettings} />
        <CommunicationSection settings={settings} onUpdate={handleUpdateSettings} />
        <ConsentsSection consents={consents} onUpdate={handleUpdateConsent} />
        <DataExportSection exports={exports} onRequestExport={handleRequestExport} />
        <ConnectedAppsSection apps={apps} onDisconnect={handleDisconnectApp} />
        <DeleteAccountSection onDelete={handleDeleteAccount} />
      </div>
    </div>
  );
}

export default PrivacySettingsPage;
