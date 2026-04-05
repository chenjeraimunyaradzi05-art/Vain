'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { 
  ArrowLeft, 
  Shield, 
  Download, 
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Lock
} from 'lucide-react';

const API_URL = API_BASE;

export default function PrivacySettingsPage() {
  const { token, user } = useAuth();
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (token) loadConsent();
  }, [token]);

  async function loadConsent() {
    try {
      const res = await fetch(`${API_URL}/data-sovereignty/consent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsent(data.consent);
      }
    } catch (err) {
      console.error('Failed to load consent:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateConsent(field, value) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/data-sovereignty/consent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        setConsent(prev => ({ ...prev, [field]: value }));
        setMessage({ type: 'success', text: 'Privacy preferences updated' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    } finally {
      setActionLoading(false);
    }
  }

  async function requestDataExport() {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/data-sovereignty/export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Data exported successfully' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteAccount() {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/data-sovereignty/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Redirect to home after deletion
        window.location.href = '/';
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-800 rounded" />
            <div className="h-64 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

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
              <Shield className="w-6 h-6 text-purple-400" />
              Privacy & Data
            </h1>
            <p className="text-slate-400">Manage your data and privacy preferences</p>
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
            <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
          </div>
        )}

        {/* Data Sovereignty Notice */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Indigenous Data Sovereignty</h3>
              <p className="text-sm text-slate-300">
                We respect Indigenous data sovereignty principles. Your data belongs to you, 
                and you have full control over how it's used and shared. We collect only 
                what's necessary and never share your information without consent.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Preferences */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Privacy Preferences</h2>
          
          <div className="space-y-4">
            <PrivacyToggle
              icon={<Eye className="w-5 h-5" />}
              title="Profile Visibility"
              description="Allow employers to view your profile in search results"
              enabled={consent?.profileVisible !== false}
              onChange={(v) => updateConsent('profileVisible', v)}
              disabled={actionLoading}
            />
            <PrivacyToggle
              icon={<FileText className="w-5 h-5" />}
              title="Analytics Participation"
              description="Help us improve by sharing anonymized usage data"
              enabled={consent?.analyticsConsent ?? true}
              onChange={(v) => updateConsent('analyticsConsent', v)}
              disabled={actionLoading}
            />
            <PrivacyToggle
              icon={<Shield className="w-5 h-5" />}
              title="Research & Impact Studies"
              description="Allow use of anonymized data in impact research"
              enabled={consent?.researchConsent ?? false}
              onChange={(v) => updateConsent('researchConsent', v)}
              disabled={actionLoading}
            />
          </div>
        </div>

        {/* Your Data */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Data</h2>
          
          <div className="space-y-4">
            <button
              onClick={requestDataExport}
              disabled={actionLoading}
              className="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="font-medium">Download My Data</div>
                  <div className="text-sm text-slate-400">
                    Get a copy of all your personal data
                  </div>
                </div>
              </div>
              {actionLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <span className="text-blue-400">Export</span>
              )}
            </button>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 rounded-lg transition-colors text-red-400"
              >
                <Trash2 className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Delete Account</div>
                  <div className="text-sm opacity-75">
                    Permanently delete your account and all data
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold">Delete Account?</h3>
              </div>
              <p className="text-slate-300 mb-6">
                This action cannot be undone. All your data, applications, 
                messages, and profile information will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivacyToggle({ icon, title, description, enabled, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-700/30 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-slate-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-purple-600' : 'bg-slate-600'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
