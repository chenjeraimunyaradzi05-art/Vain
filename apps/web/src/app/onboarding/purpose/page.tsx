'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, Heart, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

const PURPOSE_OPTIONS = [
  {
    value: 'work',
    label: 'Find Work',
    description: 'Looking for job opportunities and employment',
    icon: '💼',
    features: ['Job matching', 'Applications tracking', 'Employer connections'],
    color: 'blue'
  },
  {
    value: 'learning',
    label: 'Learn Skills',
    description: 'Building skills through courses and training',
    icon: '📚',
    features: ['Course recommendations', 'Skill tracking', 'Certification pathways'],
    color: 'green'
  },
  {
    value: 'mentorship',
    label: 'Get Guidance',
    description: 'Connect with mentors and career advisors',
    icon: '🌟',
    features: ['Mentor matching', 'Career guidance', 'Professional support'],
    color: 'purple'
  },
  {
    value: 'community',
    label: 'Connect & Support',
    description: 'Join community discussions and support networks',
    icon: '🤝',
    features: ['Community forums', 'Peer support', 'Networking opportunities'],
    color: 'pink'
  }
];

const SECONDARY_OPTIONS = [
  { value: 'work', label: 'Find Work', icon: '💼' },
  { value: 'learning', label: 'Learn Skills', icon: '📚' },
  { value: 'mentorship', label: 'Get Guidance', icon: '🌟' },
  { value: 'community', label: 'Connect & Support', icon: '🤝' }
];

