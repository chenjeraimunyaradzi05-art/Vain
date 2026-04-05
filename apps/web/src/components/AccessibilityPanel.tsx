'use client';

/**
 * Accessibility Settings Panel
 * 
 * User-configurable accessibility options including:
 * - Font size adjustments
 * - High contrast mode
 * - Reduced motion
 * - Screen reader optimizations
 * - Focus indicators
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Type,
  MousePointer,
  Zap,
  Volume2,
  Keyboard,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface AccessibilitySettings {
  fontSize: 'small' | 'normal' | 'large' | 'x-large';
  highContrast: boolean;
  reducedMotion: boolean;
  focusIndicators: 'default' | 'enhanced';
  linkUnderlines: boolean;
  cursorSize: 'default' | 'large';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  screenReaderOptimized: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  focusIndicators: 'default',
  linkUnderlines: false,
  cursorSize: 'default',
  lineSpacing: 'normal',
  screenReaderOptimized: false,
};

const FONT_SIZES = {
  small: { label: 'Small', value: '14px', scale: 0.875 },
  normal: { label: 'Normal', value: '16px', scale: 1 },
  large: { label: 'Large', value: '18px', scale: 1.125 },
  'x-large': { label: 'Extra Large', value: '20px', scale: 1.25 },
};

const LINE_SPACING = {
  normal: { label: 'Normal', value: 1.5 },
  relaxed: { label: 'Relaxed', value: 1.75 },
  loose: { label: 'Loose', value: 2 },
};

const STORAGE_KEY = 'ngurra-a11y-settings';

export function AccessibilityPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { showToast } = useUIStore();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.warn('Failed to load accessibility settings');
      }
    }

    // Also check system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      setSettings(prev => ({ ...prev, highContrast: true }));
    }
  }, []);

  // Apply settings to document
  const applySettings = useCallback((newSettings: AccessibilitySettings) => {
    const root = document.documentElement;

    // Font size
    root.style.setProperty('--font-size-base', FONT_SIZES[newSettings.fontSize].value);
    root.style.setProperty('--font-scale', FONT_SIZES[newSettings.fontSize].scale.toString());

    // Line spacing
    root.style.setProperty('--line-height', LINE_SPACING[newSettings.lineSpacing].value.toString());

    // High contrast
    root.classList.toggle('high-contrast', newSettings.highContrast);

    // Reduced motion
    root.classList.toggle('reduce-motion', newSettings.reducedMotion);

    // Focus indicators
    root.classList.toggle('enhanced-focus', newSettings.focusIndicators === 'enhanced');

    // Link underlines
    root.classList.toggle('underline-links', newSettings.linkUnderlines);

    // Cursor size
    root.classList.toggle('large-cursor', newSettings.cursorSize === 'large');

    // Screen reader optimizations
    root.classList.toggle('sr-optimized', newSettings.screenReaderOptimized);
  }, []);

  // Apply and save settings
  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
    applySettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setHasChanges(false);
    showToast({
      type: 'success',
      title: 'Reset',
      message: 'Accessibility settings reset to defaults',
    });
  };

  // Apply saved settings on mount
  useEffect(() => {
    applySettings(settings);
  }, [applySettings, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-labelledby="a11y-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="a11y-title" className="text-lg font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-purple-400" />
            Accessibility Settings
          </h2>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={resetSettings}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                aria-label="Reset settings to defaults"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Close accessibility settings"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Font Size */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Type className="w-4 h-4 text-blue-400" />
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(FONT_SIZES).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => updateSetting('fontSize', key as AccessibilitySettings['fontSize'])}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      settings.fontSize === key
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    aria-pressed={settings.fontSize === key}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Type className="w-4 h-4 text-green-400" />
                Line Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(LINE_SPACING).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => updateSetting('lineSpacing', key as AccessibilitySettings['lineSpacing'])}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      settings.lineSpacing === key
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    aria-pressed={settings.lineSpacing === key}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-3">
              {/* High Contrast */}
              <ToggleOption
                icon={<Eye className="w-4 h-4 text-yellow-400" />}
                label="High Contrast Mode"
                description="Increase color contrast for better visibility"
                checked={settings.highContrast}
                onChange={(v) => updateSetting('highContrast', v)}
              />

              {/* Reduced Motion */}
              <ToggleOption
                icon={<Zap className="w-4 h-4 text-orange-400" />}
                label="Reduce Motion"
                description="Minimize animations and transitions"
                checked={settings.reducedMotion}
                onChange={(v) => updateSetting('reducedMotion', v)}
              />

              {/* Enhanced Focus */}
              <ToggleOption
                icon={<MousePointer className="w-4 h-4 text-cyan-400" />}
                label="Enhanced Focus Indicators"
                description="More visible focus outlines for keyboard navigation"
                checked={settings.focusIndicators === 'enhanced'}
                onChange={(v) => updateSetting('focusIndicators', v ? 'enhanced' : 'default')}
              />

              {/* Link Underlines */}
              <ToggleOption
                icon={<Type className="w-4 h-4 text-blue-400" />}
                label="Underline Links"
                description="Always show underlines on links"
                checked={settings.linkUnderlines}
                onChange={(v) => updateSetting('linkUnderlines', v)}
              />

              {/* Large Cursor */}
              <ToggleOption
                icon={<MousePointer className="w-4 h-4 text-pink-400" />}
                label="Large Cursor"
                description="Increase cursor size for better visibility"
                checked={settings.cursorSize === 'large'}
                onChange={(v) => updateSetting('cursorSize', v ? 'large' : 'default')}
              />

              {/* Screen Reader Optimized */}
              <ToggleOption
                icon={<Volume2 className="w-4 h-4 text-purple-400" />}
                label="Screen Reader Optimizations"
                description="Add additional context for screen readers"
                checked={settings.screenReaderOptimized}
                onChange={(v) => updateSetting('screenReaderOptimized', v)}
              />
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
              <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
                <Keyboard className="w-4 h-4 text-slate-400" />
                Keyboard Shortcuts
              </h3>
              <div className="space-y-2 text-sm">
                <ShortcutRow keys={['Tab']} description="Navigate forward" />
                <ShortcutRow keys={['Shift', 'Tab']} description="Navigate backward" />
                <ShortcutRow keys={['Enter', 'Space']} description="Activate button/link" />
                <ShortcutRow keys={['Esc']} description="Close dialogs" />
                <ShortcutRow keys={['/', 'Ctrl', 'K']} description="Open search" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
      role="switch"
      aria-checked={checked}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-purple-600' : 'bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </div>
    </button>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="px-2 py-1 bg-slate-600 rounded text-xs text-slate-300 font-mono">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-slate-500 mx-1">+</span>}
          </span>
        ))}
      </div>
      <span className="text-slate-400">{description}</span>
    </div>
  );
}

