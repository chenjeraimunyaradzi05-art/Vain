'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import SessionManager from '@/components/SessionManager';
import TwoFactorAuth from '@/components/TwoFactorAuth';
import { 
  ArrowLeft, 
  Key, 
  Shield, 
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Monitor,
  Lock,
  Download,
  Trash2,
  FileText,
  Database
} from 'lucide-react';

const API_URL = API_BASE;

const strengthBarClasses = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
};

const strengthTextClasses = {
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  emerald: 'text-emerald-400',
};

export default function SecuritySettingsPage() {
  const { token, user, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // GDPR states
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1A0F2E 0%, #2D1B69 50%, #3D1A2A 100%)' }}>
        <div className="text-center p-8 rounded-3xl max-w-md w-full" style={{ background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.95), rgba(26, 15, 46, 0.9))', border: '2px solid rgba(255, 215, 0, 0.4)' }}>
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: '#FFD700' }} />
          <p style={{ color: 'rgba(248, 246, 255, 0.8)' }}>Loading your security settings...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1A0F2E 0%, #2D1B69 50%, #3D1A2A 100%)' }}>
        <div className="text-center p-8 rounded-3xl max-w-md w-full" style={{ background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.95), rgba(26, 15, 46, 0.9))', border: '2px solid rgba(255, 215, 0, 0.4)' }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFD700' }}>Sign in required</h2>
          <p className="mb-6" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
            Sign in to manage your password, 2FA settings, and active sessions.
          </p>
          <Link
            href="/signin?returnTo=/settings/security"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }
  
  // Handle data export request (GDPR)
  async function handleExportData() {
    setExporting(true);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}/security/data-export`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to request data export');
      }
      
      const data = await res.json();
      setMessage({ 
        type: 'success', 
        text: data.message || 'Data export request submitted. You will receive an email when ready.' 
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setExporting(false);
    }
  }
  
  // Handle account deletion request (GDPR)
  async function handleDeleteAccount() {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password to confirm deletion' });
      return;
    }
    
    setDeleting(true);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}/security/delete-account`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      const data = await res.json();
      setMessage({ 
        type: 'success', 
        text: data.message || 'Account scheduled for deletion. You have 30 days to cancel.' 
      });
      setDeleteConfirm(false);
      setDeletePassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  }
  
  // Cancel account deletion
  async function handleCancelDeletion() {
    try {
      const res = await fetch(`${API_URL}/security/cancel-deletion`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel deletion');
      }
      
      setMessage({ type: 'success', text: 'Account deletion cancelled successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Password strength indicator
  function getPasswordStrength() {
    if (!newPassword) return { strength: 0, label: '', color: 'slate' };
    
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (newPassword.length >= 12) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength <= 1) return { strength: 1, label: 'Weak', color: 'red' };
    if (strength <= 2) return { strength: 2, label: 'Fair', color: 'yellow' };
    if (strength <= 3) return { strength: 3, label: 'Good', color: 'blue' };
    if (strength <= 4) return { strength: 4, label: 'Strong', color: 'green' };
    return { strength: 5, label: 'Very Strong', color: 'emerald' };
  }

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/settings" 
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="w-6 h-6 text-amber-400" />
              Password & Security
            </h1>
            <p className="text-slate-400">Manage your password and security settings</p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-900/30 border border-green-800 text-green-300' :
            'bg-red-900/30 border border-red-800 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Change Password */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-400" />
            Change Password
          </h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength.strength
                            ? strengthBarClasses[passwordStrength.color]
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className={`text-xs ${strengthTextClasses[passwordStrength.color]}`}>
                    Password strength: {passwordStrength.label}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-900 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500'
                      : 'border-slate-700'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>

        {/* Security Information */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            Two-Factor Authentication
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Add an extra layer of security to your account
          </p>
          <TwoFactorAuth />
        </div>

        {/* Account Information */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Account Information
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div>
                <div className="text-sm font-medium">Last Password Change</div>
                <div className="text-xs text-slate-400">Track when you last updated your password</div>
              </div>
              <span className="text-sm text-slate-300">
                {user?.passwordChangedAt 
                  ? new Date(user.passwordChangedAt).toLocaleDateString()
                  : 'Never changed'
                }
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div>
                <div className="text-sm font-medium">Account Created</div>
                <div className="text-xs text-slate-400">When your account was created</div>
              </div>
              <span className="text-sm text-slate-300">
                {user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString()
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            Active Sessions
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Manage devices where you&apos;re currently signed in
          </p>
          <SessionManager />
        </div>

        {/* Data Privacy (GDPR) */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-400" />
            Your Data & Privacy
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            You have the right to access, export, and delete your personal data
          </p>
          
          <div className="space-y-4">
            {/* Export Data */}
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Export Your Data</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Download a copy of all your personal data including profile, applications, and activity logs. 
                    You&apos;ll receive an email when your export is ready.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Request Export
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span className="font-medium">Privacy Policy</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Learn how we collect, use, and protect your personal information.
                  </p>
                </div>
                <Link
                  href="/privacy"
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  View Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone - Account Deletion */}
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h2>
          
          {!deleteConfirm ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium mb-1">Delete Your Account</div>
                <p className="text-sm text-slate-400">
                  Permanently delete your account and all associated data. This action cannot be undone 
                  after the 30-day recovery period.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-sm text-red-300 mb-3">
                  <strong>Warning:</strong> Your account will be scheduled for deletion. You have 30 days 
                  to cancel this request. After that, all your data will be permanently removed.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-red-300 mb-1">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Your password"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || !deletePassword}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Confirm Delete
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              
              {user?.scheduledForDeletion && (
                <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-300 mb-2">
                    Your account is scheduled for deletion. You can still cancel this request.
                  </p>
                  <button
                    onClick={handleCancelDeletion}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Cancel Deletion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
