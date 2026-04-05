'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Mail, 
  Briefcase, 
  Users, 
  Calendar, 
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Trash2,
  Shield
} from 'lucide-react';

const API_URL = API_BASE;

export default function NotificationSettingsPage() {
  const { token, user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [prefsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/notifications/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setPreferences(data.preferences);
      } else {
        // Default preferences if none exist
        setPreferences({
          pushEnabled: true,
          emailEnabled: true,
          jobAlerts: true,
          applicationUpdates: true,
          mentorshipAlerts: true,
          sessionReminders: true,
          messageNotifications: true,
          communityActivity: false,
          marketingEmails: false,
        });
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setDevices(data.devices || []);
        setPushRegistered(data.devices?.length > 0);
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'Preferences saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  }

  async function enablePushNotifications() {
    if (!pushSupported) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage({ type: 'error', text: 'Push notifications permission denied' });
        return;
      }

      // Get FCM token (in a real app, this would use Firebase SDK)
      // For demo, we'll show a success state
      setMessage({ type: 'info', text: 'Push notifications enabled for this device' });
      setPushRegistered(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to enable push notifications' });
    }
  }

  async function removeDevice(deviceId) {
    try {
      await fetch(`${API_URL}/notifications/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      setDevices(devices.filter(d => d.deviceId !== deviceId));
      setMessage({ type: 'success', text: 'Device removed' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove device' });
    }
  }

  function togglePreference(key) {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-800 rounded" />
            <div className="h-64 bg-slate-800 rounded-xl" />
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
              <Bell className="w-6 h-6 text-blue-400" />
              Notification Settings
            </h1>
            <p className="text-slate-400">Manage how you receive updates</p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-900/30 border border-green-800 text-green-300' :
            message.type === 'error' ? 'bg-red-900/30 border border-red-800 text-red-300' :
            'bg-blue-900/30 border border-blue-800 text-blue-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             <AlertCircle className="w-5 h-5" />}
            {message.text}
            <button 
              onClick={() => setMessage(null)}
              className="ml-auto text-current opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Push Notification Status */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-400" />
              Push Notifications
            </h2>
            {pushRegistered ? (
              <span className="px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full">
                Enabled
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-700 text-slate-400 text-sm rounded-full">
                Disabled
              </span>
            )}
          </div>

          {!pushSupported ? (
            <div className="p-4 bg-slate-700/50 rounded-lg text-slate-400">
              <p>Push notifications are not supported in this browser.</p>
            </div>
          ) : !pushRegistered ? (
            <div className="space-y-4">
              <p className="text-slate-400">
                Enable push notifications to receive real-time updates about your job applications, 
                mentorship sessions, and messages.
              </p>
              <button
                onClick={enablePushNotifications}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium inline-flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Enable Push Notifications
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400">
                Push notifications are enabled. You'll receive real-time updates on your devices.
              </p>
              
              {devices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-300">Registered Devices</h4>
                  {devices.map((device) => (
                    <div 
                      key={device.deviceId}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {device.platform || 'Unknown'} Device
                          </div>
                          <div className="text-xs text-slate-500">
                            Added {new Date(device.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDevice(device.deviceId)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"
                        title="Remove device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          
          <div className="space-y-1">
            {/* Master Toggles */}
            <div className="border-b border-slate-700 pb-4 mb-4">
              <PreferenceToggle
                icon={<Bell className="w-5 h-5 text-blue-400" />}
                title="Push Notifications"
                description="Receive push notifications on your devices"
                enabled={preferences?.pushEnabled}
                onChange={() => togglePreference('pushEnabled')}
              />
              <PreferenceToggle
                icon={<Mail className="w-5 h-5 text-green-400" />}
                title="Email Notifications"
                description="Receive notifications via email"
                enabled={preferences?.emailEnabled}
                onChange={() => togglePreference('emailEnabled')}
              />
            </div>

            {/* Category Toggles */}
            <h4 className="text-sm font-medium text-slate-400 mb-3">Notification Categories</h4>
            
            <PreferenceToggle
              icon={<Briefcase className="w-5 h-5 text-yellow-400" />}
              title="Job Alerts"
              description="New job matches and recommendations"
              enabled={preferences?.jobAlerts}
              onChange={() => togglePreference('jobAlerts')}
            />
            <PreferenceToggle
              icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
              title="Application Updates"
              description="Status changes on your applications"
              enabled={preferences?.applicationUpdates}
              onChange={() => togglePreference('applicationUpdates')}
            />
            <PreferenceToggle
              icon={<Users className="w-5 h-5 text-purple-400" />}
              title="Mentorship Alerts"
              description="New mentor matches and requests"
              enabled={preferences?.mentorshipAlerts}
              onChange={() => togglePreference('mentorshipAlerts')}
            />
            <PreferenceToggle
              icon={<Calendar className="w-5 h-5 text-blue-400" />}
              title="Session Reminders"
              description="Upcoming mentorship session reminders"
              enabled={preferences?.sessionReminders}
              onChange={() => togglePreference('sessionReminders')}
            />
            <PreferenceToggle
              icon={<MessageSquare className="w-5 h-5 text-cyan-400" />}
              title="Message Notifications"
              description="New messages from mentors and companies"
              enabled={preferences?.messageNotifications}
              onChange={() => togglePreference('messageNotifications')}
            />
            <PreferenceToggle
              icon={<Users className="w-5 h-5 text-orange-400" />}
              title="Community Activity"
              description="Comments, likes, and replies on your posts"
              enabled={preferences?.communityActivity}
              onChange={() => togglePreference('communityActivity')}
            />
          </div>
        </div>

        {/* Marketing Preferences */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            Marketing & Promotional
          </h2>
          
          <PreferenceToggle
            icon={<Mail className="w-5 h-5 text-slate-400" />}
            title="Marketing Emails"
            description="Receive promotional content and special offers"
            enabled={preferences?.marketingEmails}
            onChange={() => togglePreference('marketingEmails')}
          />
          
          <p className="text-xs text-slate-500 mt-4">
            We respect your privacy. You can unsubscribe from marketing emails at any time.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={loadData}
            disabled={saving}
            className="px-6 py-3 border border-slate-600 hover:bg-slate-700 rounded-xl font-medium disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({ icon, title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-700/30 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-slate-400">{description}</div>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-slate-600'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