export default function OnboardingPurposePage() {
  const router = useRouter();
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'primary' | 'secondary' | 'confirm'>('welcome');

  // Check if user already has a purpose
  const checkExistingPurpose = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signup');
        return;
      }

      const response = await fetch('/api/v1/me/purpose', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasPurpose) {
          // User already has a purpose, redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error checking existing purpose:', error);
    }
  }, [router]);

  useEffect(() => {
    checkExistingPurpose();
  }, [checkExistingPurpose]);

  const handlePrimarySelect = (value: string) => {
    setSelectedPrimary(value);
    setError(null);
  };

  const handleSecondarySelect = (value: string) => {
    if (value !== selectedPrimary) {
      setSelectedSecondary(value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPrimary) {
      setError('Please select your primary purpose');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/onboarding/purpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          primary: selectedPrimary,
          secondary: selectedSecondary
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save purpose');
      }

      // Log telemetry event
      console.log('TELEMETRY: onboarding_completed', {
        primary: selectedPrimary,
        secondary: selectedSecondary,
        timestamp: new Date().toISOString()
      });

      // Redirect to dashboard
      router.push('/dashboard');

    } catch (error) {
      console.error('Error saving purpose:', error);
      setError(error instanceof Error ? error.message : 'Failed to save your purpose');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 'welcome') setCurrentStep('primary');
    else if (currentStep === 'primary') setCurrentStep('secondary');
    else if (currentStep === 'secondary') setCurrentStep('confirm');
  };

  const prevStep = () => {
    if (currentStep === 'primary') setCurrentStep('welcome');
    else if (currentStep === 'secondary') setCurrentStep('primary');
    else if (currentStep === 'confirm') setCurrentStep('secondary');
  };

  const renderWelcome = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <h1 className="vantage-h1 mb-4">Welcome to Vantage</h1>
        <p className="text-xl vantage-text mb-6">
          Let us know what brings you here so we can personalize your experience
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" 
             style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <Heart className="w-4 h-4" style={{ color: '#FFD700' }} />
          <span className="text-sm font-medium" style={{ color: '#FFD700' }}>Step 1 of 4</span>
        </div>
      </div>

      <div className="vantage-card p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Why are you here today?</h2>
        <p className="vantage-text mb-6">
          Vantage helps you move from opportunity discovery to long-term progress. 
          Choose your primary goal to get started with personalized recommendations.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {PURPOSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSelectedPrimary(option.value);
                setCurrentStep('primary');
              }}
              className="p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all text-left group"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div className="text-3xl mb-3">{option.icon}</div>
              <h3 className="font-semibold mb-2">{option.label}</h3>
              <p className="text-sm vantage-text mb-3">{option.description}</p>
              <div className="space-y-1">
                {option.features.map((feature, idx) => (
                  <div key={idx} className="text-xs vantage-muted flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {feature}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('primary')}
        className="vantage-btn-primary px-8 py-3"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderPrimarySelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="vantage-h1 mb-4">What's your main goal?</h1>
        <p className="text-xl vantage-text mb-6">
          This will be your primary focus on Vantage
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" 
             style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <Heart className="w-4 h-4" style={{ color: '#FFD700' }} />
          <span className="text-sm font-medium" style={{ color: '#FFD700' }}>Step 2 of 4</span>
        </div>
      </div>

      <div className="grid gap-4 mb-8">
        {PURPOSE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handlePrimarySelect(option.value)}
            className={`p-6 rounded-xl border-2 transition-all text-left group ${
              selectedPrimary === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onMouseEnter={(e) => {
              if (selectedPrimary !== option.value) {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPrimary !== option.value) {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{option.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{option.label}</h3>
                <p className="vantage-text mb-3">{option.description}</p>
                <div className="space-y-1">
                  {option.features.map((feature, idx) => (
                    <div key={idx} className="text-xs vantage-muted flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              {selectedPrimary === option.value && (
                <div className="text-blue-500">
                  <CheckCircle className="w-6 h-6" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="vantage-btn-secondary px-6 py-3"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!selectedPrimary}
          className="vantage-btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderSecondarySelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="vantage-h1 mb-4">Any other interests?</h1>
        <p className="text-xl vantage-text mb-6">
          Choose an optional secondary focus (you can skip this)
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" 
             style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <Heart className="w-4 h-4" style={{ color: '#FFD700' }} />
          <span className="text-sm font-medium" style={{ color: '#FFD700' }}>Step 3 of 4</span>
        </div>
      </div>

      <div className="vantage-card p-8 mb-8">
        <p className="vantage-text mb-6">
          Your primary focus is <strong>{PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.label}</strong>. 
          Would you like to add a secondary interest?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {SECONDARY_OPTIONS.filter(option => option.value !== selectedPrimary).map((option) => (
            <button
              key={option.value}
              onClick={() => handleSecondarySelect(option.value)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedSecondary === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="text-sm font-medium">{option.label}</div>
              {selectedSecondary === option.value && (
                <div className="text-blue-500 mt-2">
                  <CheckCircle className="w-4 h-4 mx-auto" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSelectedSecondary(null)}
          className="text-sm vantage-link hover:underline"
        >
          Skip secondary selection
        </button>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="vantage-btn-secondary px-6 py-3"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="vantage-btn-primary px-6 py-3"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <h1 className="vantage-h1 mb-4">Confirm your choices</h1>
        <p className="text-xl vantage-text mb-6">
          Review your selections before we personalize your experience
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" 
             style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <Heart className="w-4 h-4" style={{ color: '#FFD700' }} />
          <span className="text-sm font-medium" style={{ color: '#FFD700' }}>Step 4 of 4</span>
        </div>
      </div>

      <div className="vantage-card p-8 mb-8">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Primary Focus</h3>
            <div className="flex items-center gap-3 text-lg">
              <span className="text-2xl">
                {PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.icon}
              </span>
              <span>{PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.label}</span>
            </div>
          </div>

          {selectedSecondary && (
            <div>
              <h3 className="font-semibold mb-2">Secondary Interest</h3>
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {SECONDARY_OPTIONS.find(p => p.value === selectedSecondary)?.icon}
                </span>
                <span>{SECONDARY_OPTIONS.find(p => p.value === selectedSecondary)?.label}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="vantage-btn-secondary px-6 py-3"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="vantage-btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Complete Setup'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="vantage-page py-12 px-6">
      <div className="vantage-halos">
        <div className="vantage-halo-pink" />
        <div className="vantage-halo-purple" />
      </div>

      {currentStep === 'welcome' && renderWelcome()}
      {currentStep === 'primary' && renderPrimarySelection()}
      {currentStep === 'secondary' && renderSecondarySelection()}
      {currentStep === 'confirm' && renderConfirm()}
    </div>
  );
}
