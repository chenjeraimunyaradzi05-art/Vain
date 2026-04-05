'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Wellness Check-In Page
 * Provides wellness monitoring and resources for job seekers
 * /member/wellness
 */
export default function WellnessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInData, setCheckInData] = useState({
    mood: 3,
    stressLevel: 3,
    hopefulness: 3,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [resources, setResources] = useState(null);

  useEffect(() => {
    fetchWellnessData();
    fetchResources();
  }, []);

  async function fetchWellnessData() {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        api('/wellness/status'),
        api('/wellness/history'),
      ]);

      if (statusRes.status === 401 || historyRes.status === 401) {
        router.push('/');
        return;
      }

      if (statusRes.ok) {
        const data = statusRes.data;
        setStatus(data?.status);
        setAlerts(data?.alerts || []);
      }

      if (historyRes.ok) {
        const data = historyRes.data;
        setHistory(data?.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch wellness data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchResources() {
    try {
      const res = await api('/wellness/resources');
      if (res.ok) {
        const data = res.data;
        setResources(data?.resources);
      }
    } catch {
      // Use fallback resources
      setResources({
        general: [
          { name: 'Headspace', url: 'https://headspace.org.au', icon: '🧠' },
          { name: 'Beyond Blue', url: 'https://www.beyondblue.org.au', icon: '💙' },
        ],
        indigenous: [
          { name: 'Gayaa Dhuwi', url: 'https://www.gayaadhuwi.org.au', icon: '🌿' },
        ],
        career: [
          { name: 'Mentor Support', url: '/mentorship', internal: true, icon: '👥' },
        ]
      });
    }
  }

  async function submitCheckIn() {
    setSubmitting(true);
    try {
      const res = await api('/wellness/check-in', {
        method: 'POST',
        body: checkInData,
      });

      if (res.ok) {
        setCheckInResult(res.data);
        setShowCheckIn(false);
        fetchWellnessData(); // Refresh
      } else if (res.status === 401) {
        router.push('/');
      }
    } catch (err) {
      console.error('Check-in failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function dismissAlert(alertId) {
    try {
      const res = await api(`/wellness/dismiss/${alertId}`, {
        method: 'POST',
      });

      if (res.status === 401) {
        router.push('/');
        return;
      }

      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  }

  function getEmojiForScore(score) {
    const emojis = ['😔', '😕', '😐', '🙂', '😊'];
    return emojis[score - 1] || '😐';
  }

  function getAlertIcon(type) {
    const icons = {
      RAPID_APPLICATIONS: '⚡',
      HIGH_DAILY_ACTIVITY: '📊',
      NIGHT_USAGE: '🌙',
      LONG_SESSIONS: '⏰',
      ACTIVITY_DECLINE: '📉',
      MULTIPLE_REJECTIONS: '💪'
    };
    return icons[type] || '💡';
  }

  function getSeverityColor(severity) {
    const colors = {
      HIGH: 'bg-red-50 border-red-200 text-red-800',
      MEDIUM: 'bg-amber-50 border-amber-200 text-amber-800',
      LOW: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    return colors[severity] || 'bg-gray-50 border-gray-200';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <span>🌿</span> Wellness Centre
          </h1>
          <p className="text-gray-600 mt-2">
            Your wellbeing matters. Check in with yourself and access support when you need it.
          </p>
        </div>

        {/* Check-in Result */}
        {checkInResult?.recommendation && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-6">
            <h3 className="font-semibold text-teal-800 mb-2">
              {checkInResult.recommendation.type === 'SUPPORT_NEEDED' ? '💙 Support Available' : '💚 You\'re doing well'}
            </h3>
            <p className="text-teal-700">{checkInResult.recommendation.message}</p>
            {checkInResult.recommendation.resources && (
              <div className="mt-4 flex flex-wrap gap-2">
                {checkInResult.recommendation.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target={r.external ? '_blank' : undefined}
                    rel={r.external ? 'noopener noreferrer' : undefined}
                    className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm hover:bg-teal-200"
                  >
                    {r.name} →
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-xl p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAlertIcon(alert.alertType)}</span>
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Check-In Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          {!showCheckIn ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">How are you feeling today?</h2>
              <button
                onClick={() => setShowCheckIn(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Start Check-In
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-center">Quick Check-In</h2>
              
              {/* Mood */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How's your mood? {getEmojiForScore(checkInData.mood)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={checkInData.mood}
                  onChange={(e) => setCheckInData({ ...checkInData, mood: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>Great</span>
                </div>
              </div>

              {/* Stress */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress level? {checkInData.stressLevel <= 2 ? '😌' : checkInData.stressLevel >= 4 ? '😰' : '😐'}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={checkInData.stressLevel}
                  onChange={(e) => setCheckInData({ ...checkInData, stressLevel: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Relaxed</span>
                  <span>Stressed</span>
                </div>
              </div>

              {/* Hopefulness */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How hopeful about your job search? {getEmojiForScore(checkInData.hopefulness)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={checkInData.hopefulness}
                  onChange={(e) => setCheckInData({ ...checkInData, hopefulness: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Discouraged</span>
                  <span>Very hopeful</span>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anything else on your mind? (optional)
                </label>
                <textarea
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows="3"
                  placeholder="Share your thoughts..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckIn(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCheckIn}
                  disabled={submitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Submit Check-In'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        {resources && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* General */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">💙 Mental Health</h3>
              <div className="space-y-3">
                {resources.general?.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="mr-2">{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Indigenous */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">🌿 First Nations Support</h3>
              <div className="space-y-3">
                {resources.indigenous?.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="mr-2">{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Career */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">💼 Career Support</h3>
              <div className="space-y-3">
                {resources.career?.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="mr-2">{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-lg mb-4">Your Check-In History</h3>
            <div className="space-y-3">
              {history.slice(0, 7).map((h, i) => (
                <div key={h.id || i} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="text-2xl">
                    {getEmojiForScore(h.mood)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">
                      Mood: {h.mood}/5 | Stress: {h.stressLevel}/5 | Hope: {h.hopefulness}/5
                    </div>
                    {h.notes && (
                      <div className="text-sm text-gray-500 truncate">{h.notes}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