// Hook for accessibility settings
export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        // Ignore: invalid/corrupted JSON in localStorage
      }
    }
  }, []);

  return settings;
}

// Skip to main content link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

// Global accessibility CSS (add to global styles)
export const accessibilityStyles = `
  /* High Contrast Mode */
  .high-contrast {
    --color-text: #FFFFFF;
    --color-bg: #000000;
    --color-primary: #FFFF00;
    --color-border: #FFFFFF;
  }

  .high-contrast .bg-slate-800 { background-color: #000 !important; }
  .high-contrast .bg-slate-700 { background-color: #111 !important; }
  .high-contrast .text-slate-400 { color: #FFF !important; }
  .high-contrast a { color: #FFFF00 !important; }

  /* Reduced Motion */
  .reduce-motion *,
  .reduce-motion *::before,
  .reduce-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Enhanced Focus */
  .enhanced-focus *:focus {
    outline: 3px solid #FFFF00 !important;
    outline-offset: 2px !important;
  }

  .enhanced-focus *:focus:not(:focus-visible) {
    outline: none !important;
  }

  .enhanced-focus *:focus-visible {
    outline: 3px solid #FFFF00 !important;
    outline-offset: 2px !important;
  }

  /* Underline Links */
  .underline-links a:not(.no-underline) {
    text-decoration: underline !important;
  }

  /* Large Cursor */
  .large-cursor,
  .large-cursor * {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='white' stroke='black' stroke-width='1'%3E%3Cpath d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'/%3E%3C/svg%3E"), auto !important;
  }

  /* Screen Reader Optimizations */
  .sr-optimized [aria-hidden="true"]:not(.sr-keep) {
    display: none;
  }
`;
