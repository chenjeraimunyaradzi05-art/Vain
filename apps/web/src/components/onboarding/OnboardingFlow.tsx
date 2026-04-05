'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * OnboardingFlow - User onboarding wizard
 * 
 * Features:
 * - Multi-step onboarding process
 * - Profile setup
 * - Preference configuration
 * - Cultural connections
 * - Skills and experience
 */

interface OnboardingData {
  step: number;
  completed: boolean;
  profile: {
    firstName: string;
    lastName: string;
    preferredName: string;
    location: string;
    phone: string;
    avatar: string | null;
  };
  identity: {
    isIndigenous: boolean;
    community: string;
    countryGroup: string;
    language: string;
  };
  career: {
    currentStatus: string;
    experience: string;
    industries: string[];
    jobTypes: string[];
    salaryRange: string;
    relocate: boolean;
    remote: boolean;
  };
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    jobAlerts: boolean;
    communityUpdates: boolean;
    learningRecommendations: boolean;
  };
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Welcome', description: 'Let\'s get started', icon: '👋' },
  { id: 2, title: 'Profile', description: 'Tell us about yourself', icon: '👤' },
  { id: 3, title: 'Identity', description: 'Cultural connections', icon: '🌏' },
  { id: 4, title: 'Career', description: 'Your career goals', icon: '💼' },
  { id: 5, title: 'Skills', description: 'What you bring', icon: '⭐' },
  { id: 6, title: 'Preferences', description: 'Stay connected', icon: '🔔' },
  { id: 7, title: 'Complete', description: 'You\'re all set!', icon: '🎉' },
];

const INDUSTRIES = [
  'Agriculture', 'Arts & Culture', 'Community Services', 'Construction',
  'Education', 'Environment', 'Government', 'Health & Wellbeing',
  'Hospitality', 'Information Technology', 'Legal', 'Media & Communications',
  'Mining & Resources', 'Not-for-Profit', 'Professional Services', 'Tourism',
];

const COUNTRY_GROUPS = [
  'Aboriginal - NSW/ACT', 'Aboriginal - Victoria', 'Aboriginal - Queensland',
  'Aboriginal - South Australia', 'Aboriginal - Western Australia',
  'Aboriginal - Northern Territory', 'Aboriginal - Tasmania',
  'Torres Strait Islander', 'Both Aboriginal and Torres Strait Islander',
  'Prefer not to say',
];

// API functions
const onboardingApi = {
  async getProgress(): Promise<OnboardingData> {
    const res = await fetch('/api/onboarding/progress', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  async saveProgress(data: Partial<OnboardingData>): Promise<void> {
    const res = await fetch('/api/onboarding/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save progress');
  },

  async complete(): Promise<void> {
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to complete onboarding');
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/onboarding/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload avatar');
    return res.json();
  },
};

// Progress Bar
function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                step.id < currentStep
                  ? 'bg-green-500 text-white'
                  : step.id === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {step.id < currentStep ? '✓' : step.icon}
            </div>
            {idx < STEPS.length - 1 && (
              <div className="hidden md:block absolute mt-5 ml-10 w-full h-0.5 bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: step.id < currentStep ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
      </div>
    </div>
  );
}

// Welcome Step
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-6xl mb-6">👋</div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to Ngurra Pathways
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        We're excited to have you join our community! Let's set up your profile so you can
        discover opportunities that match your skills and aspirations.
      </p>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Find Opportunities</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Discover jobs, mentorship, and training programs tailored for you
          </p>
        </div>
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-3xl mb-3">🤝</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Connect</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Build your network with Indigenous professionals and employers
          </p>
        </div>
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="text-3xl mb-3">📚</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Learn & Grow</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Access culturally relevant resources and learning pathways
          </p>
        </div>
      </div>

      <Button onClick={onNext} size="lg">
        Let's Get Started →
      </Button>
    </div>
  );
}

