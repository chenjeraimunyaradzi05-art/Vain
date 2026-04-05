'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { useTheme } from '../ThemeProvider';

/**
 * AppearanceSettings - Theme and display preferences
 * 
 * Features:
 * - Light/Dark/System theme
 * - Font size
 * - Color schemes
 * - Accessibility options
 * - Density settings
 */

interface AppearancePreferences {
  theme: 'light' | 'dark' | 'system' | 'cosmic';
  colorScheme: 'default' | 'earth' | 'ocean' | 'sunset' | 'indigenous';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  density: 'compact' | 'comfortable' | 'spacious';
  reducedMotion: boolean;
  highContrast: boolean;
  sidebarCollapsed: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
  fontFamily: 'system' | 'inter' | 'roboto' | 'open-sans';
}

// API functions
const appearanceApi = {
  async getPreferences(): Promise<AppearancePreferences> {
    const res = await fetch('/api/settings/appearance', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updatePreferences(prefs: Partial<AppearancePreferences>): Promise<void> {
    const res = await fetch('/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
  },

  async resetToDefaults(): Promise<AppearancePreferences> {
    const res = await fetch('/api/settings/appearance/reset', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to reset');
    return res.json();
  },
};

// Theme Option Card
function ThemeCard({
  theme,
  label,
  description,
  selected,
  onSelect,
  preview,
}: {
  theme: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
    >
      <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
        {preview}
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}

// Color Scheme Card
function ColorSchemeCard({
  scheme,
  label,
  colors,
  selected,
  onSelect,
}: {
  scheme: string;
  label: string;
  colors: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
    >
      <div className="flex gap-1 mb-2">
        {colors.map((color, idx) => (
          <div
            key={idx}
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
    </button>
  );
}

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

// Toggle Option
function ToggleOption({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: string;
}) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
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
  );
}

// Select Option
function SelectOption({
  label,
  description,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Theme Preview Components
function LightThemePreview() {
  return (
    <div className="w-full h-full bg-white border border-gray-200 flex">
      <div className="w-1/4 bg-gray-100 h-full" />
      <div className="flex-1 p-2">
        <div className="h-2 bg-gray-200 rounded mb-2" />
        <div className="h-2 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

function DarkThemePreview() {
  return (
    <div className="w-full h-full bg-gray-900 border border-gray-700 flex">
      <div className="w-1/4 bg-gray-800 h-full" />
      <div className="flex-1 p-2">
        <div className="h-2 bg-gray-700 rounded mb-2" />
        <div className="h-2 bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  );
}

function SystemThemePreview() {
  return (
    <div className="w-full h-full flex border border-gray-300">
      <div className="w-1/2 bg-white">
        <div className="w-full h-full flex">
          <div className="w-1/4 bg-gray-100 h-full" />
          <div className="flex-1 p-1">
            <div className="h-1.5 bg-gray-200 rounded mb-1" />
          </div>
        </div>
      </div>
      <div className="w-1/2 bg-gray-900">
        <div className="w-full h-full flex">
          <div className="w-1/4 bg-gray-800 h-full" />
          <div className="flex-1 p-1">
            <div className="h-1.5 bg-gray-700 rounded mb-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CosmicThemePreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex">
      <div className="w-1/4 bg-white/10 h-full" />
      <div className="flex-1 p-2">
        <div className="h-2 bg-white/20 rounded mb-2" />
        <div className="h-2 bg-white/20 rounded w-3/4" />
      </div>
    </div>
  );
}

// Main Component
export function AppearanceSettings() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [preferences, setPreferences] = useState<AppearancePreferences>({
    theme: 'system',
    colorScheme: 'default',
    fontSize: 'medium',
    density: 'comfortable',
    reducedMotion: false,
    highContrast: false,
    sidebarCollapsed: false,
    showAvatars: true,
    animationsEnabled: true,
    fontFamily: 'system',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const prefs = await appearanceApi.getPreferences();
      setPreferences(prefs);
      if (prefs?.theme) {
        setTheme(prefs.theme);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = async <K extends keyof AppearancePreferences>(
    key: K,
    value: AppearancePreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    setIsSaving(true);
    try {
      await appearanceApi.updatePreferences({ [key]: value });
      // Apply theme change immediately
      if (key === 'theme') {
        setTheme(value as AppearancePreferences['theme']);
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all appearance settings to defaults?')) return;
    try {
      const defaults = await appearanceApi.resetToDefaults();
      setPreferences(defaults);
      if (defaults?.theme) {
        setTheme(defaults.theme);
      }
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  const colorSchemes = [
    { scheme: 'default', label: 'Default', colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
    { scheme: 'earth', label: 'Earth', colors: ['#92400E', '#166534', '#B45309', '#78350F'] },
    { scheme: 'ocean', label: 'Ocean', colors: ['#0369A1', '#0891B2', '#0D9488', '#1E40AF'] },
    { scheme: 'sunset', label: 'Sunset', colors: ['#EA580C', '#DC2626', '#DB2777', '#9333EA'] },
    { scheme: 'indigenous', label: 'Indigenous', colors: ['#B91C1C', '#CA8A04', '#1D4ED8', '#000000'] },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appearance</h1>
          <p className="text-gray-500 mt-1">Customize how Ngurra Pathways looks for you</p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>

      {/* Theme Selection */}
      <SettingSection title="Theme" description="Choose how the interface appears">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ThemeCard
            theme="light"
            label="Light"
            description="Bright and clean"
            selected={preferences.theme === 'light'}
            onSelect={() => updatePreference('theme', 'light')}
            preview={<LightThemePreview />}
          />
          <ThemeCard
            theme="dark"
            label="Dark"
            description="Easy on the eyes"
            selected={preferences.theme === 'dark'}
            onSelect={() => updatePreference('theme', 'dark')}
            preview={<DarkThemePreview />}
          />
          <ThemeCard
            theme="system"
            label="System"
            description="Matches your device"
            selected={preferences.theme === 'system'}
            onSelect={() => updatePreference('theme', 'system')}
            preview={<SystemThemePreview />}
          />
          <ThemeCard
            theme="cosmic"
            label="Cosmic"
            description="Inspired by the stars"
            selected={preferences.theme === 'cosmic'}
            onSelect={() => updatePreference('theme', 'cosmic')}
            preview={<CosmicThemePreview />}
          />
        </div>
      </SettingSection>

      {/* Color Scheme */}
      <SettingSection title="Color Scheme" description="Accent colors throughout the app">
        <div className="flex flex-wrap gap-3">
          {colorSchemes.map((cs) => (
            <ColorSchemeCard
              key={cs.scheme}
              scheme={cs.scheme}
              label={cs.label}
              colors={cs.colors}
              selected={preferences.colorScheme === cs.scheme}
              onSelect={() => updatePreference('colorScheme', cs.scheme as AppearancePreferences['colorScheme'])}
            />
          ))}
        </div>
        {preferences.colorScheme === 'indigenous' && (
          <p className="mt-4 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            🎨 The Indigenous color scheme is inspired by traditional Aboriginal and Torres Strait Islander art,
            featuring ochre, red earth, and blue representing sky and water.
          </p>
        )}
      </SettingSection>

      {/* Text & Display */}
      <SettingSection title="Text & Display">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <SelectOption
            icon="🔤"
            label="Font Size"
            description="Adjust text size throughout the app"
            value={preferences.fontSize}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium (Default)' },
              { value: 'large', label: 'Large' },
              { value: 'extra-large', label: 'Extra Large' },
            ]}
            onChange={(v) => updatePreference('fontSize', v as AppearancePreferences['fontSize'])}
          />

          <SelectOption
            icon="📏"
            label="Display Density"
            description="Control spacing between elements"
            value={preferences.density}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable (Default)' },
              { value: 'spacious', label: 'Spacious' },
            ]}
            onChange={(v) => updatePreference('density', v as AppearancePreferences['density'])}
          />

          <SelectOption
            icon="🔠"
            label="Font Family"
            description="Choose your preferred font"
            value={preferences.fontFamily}
            options={[
              { value: 'system', label: 'System Default' },
              { value: 'inter', label: 'Inter' },
              { value: 'roboto', label: 'Roboto' },
              { value: 'open-sans', label: 'Open Sans' },
            ]}
            onChange={(v) => updatePreference('fontFamily', v as AppearancePreferences['fontFamily'])}
          />
        </div>
      </SettingSection>

      {/* Accessibility */}
      <SettingSection title="Accessibility" description="Make the interface easier to use">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <ToggleOption
            icon="🎯"
            label="High Contrast"
            description="Increase color contrast for better visibility"
            checked={preferences.highContrast}
            onChange={(v) => updatePreference('highContrast', v)}
          />

          <ToggleOption
            icon="🐌"
            label="Reduce Motion"
            description="Minimize animations and transitions"
            checked={preferences.reducedMotion}
            onChange={(v) => updatePreference('reducedMotion', v)}
          />

          <ToggleOption
            icon="✨"
            label="Animations"
            description="Enable smooth transitions and effects"
            checked={preferences.animationsEnabled}
            onChange={(v) => updatePreference('animationsEnabled', v)}
          />
        </div>
      </SettingSection>

      {/* Interface Options */}
      <SettingSection title="Interface Options">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <ToggleOption
            icon="📷"
            label="Show Avatars"
            description="Display profile pictures throughout the app"
            checked={preferences.showAvatars}
            onChange={(v) => updatePreference('showAvatars', v)}
          />

          <ToggleOption
            icon="📌"
            label="Collapse Sidebar"
            description="Keep sidebar collapsed by default"
            checked={preferences.sidebarCollapsed}
            onChange={(v) => updatePreference('sidebarCollapsed', v)}
          />
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

export default AppearanceSettings;
