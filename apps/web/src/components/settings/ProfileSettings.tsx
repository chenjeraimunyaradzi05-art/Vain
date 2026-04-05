'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ProfileSettings - User profile and account settings
 * 
 * Features:
 * - Personal information editing
 * - Profile photo upload
 * - Privacy settings
 * - Notification preferences
 * - Account security
 * - Cultural identity settings
 * - Career preferences
 */

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  location?: string;
  region?: string;
  headline?: string;
  website?: string;
  linkedIn?: string;
  
  // Cultural identity
  indigenousIdentity?: {
    isIndigenous: boolean;
    nation?: string;
    mob?: string;
    connectionToCountry?: string;
    preferToNotSay?: boolean;
  };
  
  // Career
  careerPreferences?: {
    openToWork: boolean;
    workTypes: string[];
    preferredLocations: string[];
    salaryExpectation?: { min: number; max: number };
    industries: string[];
    remotePreference: 'onsite' | 'remote' | 'hybrid' | 'any';
  };
  
  // Privacy
  privacy: {
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    profileVisibility: 'public' | 'connections' | 'private';
    showInSearch: boolean;
    allowMessages: 'everyone' | 'connections' | 'none';
  };
  
  // Notifications
  notifications: {
    email: {
      jobAlerts: boolean;
      messages: boolean;
      mentions: boolean;
      weeklyDigest: boolean;
      marketing: boolean;
    };
    push: {
      messages: boolean;
      jobAlerts: boolean;
      reminders: boolean;
    };
  };
}

