'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * HelpTour - Interactive onboarding tour and help system
 * 
 * Features:
 * - Guided tours
 * - Feature walkthroughs
 * - Contextual help
 * - Keyboard shortcuts
 */

interface Tour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
  completed: boolean;
  duration: string;
  category: 'getting-started' | 'features' | 'advanced';
}

interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  views: number;
}

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// API functions
const helpApi = {
  async getTours(): Promise<Tour[]> {
    const res = await fetch('/api/help/tours', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tours');
    return res.json();
  },

  async startTour(tourId: string): Promise<Tour> {
    const res = await fetch(`/api/help/tours/${tourId}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to start tour');
    return res.json();
  },

  async completeTour(tourId: string): Promise<void> {
    const res = await fetch(`/api/help/tours/${tourId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to complete tour');
  },

  async resetTour(tourId: string): Promise<void> {
    const res = await fetch(`/api/help/tours/${tourId}/reset`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to reset tour');
  },

  async getArticles(): Promise<HelpArticle[]> {
    const res = await fetch('/api/help/articles', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch articles');
    return res.json();
  },

  async getShortcuts(): Promise<KeyboardShortcut[]> {
    const res = await fetch('/api/help/shortcuts', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch shortcuts');
    return res.json();
  },

  async getFAQs(): Promise<FAQ[]> {
    const res = await fetch('/api/help/faqs', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch FAQs');
    return res.json();
  },
};

// Default data
const DEFAULT_TOURS: Tour[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of Ngurra Pathways',
    duration: '5 min',
    category: 'getting-started',
    completed: false,
    steps: [
      { id: '1', title: 'Welcome!', content: 'Let\'s take a quick tour of Ngurra Pathways and discover what you can do here.' },
      { id: '2', title: 'Your Dashboard', content: 'This is your home base. See job recommendations, updates, and quick actions.', target: '#dashboard' },
      { id: '3', title: 'Job Search', content: 'Find opportunities that match your skills and interests.', target: '#job-search' },
      { id: '4', title: 'Your Profile', content: 'Complete your profile to stand out to employers.', target: '#profile' },
      { id: '5', title: 'Community', content: 'Connect with other Indigenous professionals and mentors.', target: '#community' },
    ],
  },
  {
    id: 'profile-setup',
    title: 'Complete Your Profile',
    description: 'Create a standout profile that gets noticed',
    duration: '10 min',
    category: 'getting-started',
    completed: false,
    steps: [
      { id: '1', title: 'Profile Photo', content: 'Add a professional photo to make a great first impression.' },
      { id: '2', title: 'Your Story', content: 'Write a compelling headline and summary about yourself.' },
      { id: '3', title: 'Skills', content: 'Add your skills so employers can find you in searches.' },
      { id: '4', title: 'Experience', content: 'List your work history and achievements.' },
      { id: '5', title: 'Education', content: 'Add your qualifications and certifications.' },
    ],
  },
  {
    id: 'job-search',
    title: 'Finding Jobs',
    description: 'Master the job search tools',
    duration: '7 min',
    category: 'features',
    completed: false,
    steps: [
      { id: '1', title: 'Search & Filters', content: 'Use keywords and filters to find relevant opportunities.' },
      { id: '2', title: 'Job Alerts', content: 'Set up alerts to get notified about new matching jobs.' },
      { id: '3', title: 'Save Jobs', content: 'Bookmark jobs you\'re interested in for later.' },
      { id: '4', title: 'Quick Apply', content: 'Apply faster with your saved profile and resume.' },
    ],
  },
  {
    id: 'networking',
    title: 'Building Your Network',
    description: 'Connect with professionals and mentors',
    duration: '6 min',
    category: 'features',
    completed: false,
    steps: [
      { id: '1', title: 'Find Connections', content: 'Discover people in your industry and community.' },
      { id: '2', title: 'Send Requests', content: 'Reach out to people you\'d like to connect with.' },
      { id: '3', title: 'Find a Mentor', content: 'Get matched with experienced professionals who can guide you.' },
      { id: '4', title: 'Join Groups', content: 'Participate in community discussions and events.' },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Power User Tips',
    description: 'Get the most out of the platform',
    duration: '8 min',
    category: 'advanced',
    completed: false,
    steps: [
      { id: '1', title: 'Keyboard Shortcuts', content: 'Navigate faster with keyboard shortcuts.' },
      { id: '2', title: 'Advanced Search', content: 'Use boolean operators for precise searches.' },
      { id: '3', title: 'Analytics', content: 'Track your profile views and application stats.' },
      { id: '4', title: 'Integrations', content: 'Connect your calendar and other tools.' },
    ],
  },
];

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: '⌘/Ctrl + K', description: 'Open search', category: 'Navigation' },
  { key: '⌘/Ctrl + J', description: 'Go to Jobs', category: 'Navigation' },
  { key: '⌘/Ctrl + M', description: 'Open Messages', category: 'Navigation' },
  { key: '⌘/Ctrl + N', description: 'Create new', category: 'Navigation' },
  { key: 'G then D', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'G then P', description: 'Go to Profile', category: 'Navigation' },
  { key: 'G then S', description: 'Go to Settings', category: 'Navigation' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'General' },
  { key: 'Esc', description: 'Close modal/dialog', category: 'General' },
  { key: 'Enter', description: 'Confirm action', category: 'General' },
  { key: 'Tab', description: 'Navigate form fields', category: 'Forms' },
  { key: 'Space', description: 'Toggle checkbox', category: 'Forms' },
  { key: '↑ / ↓', description: 'Navigate lists', category: 'Lists' },
  { key: 'J / K', description: 'Next / Previous item', category: 'Lists' },
];

const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I reset my password?',
    answer: 'Go to Settings > Account > Password and click "Change Password". You\'ll need to enter your current password and then your new password twice.',
    category: 'Account',
  },
  {
    id: '2',
    question: 'How do employers find my profile?',
    answer: 'Employers can search for candidates based on skills, location, and experience. Make sure your profile is complete and set to "Visible to Employers" in Privacy Settings.',
    category: 'Profile',
  },
  {
    id: '3',
    question: 'How do I apply for a job?',
    answer: 'Click on a job listing to view details, then click "Apply". You can use your saved resume or upload a new one. Some employers may have additional questions.',
    category: 'Jobs',
  },
  {
    id: '4',
    question: 'What is the mentorship program?',
    answer: 'Our mentorship program connects Indigenous job seekers with experienced professionals. You can request a mentor match based on your industry and goals.',
    category: 'Community',
  },
  {
    id: '5',
    question: 'Is my cultural identity information protected?',
    answer: 'Yes, your cultural identity information is kept confidential and only shared according to your privacy settings. We follow strict data protection guidelines.',
    category: 'Privacy',
  },
];

// Tour Card
function TourCard({
  tour,
  onStart,
  onReset,
}: {
  tour: Tour;
  onStart: () => void;
  onReset: () => void;
}) {
  const categoryColors = {
    'getting-started': 'bg-green-100 text-green-700',
    'features': 'bg-blue-100 text-blue-700',
    'advanced': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs px-2 py-1 rounded ${categoryColors[tour.category]}`}>
          {tour.category.replace('-', ' ')}
        </span>
        {tour.completed && (
          <span className="text-green-500 text-lg">✓</span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{tour.title}</h3>
      <p className="text-sm text-gray-500 mb-4">{tour.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          ⏱️ {tour.duration} • {tour.steps.length} steps
        </span>
        <div className="flex gap-2">
          {tour.completed && (
            <button
              onClick={onReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Restart
            </button>
          )}
          <Button size="sm" onClick={onStart}>
            {tour.completed ? 'Review' : 'Start Tour'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Tour Player
function TourPlayer({
  tour,
  onComplete,
  onExit,
}: {
  tour: Tour;
  onComplete: () => void;
  onExit: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tour.steps[currentStep];
  const isLastStep = currentStep === tour.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 relative">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {tour.steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full ${
                idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onExit}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {step.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{step.content}</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>

        {/* Step counter */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Step {currentStep + 1} of {tour.steps.length}
        </p>
      </div>
    </div>
  );
}

// Shortcuts Modal
function ShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}) {
  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            ⌨️ Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection({ faqs }: { faqs: FAQ[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(faqs.map(f => f.category))];
  const filtered = filter === 'All' ? faqs : faqs.filter(f => f.category === filter);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Frequently Asked Questions
      </h3>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((faq) => (
          <div key={faq.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
            <button
              onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between py-4 text-left"
            >
              <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
              <span className="text-gray-400 ml-2">{expanded === faq.id ? '−' : '+'}</span>
            </button>
            {expanded === faq.id && (
              <div className="pb-4 text-gray-600 dark:text-gray-400">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Component
export function HelpTour() {
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[]>(DEFAULT_TOURS);
  const [shortcuts] = useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [faqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeTab, setActiveTab] = useState<'tours' | 'shortcuts' | 'faq'>('tours');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const toursData = await helpApi.getTours();
      setTours(toursData);
    } catch (error) {
      // Use defaults
      console.error('Failed to load tours:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartTour = (tour: Tour) => {
    setActiveTour(tour);
  };

  const handleCompleteTour = async () => {
    if (!activeTour) return;
    try {
      await helpApi.completeTour(activeTour.id);
      setTours(tours.map(t =>
        t.id === activeTour.id ? { ...t, completed: true } : t
      ));
    } catch (error) {
      console.error('Failed to complete tour:', error);
    }
    setActiveTour(null);
  };

  const handleResetTour = async (tourId: string) => {
    try {
      await helpApi.resetTour(tourId);
      setTours(tours.map(t =>
        t.id === tourId ? { ...t, completed: false } : t
      ));
    } catch (error) {
      console.error('Failed to reset tour:', error);
    }
  };

  const completedCount = tours.filter(t => t.completed).length;
  const progress = (completedCount / tours.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Help & Tours</h1>
      <p className="text-gray-500 mb-8">Learn how to use Ngurra Pathways effectively</p>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Progress</h3>
            <p className="text-sm text-gray-500">
              {completedCount} of {tours.length} tours completed
            </p>
          </div>
          <div className="text-3xl">{completedCount === tours.length ? '🏆' : '🎯'}</div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'tours', label: 'Guided Tours', icon: '🎯' },
          { key: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
          { key: 'faq', label: 'FAQ', icon: '❓' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg ${
              activeTab === tab.key
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'tours' && (
        <div className="grid md:grid-cols-2 gap-4">
          {tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onStart={() => handleStartTour(tour)}
              onReset={() => handleResetTour(tour.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'shortcuts' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h3>
            <span className="text-sm text-gray-500">Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> anywhere to view</span>
          </div>

          {Object.entries(shortcuts.reduce((acc, shortcut) => {
            if (!acc[shortcut.category]) acc[shortcut.category] = [];
            acc[shortcut.category].push(shortcut);
            return acc;
          }, {} as Record<string, KeyboardShortcut[]>)).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {category}
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {items.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border rounded text-sm font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'faq' && <FAQSection faqs={faqs} />}

      {/* Tour Player */}
      {activeTour && (
        <TourPlayer
          tour={activeTour}
          onComplete={handleCompleteTour}
          onExit={() => setActiveTour(null)}
        />
      )}

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}

export default HelpTour;
