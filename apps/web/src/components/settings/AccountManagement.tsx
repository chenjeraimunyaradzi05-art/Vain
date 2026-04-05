'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * AccountManagement - Account settings and security
 * 
 * Features:
 * - Profile information management
 * - Password and security settings
 * - Two-factor authentication
 * - Session management
 * - Account linking
 */

interface AccountInfo {
  id: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
  accountType: 'candidate' | 'employer' | 'admin';
  subscription?: {
    plan: string;
    status: 'active' | 'cancelled' | 'expired';
    expiresAt?: string;
  };
}

interface SecuritySettings {
  passwordLastChanged: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'app' | 'sms' | 'email';
  loginNotifications: boolean;
  trustedDevices: number;
  activeSessions: number;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LinkedAccount {
  id: string;
  provider: 'google' | 'linkedin' | 'microsoft' | 'apple';
  email: string;
  connectedAt: string;
}

// API functions
const accountApi = {
  async getAccountInfo(): Promise<AccountInfo> {
    const res = await fetch('/api/account', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch account');
    return res.json();
  },

  async updateAccountInfo(data: Partial<AccountInfo>): Promise<AccountInfo> {
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update account');
    return res.json();
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/account/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload avatar');
    return res.json();
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    const res = await fetch('/api/account/security', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch security settings');
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) throw new Error('Failed to change password');
  },

  async enableTwoFactor(method: 'app' | 'sms' | 'email'): Promise<{ qrCode?: string; secret?: string }> {
    const res = await fetch('/api/account/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ method }),
    });
    if (!res.ok) throw new Error('Failed to enable 2FA');
    return res.json();
  },

  async verifyTwoFactor(code: string): Promise<void> {
    const res = await fetch('/api/account/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error('Failed to verify 2FA');
  },

  async disableTwoFactor(password: string): Promise<void> {
    const res = await fetch('/api/account/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('Failed to disable 2FA');
  },

  async getSessions(): Promise<{ sessions: Session[] }> {
    const res = await fetch('/api/account/sessions', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async revokeSession(id: string): Promise<void> {
    const res = await fetch(`/api/account/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to revoke session');
  },

  async revokeAllSessions(): Promise<void> {
    const res = await fetch('/api/account/sessions', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to revoke sessions');
  },

  async getLinkedAccounts(): Promise<{ accounts: LinkedAccount[] }> {
    const res = await fetch('/api/account/linked', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch linked accounts');
    return res.json();
  },

  async unlinkAccount(id: string): Promise<void> {
    const res = await fetch(`/api/account/linked/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unlink account');
  },

  async verifyEmail(): Promise<void> {
    const res = await fetch('/api/account/verify-email', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to send verification');
  },

  async verifyPhone(phone: string): Promise<void> {
    const res = await fetch('/api/account/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error('Failed to send verification');
  },
};

// Profile Section
function ProfileSection({
  account,
  onUpdate,
  onUploadAvatar,
}: {
  account: AccountInfo;
  onUpdate: (data: Partial<AccountInfo>) => void;
  onUploadAvatar: (file: File) => void;
}) {
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [username, setUsername] = useState(account.username || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate({ firstName, lastName, username });
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadAvatar(file);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>

      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            {account.avatarUrl ? (
              <OptimizedImage src={toCloudinaryAutoUrl(account.avatarUrl)} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                {account.firstName.charAt(0)}{account.lastName.charAt(0)}
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-1.5 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{account.firstName} {account.lastName}</p>
              </div>
              {account.username && (
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="font-medium text-gray-900 dark:text-white">@{account.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{account.accountType}</p>
              </div>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Contact Info Section
function ContactSection({
  account,
  onVerifyEmail,
  onVerifyPhone,
}: {
  account: AccountInfo;
  onVerifyEmail: () => void;
  onVerifyPhone: (phone: string) => void;
}) {
  const [phone, setPhone] = useState(account.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>

      <div className="space-y-4">
        {/* Email */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Email Address</p>
            <p className="font-medium text-gray-900 dark:text-white">{account.email}</p>
          </div>
          {account.emailVerified ? (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verified
            </span>
          ) : (
            <Button onClick={onVerifyEmail} size="sm">Verify</Button>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Phone Number</p>
            {isEditingPhone ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+61 400 000 000"
                  className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <Button size="sm" onClick={() => {
                  onVerifyPhone(phone);
                  setIsEditingPhone(false);
                }}>Save</Button>
              </div>
            ) : (
              <p className="font-medium text-gray-900 dark:text-white">
                {account.phone || 'Not set'}
              </p>
            )}
          </div>
          {!isEditingPhone && (
            account.phone ? (
              account.phoneVerified ? (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified
                </span>
              ) : (
                <Button onClick={() => onVerifyPhone(account.phone!)} size="sm">Verify</Button>
              )
            ) : (
              <Button onClick={() => setIsEditingPhone(true)} size="sm" variant="outline">Add</Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Password Section
function PasswordSection({
  security,
  onChangePassword,
}: {
  security: SecuritySettings;
  onChangePassword: (current: string, newPass: string) => Promise<void>;
}) {
  const [isChanging, setIsChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onChangePassword(currentPassword, newPassword);
      setIsChanging(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Password</h3>

      {isChanging ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
            <Button variant="outline" onClick={() => setIsChanging(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Last changed</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(security.passwordLastChanged).toLocaleDateString('en-AU')}
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsChanging(true)}>Change Password</Button>
        </div>
      )}
    </div>
  );
}

// Two-Factor Section
function TwoFactorSection({
  security,
  onEnable,
  onDisable,
}: {
  security: SecuritySettings;
  onEnable: (method: 'app' | 'sms' | 'email') => Promise<{ qrCode?: string }>;
  onDisable: (password: string) => Promise<void>;
}) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'app' | 'sms' | 'email'>('app');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const handleEnable = async () => {
    try {
      const result = await onEnable(selectedMethod);
      if (result.qrCode) setQrCode(result.qrCode);
      setIsEnabling(false);
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
    }
  };

  const handleDisable = async () => {
    try {
      await onDisable(password);
      setIsDisabling(false);
      setPassword('');
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500">Add an extra layer of security</p>
        </div>
        {security.twoFactorEnabled ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Enabled</span>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Disabled</span>
        )}
      </div>

      {security.twoFactorEnabled ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Two-factor authentication is enabled using {security.twoFactorMethod === 'app' ? 'an authenticator app' : security.twoFactorMethod}.
          </p>
          {isDisabling ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter your password to disable 2FA
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDisable} className="bg-red-600 hover:bg-red-700">Disable 2FA</Button>
                <Button variant="outline" onClick={() => setIsDisabling(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsDisabling(true)}>Disable 2FA</Button>
          )}
        </div>
      ) : (
        <div>
          {isEnabling ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select method
                </label>
                <div className="flex gap-2">
                  {(['app', 'sms', 'email'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedMethod(method)}
                      className={`px-4 py-2 rounded-lg capitalize ${
                        selectedMethod === method
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      {method === 'app' ? 'Authenticator App' : method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEnable}>Continue</Button>
                <Button variant="outline" onClick={() => setIsEnabling(false)}>Cancel</Button>
              </div>
            </div>
          ) : qrCode ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with your authenticator app:
              </p>
              <div className="p-4 bg-white rounded-lg inline-block">
                <OptimizedImage src={toCloudinaryAutoUrl(qrCode)} alt="2FA QR Code" width={192} height={192} className="w-48 h-48" />
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsEnabling(true)}>Enable 2FA</Button>
          )}
        </div>
      )}
    </div>
  );
}

// Sessions Section
function SessionsSection({
  sessions,
  onRevoke,
  onRevokeAll,
}: {
  sessions: Session[];
  onRevoke: (id: string) => void;
  onRevokeAll: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
          <p className="text-sm text-gray-500">{sessions.length} active session(s)</p>
        </div>
        <Button variant="outline" onClick={onRevokeAll}>Sign Out All</Button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {session.device.toLowerCase().includes('mobile') ? '📱' : '💻'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">{session.device}</p>
                  {session.isCurrent && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {session.browser} • {session.location}
                </p>
                <p className="text-xs text-gray-400">
                  Last active: {new Date(session.lastActive).toLocaleString('en-AU')}
                </p>
              </div>
            </div>
            {!session.isCurrent && (
              <button
                onClick={() => onRevoke(session.id)}
                className="text-red-600 hover:underline text-sm"
              >
                Sign Out
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Linked Accounts Section
function LinkedAccountsSection({
  accounts,
  onUnlink,
}: {
  accounts: LinkedAccount[];
  onUnlink: (id: string) => void;
}) {
  const providerConfig = {
    google: { name: 'Google', icon: '🔵', color: 'bg-red-100' },
    linkedin: { name: 'LinkedIn', icon: '🔷', color: 'bg-blue-100' },
    microsoft: { name: 'Microsoft', icon: '🟦', color: 'bg-blue-100' },
    apple: { name: 'Apple', icon: '🍎', color: 'bg-gray-100' },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Linked Accounts</h3>

      {accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const provider = providerConfig[account.provider];
            return (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{provider.name}</p>
                    <p className="text-sm text-gray-500">{account.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => onUnlink(account.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Unlink
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No linked accounts</p>
      )}
    </div>
  );
}

// Main Component
export function AccountManagement() {
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountRes, securityRes, sessionsRes, linkedRes] = await Promise.all([
        accountApi.getAccountInfo(),
        accountApi.getSecuritySettings(),
        accountApi.getSessions(),
        accountApi.getLinkedAccounts(),
      ]);
      setAccount(accountRes);
      setSecurity(securityRes);
      setSessions(sessionsRes.sessions);
      setLinkedAccounts(linkedRes.accounts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading || !account || !security) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and security</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <ProfileSection
          account={account}
          onUpdate={async (data) => {
            const updated = await accountApi.updateAccountInfo(data);
            setAccount(updated);
          }}
          onUploadAvatar={async (file) => {
            const { avatarUrl } = await accountApi.uploadAvatar(file);
            setAccount({ ...account, avatarUrl });
          }}
        />

        <ContactSection
          account={account}
          onVerifyEmail={() => accountApi.verifyEmail()}
          onVerifyPhone={(phone) => accountApi.verifyPhone(phone)}
        />

        <PasswordSection
          security={security}
          onChangePassword={accountApi.changePassword}
        />

        <TwoFactorSection
          security={security}
          onEnable={accountApi.enableTwoFactor}
          onDisable={accountApi.disableTwoFactor}
        />

        <SessionsSection
          sessions={sessions}
          onRevoke={async (id) => {
            await accountApi.revokeSession(id);
            setSessions(sessions.filter(s => s.id !== id));
          }}
          onRevokeAll={async () => {
            await accountApi.revokeAllSessions();
            setSessions(sessions.filter(s => s.isCurrent));
          }}
        />

        <LinkedAccountsSection
          accounts={linkedAccounts}
          onUnlink={async (id) => {
            await accountApi.unlinkAccount(id);
            setLinkedAccounts(linkedAccounts.filter(a => a.id !== id));
          }}
        />
      </div>
    </div>
  );
}

export default AccountManagement;