// API functions
const profileApi = {
  async getProfile(): Promise<UserProfile> {
    const res = await fetch('/api/users/me', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/users/me/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload avatar');
    return res.json();
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    const res = await fetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to change password');
  },

  async deleteAccount(): Promise<void> {
    const res = await fetch('/api/users/me', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete account');
  },
};

// Australian states/territories and regions
const regions = [
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
];

const workTypes = [
  'Full-time',
  'Part-time',
  'Contract',
  'Casual',
  'Internship/Traineeship',
];

const industries = [
  'Agriculture & Farming',
  'Arts & Culture',
  'Community Services',
  'Construction & Trades',
  'Education & Training',
  'Environment & Conservation',
  'Government & Public Sector',
  'Healthcare & Medical',
  'Hospitality & Tourism',
  'Information Technology',
  'Legal Services',
  'Media & Communications',
  'Mining & Resources',
  'Not-for-Profit',
  'Retail',
  'Transport & Logistics',
];

// Settings Tab Component
function SettingsTab({ 
  active, 
  label, 
  icon, 
  onClick 
}: { 
  active: boolean; 
  label: string; 
  icon: React.ReactNode; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left w-full transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Toggle Switch
function Toggle({ 
  checked, 
  onChange, 
  label,
  description,
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between cursor-pointer py-3">
      <div className="flex-1">
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// Main Component
export function ProfileSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'cultural' | 'career' | 'privacy' | 'notifications' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setErrorMessage('Failed to load profile settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      await profileApi.updateProfile(profile);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrorMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await profileApi.uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, avatar: url } : null);
      setSuccessMessage('Profile photo updated');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setErrorMessage('Failed to upload photo');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    try {
      await profileApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccessMessage('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      setErrorMessage('Failed to change password');
    }
  };

  const updateProfile = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateNestedProfile = (path: string, value: unknown) => {
    setProfile(prev => {
      if (!prev) return null;
      const keys = path.split('.');
      const result = { ...prev };
      let current: Record<string, unknown> = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown> || {}) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      
      return result;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Failed to load profile settings</p>
        <Button className="mt-4" onClick={loadProfile}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 space-y-1">
          <SettingsTab
            active={activeTab === 'profile'}
            label="Profile"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>}
            onClick={() => setActiveTab('profile')}
          />
          <SettingsTab
            active={activeTab === 'cultural'}
            label="Cultural Identity"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
            onClick={() => setActiveTab('cultural')}
          />
          <SettingsTab
            active={activeTab === 'career'}
            label="Career Preferences"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>}
            onClick={() => setActiveTab('career')}
          />
          <SettingsTab
            active={activeTab === 'privacy'}
            label="Privacy"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>}
            onClick={() => setActiveTab('privacy')}
          />
          <SettingsTab
            active={activeTab === 'notifications'}
            label="Notifications"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>}
            onClick={() => setActiveTab('notifications')}
          />
          <SettingsTab
            active={activeTab === 'security'}
            label="Security"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>}
            onClick={() => setActiveTab('security')}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
              
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profile.avatar ? (
                    <OptimizedImage
                      src={toCloudinaryAutoUrl(profile.avatar)}
                      alt={`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Profile avatar'}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-medium">
                      {profile.firstName?.charAt(0) || '?'}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow cursor-pointer hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{profile.firstName} {profile.lastName}</p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={profile.headline || ''}
                  onChange={(e) => updateProfile('headline', e.target.value)}
                  placeholder="e.g., Senior Software Engineer at Tech Corp"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  About Me
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profile.location || ''}
                    onChange={(e) => updateProfile('location', e.target.value)}
                    placeholder="e.g., Sydney, NSW"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={profile.website || ''}
                    onChange={(e) => updateProfile('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={profile.linkedIn || ''}
                    onChange={(e) => updateProfile('linkedIn', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cultural Identity Tab */}
          {activeTab === 'cultural' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cultural Identity</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This information is optional and helps us connect you with culturally appropriate opportunities.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Privacy Note:</strong> Your cultural identity information is treated with the utmost respect and privacy. 
                  You control who can see this information in your privacy settings.
                </p>
              </div>

              <Toggle
                checked={profile.indigenousIdentity?.isIndigenous || false}
                onChange={(checked) => updateNestedProfile('indigenousIdentity.isIndigenous', checked)}
                label="I identify as Aboriginal and/or Torres Strait Islander"
                description="This information helps us provide culturally appropriate services"
              />

              {profile.indigenousIdentity?.isIndigenous && (
                <div className="space-y-4 pl-4 border-l-2 border-amber-300 dark:border-amber-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nation / Language Group
                    </label>
                    <input
                      type="text"
                      value={profile.indigenousIdentity?.nation || ''}
                      onChange={(e) => updateNestedProfile('indigenousIdentity.nation', e.target.value)}
                      placeholder="e.g., Wiradjuri, Yolngu, Noongar"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mob / Community
                    </label>
                    <input
                      type="text"
                      value={profile.indigenousIdentity?.mob || ''}
                      onChange={(e) => updateNestedProfile('indigenousIdentity.mob', e.target.value)}
                      placeholder="Your mob or community (optional)"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Connection to Country
                    </label>
                    <textarea
                      value={profile.indigenousIdentity?.connectionToCountry || ''}
                      onChange={(e) => updateNestedProfile('indigenousIdentity.connectionToCountry', e.target.value)}
                      placeholder="Share your connection to country (optional)"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                </div>
              )}

              <Toggle
                checked={profile.indigenousIdentity?.preferToNotSay || false}
                onChange={(checked) => updateNestedProfile('indigenousIdentity.preferToNotSay', checked)}
                label="I prefer not to say"
                description="We respect your choice to keep this information private"
              />
            </div>
          )}

          {/* Career Preferences Tab */}
          {activeTab === 'career' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Career Preferences</h2>

              <Toggle
                checked={profile.careerPreferences?.openToWork || false}
                onChange={(checked) => updateNestedProfile('careerPreferences.openToWork', checked)}
                label="Open to Work"
                description="Let employers know you're open to new opportunities"
              />

              {/* Work Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Work Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {workTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = profile.careerPreferences?.workTypes || [];
                        const updated = current.includes(type)
                          ? current.filter(t => t !== type)
                          : [...current, type];
                        updateNestedProfile('careerPreferences.workTypes', updated);
                      }}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        profile.careerPreferences?.workTypes?.includes(type)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Location Preference
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'onsite', label: 'On-site', icon: '🏢' },
                    { value: 'remote', label: 'Remote', icon: '🏠' },
                    { value: 'hybrid', label: 'Hybrid', icon: '🔀' },
                    { value: 'any', label: 'Any', icon: '✅' },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateNestedProfile('careerPreferences.remotePreference', value)}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        profile.careerPreferences?.remotePreference === value
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Locations
                </label>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => {
                        const current = profile.careerPreferences?.preferredLocations || [];
                        const updated = current.includes(region)
                          ? current.filter(r => r !== region)
                          : [...current, region];
                        updateNestedProfile('careerPreferences.preferredLocations', updated);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        profile.careerPreferences?.preferredLocations?.includes(region)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Industries
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {industries.map((industry) => (
                    <button
                      key={industry}
                      type="button"
                      onClick={() => {
                        const current = profile.careerPreferences?.industries || [];
                        const updated = current.includes(industry)
                          ? current.filter(i => i !== industry)
                          : [...current, industry];
                        updateNestedProfile('careerPreferences.industries', updated);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        profile.careerPreferences?.industries?.includes(industry)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>

              {/* Profile Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Visibility
                </label>
                <select
                  value={profile.privacy.profileVisibility}
                  onChange={(e) => updateNestedProfile('privacy.profileVisibility', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="public">Public - Anyone can view your profile</option>
                  <option value="connections">Connections Only - Only your connections</option>
                  <option value="private">Private - Only you can view</option>
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <Toggle
                  checked={profile.privacy.showEmail}
                  onChange={(checked) => updateNestedProfile('privacy.showEmail', checked)}
                  label="Show email on profile"
                  description="Allow others to see your email address"
                />
                <Toggle
                  checked={profile.privacy.showPhone}
                  onChange={(checked) => updateNestedProfile('privacy.showPhone', checked)}
                  label="Show phone on profile"
                  description="Allow others to see your phone number"
                />
                <Toggle
                  checked={profile.privacy.showLocation}
                  onChange={(checked) => updateNestedProfile('privacy.showLocation', checked)}
                  label="Show location on profile"
                  description="Display your location to others"
                />
                <Toggle
                  checked={profile.privacy.showInSearch}
                  onChange={(checked) => updateNestedProfile('privacy.showInSearch', checked)}
                  label="Appear in search results"
                  description="Allow employers to find you in candidate searches"
                />
              </div>

              {/* Messaging */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Who can message you
                </label>
                <select
                  value={profile.privacy.allowMessages}
                  onChange={(e) => updateNestedProfile('privacy.allowMessages', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">Connections only</option>
                  <option value="none">No one</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>

              {/* Email Notifications */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Email Notifications</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.email.jobAlerts}
                      onChange={(checked) => updateNestedProfile('notifications.email.jobAlerts', checked)}
                      label="Job Alerts"
                      description="Get notified about new jobs matching your preferences"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.email.messages}
                      onChange={(checked) => updateNestedProfile('notifications.email.messages', checked)}
                      label="Messages"
                      description="Email notifications for new messages"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.email.mentions}
                      onChange={(checked) => updateNestedProfile('notifications.email.mentions', checked)}
                      label="Mentions"
                      description="When someone mentions you in a post or comment"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.email.weeklyDigest}
                      onChange={(checked) => updateNestedProfile('notifications.email.weeklyDigest', checked)}
                      label="Weekly Digest"
                      description="A weekly summary of activity and recommendations"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.email.marketing}
                      onChange={(checked) => updateNestedProfile('notifications.email.marketing', checked)}
                      label="Marketing & Updates"
                      description="News, features, and promotional content"
                    />
                  </div>
                </div>
              </div>

              {/* Push Notifications */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Push Notifications</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.push.messages}
                      onChange={(checked) => updateNestedProfile('notifications.push.messages', checked)}
                      label="Messages"
                      description="Push notifications for new messages"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.push.jobAlerts}
                      onChange={(checked) => updateNestedProfile('notifications.push.jobAlerts', checked)}
                      label="Job Alerts"
                      description="Push notifications for matching jobs"
                    />
                  </div>
                  <div className="p-4">
                    <Toggle
                      checked={profile.notifications.push.reminders}
                      onChange={(checked) => updateNestedProfile('notifications.push.reminders', checked)}
                      label="Reminders"
                      description="Event and deadline reminders"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>

              {/* Change Password */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <Button onClick={handlePasswordChange}>
                    Change Password
                  </Button>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <h3 className="font-medium text-red-700 dark:text-red-400">Delete Account</h3>
                <p className="text-sm text-red-600 dark:text-red-400/80 mt-1 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="outline" 
                  className="border-red-300 text-red-600 hover:bg-red-100"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                      profileApi.deleteAccount();
                    }
                  }}
                >
                  Delete My Account
                </Button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProfileSettings;
