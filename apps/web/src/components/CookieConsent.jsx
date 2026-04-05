'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, Check } from 'lucide-react';

const CONSENT_KEY = 'ngurra_cookie_consent';
const CONSENT_VERSION = '1'; // Increment when policy changes

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.version === CONSENT_VERSION) {
          setPreferences(data.preferences);
          localStorage.setItem('analytics_consent', String(Boolean(data.preferences?.analytics)));
          return; // Already consented
        }
      } catch {
        // Invalid stored data, show banner
      }
    }
    // Show banner after a short delay
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (prefs) => {
    const data = {
      version: CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    localStorage.setItem('analytics_consent', String(Boolean(prefs?.analytics)));
    setPreferences(prefs);
    setVisible(false);
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const savePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {!showPreferences ? (
          // Main banner
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-600/20 rounded-lg flex-shrink-0">
                <Cookie className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  We respect your privacy
                </h3>
                <p className="text-sm text-slate-300 mb-4">
                  We use cookies to enhance your experience, analyze site traffic, and 
                  for marketing purposes. By clicking "Accept All", you consent to our 
                  use of cookies. You can manage your preferences or learn more in our{' '}
                  <Link href="/privacy" className="text-blue-400 underline hover:underline">
                    Privacy Policy
                  </Link>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={acceptNecessary}
                    className="text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Necessary Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreferences(true)}
                    className="text-blue-400 hover:text-blue-300 px-4 py-2 text-sm transition-colors"
                  >
                    Manage Preferences
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          // Preferences panel
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Cookie Preferences</h3>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary cookies */}
              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">Necessary</span>
                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                      Always on
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Essential for the website to function. These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Analytics cookies */}
              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-white">Analytics</span>
                  <p className="text-sm text-slate-400 mt-1">
                    Help us understand how you use our site to improve your experience.
                  </p>
                </div>
              </div>

              {/* Marketing cookies */}
              <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-white">Marketing</span>
                  <p className="text-sm text-slate-400 mt-1">
                    Allow us to show you relevant ads and measure ad effectiveness.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="text-slate-300 hover:text-white px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
