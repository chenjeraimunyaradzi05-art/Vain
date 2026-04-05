'use client';

/**
 * Calendar Integration Settings Page
 * 
 * Connect Google Calendar and Outlook for scheduling.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  Unlink,
  Settings,
  Bell,
  Shield,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface CalendarConnection {
  provider: 'google' | 'outlook';
  connected: boolean;
  email?: string;
  lastSynced?: string;
  syncEnabled: boolean;
  calendars?: { id: string; name: string; primary: boolean; selected: boolean }[];
}

interface SchedulingSettings {
  defaultDuration: number;
  bufferTime: number;
  minNotice: number;
  maxAdvance: number;
  timezone: string;
  workingHours: { start: string; end: string };
  workingDays: number[];
}

export default function CalendarSettingsPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  
  const [connections, setConnections] = useState<CalendarConnection[]>([
    { provider: 'google', connected: false, syncEnabled: true, calendars: [] },
    { provider: 'outlook', connected: false, syncEnabled: true, calendars: [] },
  ]);
  
  const [settings, setSettings] = useState<SchedulingSettings>({
    defaultDuration: 30,
    bufferTime: 15,
    minNotice: 60, // 1 hour minimum notice
    maxAdvance: 30, // 30 days max advance booking
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workingHours: { start: '09:00', end: '17:00' },
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await api<{ connections: CalendarConnection[]; settings: SchedulingSettings }>('/calendar/connections');
      if (ok && data) {
        if (data.connections) setConnections(data.connections);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load calendar connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (provider: 'google' | 'outlook') => {
    try {
      const { ok, data } = await api<{ authUrl: string }>(`/calendar/connect/${provider}`, {
        method: 'POST',
      });

      if (ok && data?.authUrl) {
        // Open OAuth window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          const { ok: checkOk, data: checkData } = await api<{ connected: boolean }>(`/calendar/check/${provider}`);
          if (checkOk && checkData?.connected) {
            clearInterval(pollInterval);
            loadConnections();
            showToast({
              type: 'success',
              title: 'Connected',
              message: `${provider === 'google' ? 'Google Calendar' : 'Outlook'} connected successfully`,
            });
          }
        }, 2000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to initiate connection',
      });
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    try {
      const { ok } = await api(`/calendar/disconnect/${provider}`, {
        method: 'POST',
      });

      if (ok) {
        setConnections(prev => prev.map(c => 
          c.provider === provider ? { ...c, connected: false, email: undefined, calendars: [] } : c
        ));
        showToast({
          type: 'success',
          title: 'Disconnected',
          message: `${provider === 'google' ? 'Google Calendar' : 'Outlook'} disconnected`,
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to disconnect',
      });
    }
  };

  const handleSync = async (provider: 'google' | 'outlook') => {
    setSyncing(provider);
    try {
      await api(`/calendar/sync/${provider}`, { method: 'POST' });
      showToast({
        type: 'success',
        title: 'Synced',
        message: 'Calendar synced successfully',
      });
      loadConnections();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Sync failed',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { ok } = await api('/calendar/settings', {
        method: 'PUT',
        body: settings,
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Saved',
          message: 'Settings saved successfully',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCalendar = (provider: 'google' | 'outlook', calendarId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.provider !== provider) return c;
      return {
        ...c,
        calendars: c.calendars?.map(cal => 
          cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
        ),
      };
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-400 hover:text-white mr-4"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-400" />
              Calendar Integration
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Calendar Connections */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Connected Calendars
          </h2>

          {isLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Calendar */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-6 h-6">
                        <path fill="#4285F4" d="M22.5 12.5c0-1.58-.13-2.95-.37-4.29H12v7.49h5.86a5.54 5.54 0 01-2.36 3.61v3h3.8c2.24-2.06 3.2-5.1 3.2-9.81z" />
                        <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.8-3c-1.08.72-2.45 1.16-4.13 1.16-3.18 0-5.88-2.15-6.84-5.04H1.22v3.09C3.19 20.53 7.26 23 12 23z" />
                        <path fill="#FBBC05" d="M5.16 13.21A6.94 6.94 0 014.8 11c0-.77.14-1.51.36-2.21V5.7H1.22A11.93 11.93 0 000 11c0 1.92.46 3.74 1.22 5.3l3.94-3.09z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.26 0 3.19 2.47 1.22 5.7l3.94 3.09c.96-2.89 3.66-5.04 6.84-5.04z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">Google Calendar</p>
                      {connections.find(c => c.provider === 'google')?.connected && (
                        <p className="text-sm text-slate-400">
                          {connections.find(c => c.provider === 'google')?.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connections.find(c => c.provider === 'google')?.connected ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <button
                          onClick={() => handleSync('google')}
                          className="p-2 text-slate-400 hover:text-white"
                          disabled={syncing === 'google'}
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === 'google' ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDisconnect('google')}
                          className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                          <Unlink className="w-4 h-4" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect('google')}
                        className="px-4 py-2 bg-white text-gray-800 hover:bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Calendar List */}
                {connections.find(c => c.provider === 'google')?.calendars?.length ? (
                  <div className="border-t border-slate-600 pt-3 mt-3">
                    <p className="text-sm text-slate-400 mb-2">Select calendars to check availability:</p>
                    <div className="space-y-2">
                      {connections.find(c => c.provider === 'google')?.calendars?.map(cal => (
                        <label key={cal.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cal.selected}
                            onChange={() => toggleCalendar('google', cal.id)}
                            className="rounded border-slate-600 bg-slate-700 text-purple-600"
                          />
                          <span className="text-slate-300">{cal.name}</span>
                          {cal.primary && <span className="text-xs text-purple-400">(Primary)</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Outlook Calendar */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0078D4] rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                        <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.01V2.55q0-.44.3-.75.3-.3.75-.3h14.48q.46 0 .8.33.32.33.32.8V12zM7.88 19.7q.91 0 1.56-.49.66-.49.97-1.39.32-.89.32-2.1 0-1.2-.32-2.08-.3-.89-.95-1.37-.64-.48-1.55-.48-.9 0-1.55.49-.65.49-.96 1.38-.3.89-.3 2.09 0 1.2.3 2.08.3.89.96 1.38.65.49 1.55.49zM24 12V2.38q0-.06-.06-.06h-14.4q-.06 0-.06.06V6h4.35q.45 0 .78.33.33.33.33.79v9.82q0 .47-.33.8-.32.33-.78.33h-5.8v3.76q0 .07.06.07h15.85q.06 0 .06-.07V12z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">Microsoft Outlook</p>
                      {connections.find(c => c.provider === 'outlook')?.connected && (
                        <p className="text-sm text-slate-400">
                          {connections.find(c => c.provider === 'outlook')?.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connections.find(c => c.provider === 'outlook')?.connected ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <button
                          onClick={() => handleSync('outlook')}
                          className="p-2 text-slate-400 hover:text-white"
                          disabled={syncing === 'outlook'}
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === 'outlook' ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDisconnect('outlook')}
                          className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                          <Unlink className="w-4 h-4" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect('outlook')}
                        className="px-4 py-2 bg-[#0078D4] hover:bg-[#006CBC] text-white rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Scheduling Settings */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scheduling Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Meeting Duration
              </label>
              <select
                value={settings.defaultDuration}
                onChange={(e) => setSettings({ ...settings, defaultDuration: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Buffer Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Buffer Between Meetings
              </label>
              <select
                value={settings.bufferTime}
                onChange={(e) => setSettings({ ...settings, bufferTime: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            {/* Min Notice */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Minimum Booking Notice
              </label>
              <select
                value={settings.minNotice}
                onChange={(e) => setSettings({ ...settings, minNotice: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value={0}>No minimum</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
                <option value={1440}>24 hours</option>
                <option value={2880}>48 hours</option>
              </select>
            </div>

            {/* Max Advance */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Maximum Advance Booking
              </label>
              <select
                value={settings.maxAdvance}
                onChange={(e) => setSettings({ ...settings, maxAdvance: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
            </div>

            {/* Working Hours */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Working Hours
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.workingHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      workingHours: { ...settings.workingHours, start: e.target.value },
                    })}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={settings.workingHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      workingHours: { ...settings.workingHours, end: e.target.value },
                    })}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => {
                      const newDays = settings.workingDays.includes(index)
                        ? settings.workingDays.filter(d => d !== index)
                        : [...settings.workingDays, index].sort();
                      setSettings({ ...settings, workingDays: newDays });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.workingDays.includes(index)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </section>

        {/* Privacy Note */}
        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-300 font-medium">Privacy & Security</p>
              <p className="text-sm text-slate-400 mt-1">
                Your calendar data is only used to determine availability. Event details are never shared.
                You can disconnect at any time.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
