'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  Clock,
  CheckCircle2,
  Languages
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en-AU', label: 'English (Australia)', native: 'English' },
  { code: 'en-US', label: 'English (US)', native: 'English' },
  { code: 'en-GB', label: 'English (UK)', native: 'English' },
];

const TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', offset: 'UTC+10' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', offset: 'UTC+8' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)', offset: 'UTC+9:30/+10:30' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', offset: 'UTC+9:30' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: 'UTC+12/+13' },
];

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY', example: '29/12/2025' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY', example: '12/29/2025' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD', example: '2025-12-29' },
];

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState('en-AU');
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedLanguage = localStorage.getItem('language') || 'en-AU';
    const savedTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney';
    const savedDateFormat = localStorage.getItem('dateFormat') || 'dd/MM/yyyy';

    setLanguage(savedLanguage);
    setTimezone(savedTimezone);
    setDateFormat(savedDateFormat);
  }, []);

  function savePreferences() {
    localStorage.setItem('language', language);
    localStorage.setItem('timezone', timezone);
    localStorage.setItem('dateFormat', dateFormat);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
              <Globe className="w-6 h-6 text-indigo-400" />
              Language & Region
            </h1>
            <p className="text-slate-400">Set your language, timezone, and date format</p>
          </div>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="bg-green-900/30 border border-green-800 text-green-300 p-4 rounded-xl mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            Preferences saved successfully
          </div>
        )}

        {/* Language */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Languages className="w-5 h-5 text-blue-400" />
            Language
          </h2>
          
          <div className="space-y-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                  language === lang.code
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div>
                  <div className="font-medium">{lang.label}</div>
                  <div className="text-sm text-slate-400">{lang.native}</div>
                </div>
                {language === lang.code && (
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                )}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Additional languages coming soon, including Aboriginal language interfaces.
          </p>
        </div>

        {/* Timezone */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Timezone
          </h2>
          
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} ({tz.offset})
              </option>
            ))}
          </select>

          <p className="mt-4 text-sm text-slate-500">
            This affects how dates and times are displayed throughout the platform.
          </p>
        </div>

        {/* Date Format */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Date Format</h2>
          
          <div className="space-y-2">
            {DATE_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => setDateFormat(format.value)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                  dateFormat === format.value
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-slate-400">{format.label}</span>
                  <span className="text-slate-300">{format.example}</span>
                </div>
                {dateFormat === format.value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={savePreferences}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
