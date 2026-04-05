'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * LanguageRegion - Language, locale and regional settings
 * 
 * Features:
 * - Language selection
 * - Date/time format
 * - Currency preferences
 * - Regional settings
 */

interface LanguageRegionSettings {
  language: string;
  region: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'sunday' | 'monday';
  currency: string;
  numberFormat: string;
  measurementSystem: 'metric' | 'imperial';
  indigenousLanguage?: string;
  translationEnabled: boolean;
  autoDetectLanguage: boolean;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

interface IndigenousLanguage {
  code: string;
  name: string;
  region: string;
}

// Available languages
const LANGUAGES: Language[] = [
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', flag: '🇦🇺' },
  { code: 'en-US', name: 'English (United States)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (United Kingdom)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

// Indigenous Australian languages
const INDIGENOUS_LANGUAGES: IndigenousLanguage[] = [
  { code: 'kml', name: 'Pitjantjatjara', region: 'Central Australia' },
  { code: 'wrh', name: 'Warlpiri', region: 'Northern Territory' },
  { code: 'duj', name: 'Dhuwal', region: 'Arnhem Land' },
  { code: 'wbp', name: 'Warlpiri', region: 'Northern Territory' },
  { code: 'aer', name: 'Arrernte', region: 'Central Australia' },
  { code: 'kdd', name: 'Kriol', region: 'Northern Australia' },
  { code: 'aly', name: 'Alyawarr', region: 'Central Australia' },
  { code: 'wmt', name: 'Walmajarri', region: 'Kimberley' },
  { code: 'tiw', name: 'Tiwi', region: 'Tiwi Islands' },
  { code: 'gup', name: 'Gunwinggu', region: 'Arnhem Land' },
];

const TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: '31/12/2024 (Australian)' },
  { value: 'MM/DD/YYYY', label: '12/31/2024 (US)' },
  { value: 'YYYY-MM-DD', label: '2024-12-31 (ISO)' },
  { value: 'D MMM YYYY', label: '31 Dec 2024' },
  { value: 'MMMM D, YYYY', label: 'December 31, 2024' },
];

const CURRENCIES = [
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

// API functions
const languageApi = {
  async getSettings(): Promise<LanguageRegionSettings> {
    const res = await fetch('/api/settings/language', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<LanguageRegionSettings>): Promise<void> {
    const res = await fetch('/api/settings/language', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
  },
};

// Section Component
function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {children}
    </div>
  );
}

// Language Option
function LanguageOption({
  language,
  selected,
  onSelect,
}: {
  language: Language;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
    >
      <span className="text-2xl">{language.flag}</span>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-white">{language.name}</p>
        <p className="text-sm text-gray-500">{language.nativeName}</p>
      </div>
      {selected && <span className="ml-auto text-blue-500">✓</span>}
    </button>
  );
}

// Select Field
function SelectField({
  label,
  value,
  options,
  onChange,
  description,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium text-gray-900 dark:text-white">{label}</label>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 min-w-[200px]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Toggle Field
function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        <div
          onClick={() => onChange(!checked)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              checked ? 'translate-x-6' : ''
            }`}
          />
        </div>
      </label>
    </div>
  );
}

// Radio Group
function RadioGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <label className="font-medium text-gray-900 dark:text-white mb-3 block">{label}</label>
      <div className="flex gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-4 h-4 text-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Main Component
export function LanguageRegion() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LanguageRegionSettings>({
    language: 'en-AU',
    region: 'AU',
    timezone: 'Australia/Sydney',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'monday',
    currency: 'AUD',
    numberFormat: 'en-AU',
    measurementSystem: 'metric',
    translationEnabled: false,
    autoDetectLanguage: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await languageApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async <K extends keyof LanguageRegionSettings>(
    key: K,
    value: LanguageRegionSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    setIsSaving(true);
    try {
      await languageApi.updateSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLanguage = LANGUAGES.find(l => l.code === settings.language);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Language & Region</h1>
      <p className="text-gray-500 mb-8">Set your language, timezone, and regional preferences</p>

      {/* Language Selection */}
      <SettingSection title="Language" description="Choose your preferred language">
        <div className="mb-4">
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="w-full flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <span className="text-2xl">{selectedLanguage?.flag}</span>
            <div className="text-left flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{selectedLanguage?.name}</p>
              <p className="text-sm text-gray-500">{selectedLanguage?.nativeName}</p>
            </div>
            <span className="text-gray-400">{showLanguages ? '▲' : '▼'}</span>
          </button>
        </div>

        {showLanguages && (
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            {LANGUAGES.map((lang) => (
              <LanguageOption
                key={lang.code}
                language={lang}
                selected={settings.language === lang.code}
                onSelect={() => {
                  updateSetting('language', lang.code);
                  setShowLanguages(false);
                }}
              />
            ))}
          </div>
        )}

        <ToggleField
          label="Auto-detect language"
          description="Automatically use your browser's language preference"
          checked={settings.autoDetectLanguage}
          onChange={(v) => updateSetting('autoDetectLanguage', v)}
        />

        <ToggleField
          label="Enable translation"
          description="Translate user-generated content to your language"
          checked={settings.translationEnabled}
          onChange={(v) => updateSetting('translationEnabled', v)}
        />
      </SettingSection>

      {/* Indigenous Language */}
      <SettingSection
        title="Indigenous Language"
        description="Optionally display content in an Aboriginal or Torres Strait Islander language"
      >
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            🌏 We're working with language keepers to provide content in Indigenous languages.
            This feature is currently in development.
          </p>
        </div>

        <select
          value={settings.indigenousLanguage || ''}
          onChange={(e) => updateSetting('indigenousLanguage', e.target.value || undefined)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
        >
          <option value="">None selected</option>
          {INDIGENOUS_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.region})
            </option>
          ))}
        </select>
      </SettingSection>

      {/* Timezone & Date/Time */}
      <SettingSection title="Date & Time">
        <SelectField
          label="Timezone"
          value={settings.timezone}
          options={TIMEZONES}
          onChange={(v) => updateSetting('timezone', v)}
        />

        <SelectField
          label="Date Format"
          value={settings.dateFormat}
          options={DATE_FORMATS}
          onChange={(v) => updateSetting('dateFormat', v)}
        />

        <RadioGroup
          label="Time Format"
          value={settings.timeFormat}
          options={[
            { value: '12h', label: '12-hour (2:30 PM)' },
            { value: '24h', label: '24-hour (14:30)' },
          ]}
          onChange={(v) => updateSetting('timeFormat', v as '12h' | '24h')}
        />

        <RadioGroup
          label="First Day of Week"
          value={settings.firstDayOfWeek}
          options={[
            { value: 'sunday', label: 'Sunday' },
            { value: 'monday', label: 'Monday' },
          ]}
          onChange={(v) => updateSetting('firstDayOfWeek', v as 'sunday' | 'monday')}
        />
      </SettingSection>

      {/* Regional Preferences */}
      <SettingSection title="Regional Preferences">
        <SelectField
          label="Currency"
          value={settings.currency}
          options={CURRENCIES.map(c => ({
            value: c.code,
            label: `${c.symbol} ${c.code} - ${c.name}`,
          }))}
          onChange={(v) => updateSetting('currency', v)}
        />

        <RadioGroup
          label="Measurement System"
          value={settings.measurementSystem}
          options={[
            { value: 'metric', label: 'Metric (km, kg)' },
            { value: 'imperial', label: 'Imperial (mi, lb)' },
          ]}
          onChange={(v) => updateSetting('measurementSystem', v as 'metric' | 'imperial')}
        />
      </SettingSection>

      {/* Preview */}
      <SettingSection title="Preview">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Current Date</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date().toLocaleDateString(settings.language, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Current Time</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString(settings.language, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: settings.timeFormat === '12h',
              })}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Currency</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Intl.NumberFormat(settings.language, {
                style: 'currency',
                currency: settings.currency,
              }).format(1234.56)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Number</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Intl.NumberFormat(settings.language).format(1234567.89)}
            </p>
          </div>
        </div>
      </SettingSection>

      {/* Save Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </div>
      )}
    </div>
  );
}

export default LanguageRegion;
