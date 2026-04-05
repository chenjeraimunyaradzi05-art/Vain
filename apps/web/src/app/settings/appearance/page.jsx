'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Monitor,
  Sparkles,
  Type,
  Palette,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../../../components/ThemeProvider';

export default function AppearanceSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [fontSize, setFontSize] = useState('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    // Load saved preferences (font size and accessibility options)
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    const savedReducedMotion = localStorage.getItem('reducedMotion') === 'true';
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';

    setFontSize(savedFontSize);
    setReducedMotion(savedReducedMotion);
    setHighContrast(savedHighContrast);

    // Check system preference for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
  }, []);

  function updateTheme(newTheme) {
    setTheme(newTheme);
  }

  function updateFontSize(newSize) {
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
    
    const root = document.documentElement;
    switch (newSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'medium':
        root.style.fontSize = '16px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'xlarge':
        root.style.fontSize = '20px';
        break;
    }
  }

  function toggleReducedMotion() {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem('reducedMotion', newValue.toString());
    
    if (newValue) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }

  function toggleHighContrast() {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('highContrast', newValue.toString());
    
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-slate-900 cosmic:bg-cosmic-dark text-gray-900 dark:text-slate-100 transition-colors">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/settings" 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Moon className="w-6 h-6 text-gray-500 dark:text-slate-400" />
              Appearance
            </h1>
            <p className="text-gray-500 dark:text-slate-400">Customize how Ngurra Pathways looks</p>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="bg-white dark:bg-slate-800 cosmic:bg-cosmic rounded-xl p-6 mb-6 border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            Theme
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ThemeOption
              icon={<Sun className="w-5 h-5" />}
              label="Light"
              selected={theme === 'light'}
              onClick={() => updateTheme('light')}
            />
            <ThemeOption
              icon={<Moon className="w-5 h-5" />}
              label="Dark"
              selected={theme === 'dark'}
              onClick={() => updateTheme('dark')}
            />
            <ThemeOption
              icon={<Sparkles className="w-5 h-5" />}
              label="Cosmic ✨"
              selected={theme === 'cosmic'}
              onClick={() => updateTheme('cosmic')}
            />
            <ThemeOption
              icon={<Monitor className="w-5 h-5" />}
              label="System"
              selected={theme === 'system'}
              onClick={() => updateTheme('system')}
            />
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-white dark:bg-slate-800 cosmic:bg-cosmic rounded-xl p-6 mb-6 border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Text Size
          </h2>
          
          <div className="space-y-3">
            {[
              { value: 'small', label: 'Small', preview: 'Aa' },
              { value: 'medium', label: 'Medium', preview: 'Aa' },
              { value: 'large', label: 'Large', preview: 'Aa' },
              { value: 'xlarge', label: 'Extra Large', preview: 'Aa' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateFontSize(option.value)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                  fontSize === option.value
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-bold ${
                    option.value === 'small' ? 'text-sm' :
                    option.value === 'medium' ? 'text-base' :
                    option.value === 'large' ? 'text-lg' :
                    'text-xl'
                  }`}>
                    {option.preview}
                  </span>
                  <span className="text-gray-900 dark:text-slate-100">{option.label}</span>
                </div>
                {fontSize === option.value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility */}
        <div className="bg-white dark:bg-slate-800 cosmic:bg-cosmic rounded-xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-500 dark:text-green-400" />
            Accessibility
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <div>
                <div className="font-medium">Reduce Motion</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Minimize animations throughout the app
                </div>
              </div>
              <button
                onClick={toggleReducedMotion}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  reducedMotion ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  reducedMotion ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <div>
                <div className="font-medium">High Contrast</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Increase contrast for better visibility
                </div>
              </div>
              <button
                onClick={toggleHighContrast}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  highContrast ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  highContrast ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-slate-500">
            Ngurra Pathways is designed to meet WCAG AA accessibility standards. 
            If you have specific accessibility needs, please{' '}
            <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ icon, label, selected, onClick, disabled, disabledText }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
          : disabled
          ? 'bg-gray-100 dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700/50 opacity-50 cursor-not-allowed'
          : 'bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className={selected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        </div>
      )}
      {disabled && disabledText && (
        <span className="text-xs text-gray-500 dark:text-slate-500">{disabledText}</span>
      )}
    </button>
  );
}
