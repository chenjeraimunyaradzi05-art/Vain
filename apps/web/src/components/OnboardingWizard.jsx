'use client';

/**
 * Onboarding Wizard Component
 * 
 * Multi-step onboarding flow with role-specific paths
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Briefcase,
  Star,
  GraduationCap,
  Users,
  MapPin,
  Building2,
  Target,
  Bell,
  PartyPopper,
  Loader2,
  SkipForward,
  Info,
  Shield
} from 'lucide-react';

// Role configurations
const ROLES = [
  {
    id: 'jobseeker',
    name: 'Job Seeker',
    description: 'Looking for employment opportunities',
    icon: Target,
    color: 'from-purple-600 to-indigo-700'
  },
  {
    id: 'employer',
    name: 'Employer',
    description: 'Hiring talent for your organisation',
    icon: Building2,
    color: 'from-blue-600 to-cyan-700'
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Guiding and supporting others',
    icon: Star,
    color: 'from-yellow-600 to-orange-700'
  },
  {
    id: 'tafe',
    name: 'Training Provider',
    description: 'TAFE or registered training organisation',
    icon: GraduationCap,
    color: 'from-green-600 to-emerald-700'
  },
  {
    id: 'community',
    name: 'Community Partner',
    description: 'Aboriginal community organisation',
    icon: Users,
    color: 'from-rose-600 to-pink-700'
  }
];

function RoleSelector({ selectedRole, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ROLES.map((role) => (
        <button
          key={role.id}
          onClick={() => onSelect(role.id)}
          className={`relative p-6 rounded-xl border-2 transition-all text-left ${
            selectedRole === role.id
              ? 'border-purple-500 bg-purple-900/20'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          {selectedRole === role.id && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
            <role.icon className="w-6 h-6 text-white" />
          </div>
          
          <h4 className="font-semibold text-white mb-1">{role.name}</h4>
          <p className="text-sm text-slate-400">{role.description}</p>
        </button>
      ))}
    </div>
  );
}

function InfoStep({ step }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center mx-auto mb-6">
        <PartyPopper className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">{step.title}</h2>
      <p className="text-lg text-slate-300 mb-8">{step.content?.message}</p>
      
      {step.content?.features && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
          {step.content.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-slate-300">{feature}</span>
            </div>
          ))}
        </div>
      )}
      
      {step.content?.culturalNote && (
        <p className="text-sm text-slate-500 italic">{step.content.culturalNote}</p>
      )}
    </div>
  );
}

function FormStep({ step, formData, onChange }) {
  const renderField = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.name] || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'location':
        return (
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={formData[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white"
              placeholder="Enter your location"
              required={field.required}
            />
          </div>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData[field.name] || false}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-600"
            />
            <span className="text-slate-300">{field.label}</span>
          </label>
        );
      
      case 'select':
        return (
          <select
            value={formData[field.name] || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
            required={field.required}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={(formData[field.name] || []).includes(opt.value)}
                  onChange={(e) => {
                    const current = formData[field.name] || [];
                    if (e.target.checked) {
                      onChange(field.name, [...current, opt.value]);
                    } else {
                      onChange(field.name, current.filter(v => v !== opt.value));
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-600"
                />
                <span className="text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'tags':
        return (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(formData[field.name] || []).map((tag, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      onChange(field.name, (formData[field.name] || []).filter((_, i) => i !== idx));
                    }}
                    className="text-purple-400 hover:text-purple-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder={field.placeholder}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = e.target.value.trim();
                  if (value && !(formData[field.name] || []).includes(value)) {
                    onChange(field.name, [...(formData[field.name] || []), value]);
                    e.target.value = '';
                  }
                }
              }}
            />
            {field.suggestions && (
              <div className="flex flex-wrap gap-2 mt-2">
                {field.suggestions.filter(s => !(formData[field.name] || []).includes(s)).slice(0, 6).map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(field.name, [...(formData[field.name] || []), suggestion])}
                    className="text-xs bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={formData[field.name] || ''}
            onChange={(e) => onChange(field.name, parseInt(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
            required={field.required}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
      <p className="text-slate-400 mb-8">{step.subtitle}</p>
      
      {step.privacyNote && (
        <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 mb-6">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300">{step.privacyNote}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {step.fields?.map((field) => (
          <div key={field.name}>
            {field.type !== 'boolean' && (
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceStep({ step, formData, onChange }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
      <p className="text-slate-400 mb-8">{step.subtitle}</p>
      
      <div className="space-y-4">
        {step.options?.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(step.id, option.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              formData[step.id] === option.value
                ? 'border-purple-500 bg-purple-900/20'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <span className="text-3xl">{option.icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-white">{option.label}</h4>
              <p className="text-sm text-slate-400">{option.description}</p>
            </div>
            {formData[step.id] === option.value && (
              <Check className="w-6 h-6 text-purple-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CelebrationStep({ step, onAction }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 animate-bounce">
        <PartyPopper className="w-12 h-12 text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">{step.title}</h2>
      <p className="text-lg text-slate-300 mb-8">{step.content?.message}</p>
      
      {step.content?.nextSteps && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {step.content.nextSteps.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onAction(action.action)}
              className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors text-left group"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="flex-1 text-slate-300 group-hover:text-white">{action.label}</span>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({});

  // Fetch onboarding status and steps
  useEffect(() => {
    const fetchOnboarding = async () => {
      if (!isAuthenticated) return;
      
      try {
        const { ok, data } = await api('/onboarding/status');
        
        if (ok) {
          if (data.isComplete) {
            router.push('/dashboard');
            return;
          }
          if (data.hasOnboarding) {
            setSelectedRole(data.role);
            setSteps(data.steps || []);
            setCurrentStepIndex(data.currentStepIndex || 0);
            setFormData(data.data || {});
          }
        }
      } catch (error) {
        console.error('Failed to fetch onboarding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboarding();
  }, [isAuthenticated, router]);

  // Start onboarding with selected role
  const startOnboarding = async () => {
    if (!selectedRole) return;
    
    setSubmitting(true);
    try {
      const { ok, data } = await api('/onboarding/start', {
        method: 'POST',
        body: { role: selectedRole },
      });
      
      if (ok) {
        setSteps(data.steps || []);
        setCurrentStepIndex(0);
      }
    } catch (error) {
      console.error('Failed to start onboarding:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;
    
    setSubmitting(true);
    try {
      const { ok, data } = await api(`/onboarding/steps/${currentStep.id}/complete`, {
        method: 'POST',
        body: formData,
      });
      
      if (ok) {
        if (data.isComplete) {
          router.push('/dashboard');
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep || currentStep.isRequired) return;
    
    try {
      await api(`/onboarding/steps/${currentStep.id}/skip`, { method: 'POST' });
      setCurrentStepIndex(prev => prev + 1);
    } catch (error) {
      console.error('Failed to skip step:', error);
    }
  };

  const handleSkipAll = async () => {
    if (!confirm('Are you sure you want to skip onboarding? You can complete it later from your profile.')) return;
    
    try {
      await api('/onboarding/skip', { method: 'POST' });
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  const handleAction = (action) => {
    const routes = {
      browse_jobs: '/jobs',
      complete_profile: '/profile',
      find_mentor: '/mentors',
      explore_training: '/courses',
      post_job: '/employer/jobs/new',
      browse_candidates: '/employer/candidates',
      complete_verification: '/employer/verification',
      company_profile: '/employer/profile'
    };
    router.push(routes[action] || '/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header with progress */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">
              {steps.length > 0 ? `Step ${currentStepIndex + 1} of ${steps.length}` : 'Getting started'}
            </span>
            <button
              onClick={handleSkipAll}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              <SkipForward className="w-4 h-4" />
              Skip for now
            </button>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-24 pb-32 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Role Selection (before steps) */}
          {!selectedRole && steps.length === 0 && (
            <div>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">Welcome to Ngurra Pathways</h1>
                <p className="text-xl text-slate-400">How would you like to use the platform?</p>
              </div>
              <RoleSelector selectedRole={selectedRole} onSelect={setSelectedRole} />
            </div>
          )}

          {/* Role selected but not started */}
          {selectedRole && steps.length === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center mx-auto mb-6">
                {(() => {
                  const role = ROLES.find(r => r.id === selectedRole);
                  const Icon = role?.icon || User;
                  return <Icon className="w-10 h-10 text-white" />;
                })()}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Great choice!
              </h2>
              <p className="text-slate-400 mb-8">
                Let's set up your {ROLES.find(r => r.id === selectedRole)?.name} profile.
              </p>
              <button
                onClick={startOnboarding}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white px-8 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-slate-400 hover:text-white mt-4 text-sm"
              >
                ← Choose a different role
              </button>
            </div>
          )}

          {/* Step content */}
          {currentStep && (
            <div>
              {currentStep.type === 'info' && (
                <InfoStep step={currentStep} />
              )}
              
              {currentStep.type === 'form' && (
                <FormStep
                  step={currentStep}
                  formData={formData}
                  onChange={handleFieldChange}
                />
              )}
              
              {currentStep.type === 'choice' && (
                <ChoiceStep
                  step={currentStep}
                  formData={formData}
                  onChange={handleFieldChange}
                />
              )}
              
              {currentStep.type === 'celebration' && (
                <CelebrationStep
                  step={currentStep}
                  onAction={handleAction}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      {currentStep && currentStep.type !== 'celebration' && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {!currentStep.isRequired && currentStep.isOptional && (
                <button
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-white px-4 py-2"
                >
                  Skip
                </button>
              )}
              
              <button
                onClick={handleNext}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