// Profile Step
function ProfileStep({
  data,
  onChange,
  onUploadAvatar,
}: {
  data: OnboardingData['profile'];
  onChange: (profile: Partial<OnboardingData['profile']>) => void;
  onUploadAvatar: (file: File) => void;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Tell us about yourself
      </h2>
      <p className="text-gray-500 text-center mb-8">
        This information helps employers and connections find you
      </p>

      {/* Avatar */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {data.avatar ? (
              <OptimizedImage src={toCloudinaryAutoUrl(data.avatar)} alt="Avatar preview" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600">
            <span>📷</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadAvatar(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              placeholder="Your first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              placeholder="Your last name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preferred Name
          </label>
          <input
            type="text"
            value={data.preferredName}
            onChange={(e) => onChange({ preferredName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder="What should we call you?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Location *
          </label>
          <input
            type="text"
            value={data.location}
            onChange={(e) => onChange({ location: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder="City, State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder="+61 4XX XXX XXX"
          />
        </div>
      </div>
    </div>
  );
}

// Identity Step
function IdentityStep({
  data,
  onChange,
}: {
  data: OnboardingData['identity'];
  onChange: (identity: Partial<OnboardingData['identity']>) => void;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Cultural Connections
      </h2>
      <p className="text-gray-500 text-center mb-8">
        This is optional but helps us connect you with culturally relevant opportunities
      </p>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          🛡️ Your cultural identity information is protected and only shared according to your privacy settings.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              checked={data.isIndigenous}
              onChange={(e) => onChange({ isIndigenous: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                I identify as Aboriginal and/or Torres Strait Islander
              </span>
              <p className="text-sm text-gray-500">
                This helps connect you with Indigenous-specific opportunities
              </p>
            </div>
          </label>
        </div>

        {data.isIndigenous && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country/Nation Group
              </label>
              <select
                value={data.countryGroup}
                onChange={(e) => onChange({ countryGroup: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Select your country group</option>
                {COUNTRY_GROUPS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Community/Mob
              </label>
              <input
                type="text"
                value={data.community}
                onChange={(e) => onChange({ community: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Your community or mob (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Traditional Language
              </label>
              <input
                type="text"
                value={data.language}
                onChange={(e) => onChange({ language: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Traditional language (optional)"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Career Step
function CareerStep({
  data,
  onChange,
}: {
  data: OnboardingData['career'];
  onChange: (career: Partial<OnboardingData['career']>) => void;
}) {
  const toggleIndustry = (industry: string) => {
    const industries = data.industries.includes(industry)
      ? data.industries.filter(i => i !== industry)
      : [...data.industries, industry];
    onChange({ industries });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Your Career Goals
      </h2>
      <p className="text-gray-500 text-center mb-8">
        Help us find opportunities that match your aspirations
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'employed', label: '💼 Employed' },
              { value: 'seeking', label: '🔍 Actively Seeking' },
              { value: 'studying', label: '📚 Studying' },
              { value: 'open', label: '👀 Open to Opportunities' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onChange({ currentStatus: option.value })}
                className={`p-3 border rounded-lg text-left ${
                  data.currentStatus === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level
          </label>
          <select
            value={data.experience}
            onChange={(e) => onChange({ experience: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="">Select experience level</option>
            <option value="entry">Entry Level (0-2 years)</option>
            <option value="mid">Mid Level (3-5 years)</option>
            <option value="senior">Senior (6-10 years)</option>
            <option value="executive">Executive (10+ years)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Industries of Interest (select up to 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry}
                onClick={() => toggleIndustry(industry)}
                disabled={data.industries.length >= 5 && !data.industries.includes(industry)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  data.industries.includes(industry)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={data.remote}
              onChange={(e) => onChange({ remote: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Open to Remote Work</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={data.relocate}
              onChange={(e) => onChange({ relocate: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Willing to Relocate</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Skills Step
function SkillsStep({
  data,
  onChange,
}: {
  data: OnboardingData['skills'];
  onChange: (skills: Partial<OnboardingData['skills']>) => void;
}) {
  const [newSkill, setNewSkill] = useState('');
  const [activeCategory, setActiveCategory] = useState<'technical' | 'soft'>('technical');

  const addSkill = () => {
    if (newSkill.trim()) {
      onChange({
        [activeCategory]: [...data[activeCategory], newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (category: 'technical' | 'soft', skill: string) => {
    onChange({
      [category]: data[category].filter(s => s !== skill),
    });
  };

  const suggestedSkills = {
    technical: ['Microsoft Office', 'Project Management', 'Data Analysis', 'Social Media', 'Customer Service'],
    soft: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management'],
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Your Skills
      </h2>
      <p className="text-gray-500 text-center mb-8">
        Add skills to help employers find you
      </p>

      <div className="flex gap-2 mb-6">
        {(['technical', 'soft'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-2 rounded-lg capitalize ${
              activeCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {cat} Skills
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder={`Add a ${activeCategory} skill...`}
          />
          <Button onClick={addSkill}>Add</Button>
        </div>

        {/* Current skills */}
        <div className="min-h-[80px] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {data[activeCategory].length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data[activeCategory].map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm flex items-center gap-1"
                >
                  {skill}
                  <button onClick={() => removeSkill(activeCategory, skill)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">No skills added yet</p>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Suggested skills:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills[activeCategory]
              .filter(s => !data[activeCategory].includes(s))
              .map((skill) => (
                <button
                  key={skill}
                  onClick={() => onChange({ [activeCategory]: [...data[activeCategory], skill] })}
                  className="px-3 py-1 border border-dashed rounded-full text-sm text-gray-600 hover:border-blue-500 hover:text-blue-500"
                >
                  + {skill}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Preferences Step
function PreferencesStep({
  data,
  onChange,
}: {
  data: OnboardingData['preferences'];
  onChange: (preferences: Partial<OnboardingData['preferences']>) => void;
}) {
  const preferences = [
    {
      key: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive updates via email',
      icon: '📧',
    },
    {
      key: 'pushNotifications',
      title: 'Push Notifications',
      description: 'Get instant notifications in browser',
      icon: '🔔',
    },
    {
      key: 'jobAlerts',
      title: 'Job Alerts',
      description: 'New job matches based on your profile',
      icon: '💼',
    },
    {
      key: 'communityUpdates',
      title: 'Community Updates',
      description: 'Events, stories, and community news',
      icon: '🌏',
    },
    {
      key: 'learningRecommendations',
      title: 'Learning Recommendations',
      description: 'Courses and resources to boost your skills',
      icon: '📚',
    },
  ];

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Stay Connected
      </h2>
      <p className="text-gray-500 text-center mb-8">
        Choose how you'd like to hear from us
      </p>

      <div className="space-y-3">
        {preferences.map((pref) => (
          <label
            key={pref.key}
            className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pref.icon}</span>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{pref.title}</span>
                <p className="text-sm text-gray-500">{pref.description}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={data[pref.key as keyof typeof data]}
              onChange={(e) => onChange({ [pref.key]: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// Complete Step
function CompleteStep({ data, onComplete }: { data: OnboardingData; onComplete: () => void }) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        You're All Set!
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Welcome to Ngurra Pathways, {data.profile.preferredName || data.profile.firstName}!
        Your profile is ready to go.
      </p>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">What's Next?</h3>
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">1</span>
            <span className="text-gray-600 dark:text-gray-400">Explore job opportunities that match your profile</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">2</span>
            <span className="text-gray-600 dark:text-gray-400">Connect with mentors in your industry</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">3</span>
            <span className="text-gray-600 dark:text-gray-400">Complete your profile to stand out to employers</span>
          </div>
        </div>
      </div>

      <Button onClick={onComplete} size="lg">
        Start Exploring →
      </Button>
    </div>
  );
}

// Main Component
export function OnboardingFlow() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
    completed: false,
    profile: {
      firstName: '',
      lastName: '',
      preferredName: '',
      location: '',
      phone: '',
      avatar: null,
    },
    identity: {
      isIndigenous: false,
      community: '',
      countryGroup: '',
      language: '',
    },
    career: {
      currentStatus: '',
      experience: '',
      industries: [],
      jobTypes: [],
      salaryRange: '',
      relocate: false,
      remote: false,
    },
    skills: {
      technical: [],
      soft: [],
      languages: [],
      certifications: [],
    },
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      jobAlerts: true,
      communityUpdates: true,
      learningRecommendations: true,
    },
  });

  const loadProgress = useCallback(async () => {
    try {
      const progress = await onboardingApi.getProgress();
      setData(progress);
      setCurrentStep(progress.step);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const saveProgress = async () => {
    setIsSaving(true);
    try {
      await onboardingApi.saveProgress({ ...data, step: currentStep });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    try {
      await onboardingApi.complete();
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to complete:', error);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    try {
      const { url } = await onboardingApi.uploadAvatar(file);
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, avatar: url },
      }));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };

  const updateData = <K extends keyof OnboardingData>(key: K, value: Partial<OnboardingData[K]>) => {
    setData((prev) => {
      const existing = prev[key];
      const canMerge = existing !== null && typeof existing === 'object';

      return {
        ...prev,
        [key]: (canMerge
          ? { ...(existing as object), ...(value as object) }
          : value) as OnboardingData[K],
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-12">
          <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} />
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          {currentStep === 1 && <WelcomeStep onNext={handleNext} />}
          {currentStep === 2 && (
            <ProfileStep
              data={data.profile}
              onChange={(profile) => updateData('profile', profile)}
              onUploadAvatar={handleUploadAvatar}
            />
          )}
          {currentStep === 3 && (
            <IdentityStep
              data={data.identity}
              onChange={(identity) => updateData('identity', identity)}
            />
          )}
          {currentStep === 4 && (
            <CareerStep
              data={data.career}
              onChange={(career) => updateData('career', career)}
            />
          )}
          {currentStep === 5 && (
            <SkillsStep
              data={data.skills}
              onChange={(skills) => updateData('skills', skills)}
            />
          )}
          {currentStep === 6 && (
            <PreferencesStep
              data={data.preferences}
              onChange={(preferences) => updateData('preferences', preferences)}
            />
          )}
          {currentStep === 7 && <CompleteStep data={data} onComplete={handleComplete} />}
        </div>

        {/* Navigation */}
        {currentStep > 1 && currentStep < 7 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              ← Back
            </Button>
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Continue →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;
