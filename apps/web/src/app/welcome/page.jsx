'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Target,
  Heart,
  BookOpen
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Vantage',
  },
  {
    id: 'interests',
    title: 'What brings you here?',
  },
  {
    id: 'goals',
    title: 'Set your goals',
  },
  {
    id: 'complete',
    title: 'You\'re all set!',
  },
];

const INTERESTS = [
  {
    id: 'job-search',
    icon: Briefcase,
    title: 'Find a Job',
    description: 'Browse opportunities from inclusive employers',
  },
  {
    id: 'mentorship',
    icon: Heart,
    title: 'Get a Mentor',
    description: 'Connect with experienced professionals',
  },
  {
    id: 'training',
    icon: GraduationCap,
    title: 'Learn New Skills',
    description: 'Explore courses and certifications',
  },
  {
    id: 'community',
    icon: Users,
    title: 'Join the Community',
    description: 'Connect with peers and share experiences',
  },
];

const GOALS = [
  { id: 'new-job-1m', label: 'Find a new job in the next month' },
  { id: 'new-job-3m', label: 'Find a new job in the next 3 months' },
  { id: 'upskill', label: 'Learn new skills for career growth' },
  { id: 'career-change', label: 'Transition to a new career' },
  { id: 'mentor-connect', label: 'Connect with a mentor' },
  { id: 'network', label: 'Build my professional network' },
  { id: 'explore', label: 'Just exploring opportunities' },
];

export default function WelcomePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [saving, setSaving] = useState(false);

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const toggleInterest = (id) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleGoal = (id) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/member/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interests: selectedInterests,
          goals: selectedGoals,
          completedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to save onboarding:', err);
    } finally {
      setSaving(false);
      router.push('/member/dashboard');
    }
  };

  const skipOnboarding = () => {
    router.push('/member/dashboard');
  };

  return (
    <div className="ngurra-page py-12 px-4 relative overflow-hidden">
      {/* Decorative halos */}
      <div className="ngurra-halo-pink" />
      <div className="ngurra-halo-purple" />

      <div className="max-w-2xl mx-auto relative">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all"
                  style={
                    index <= currentStep
                      ? { background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`, color: 'white' }
                      : { background: '#F1F5F9', color: '#94A3B8' }
                  }
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-1 mx-2 rounded transition-all"
                    style={
                      index < currentStep
                        ? { background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }
                        : { background: '#E2E8F0' }
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center">
              <div 
                className="mb-6 mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
              >
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-4">
                Welcome to Vantage{user?.firstName ? `, ${user.firstName}` : ''}!
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                We're excited to have you here. Let's take a moment to personalize your experience.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-6 py-3 transition-all hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                    boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                  }}
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={skipOnboarding}
                  className="text-slate-500 hover:text-pink-600 px-4 py-3 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Interests */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                What brings you here?
              </h2>
              <p className="text-slate-500 mb-8 text-center">
                Select all that apply. This helps us show you relevant content.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {INTERESTS.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className="p-4 rounded-xl border text-left transition-all"
                      style={
                        isSelected
                          ? { background: 'rgba(233, 30, 140, 0.08)', borderColor: accentPink }
                          : { background: '#F8FAFC', borderColor: '#E2E8F0' }
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={
                            isSelected 
                              ? { background: 'rgba(233, 30, 140, 0.15)' }
                              : { background: '#F1F5F9' }
                          }
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: isSelected ? accentPink : '#64748B' }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{interest.title}</h3>
                          <p className="text-sm text-slate-500">{interest.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 ml-auto" style={{ color: accentPink }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-slate-500 hover:text-pink-600 px-4 py-2 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={selectedInterests.length === 0}
                  className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-6 py-3 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                    boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                  }}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-8">
                <div 
                  className="mb-4 mx-auto w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                >
                  <Target className="w-6 h-6" style={{ color: accentPurple }} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Set your goals
                </h2>
                <p className="text-slate-500">
                  What would you like to achieve? Select all that apply.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className="w-full p-4 rounded-lg border text-left flex items-center gap-3 transition-all"
                      style={
                        isSelected
                          ? { background: 'rgba(139, 92, 246, 0.08)', borderColor: accentPurple }
                          : { background: '#F8FAFC', borderColor: '#E2E8F0' }
                      }
                    >
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center"
                        style={
                          isSelected
                            ? { background: accentPurple, borderColor: accentPurple }
                            : { borderColor: '#CBD5E1' }
                        }
                      >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-slate-700">{goal.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-slate-500 hover:text-pink-600 px-4 py-2 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-6 py-3 transition-all hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                    boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                  }}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="text-center">
              <div 
                className="mb-6 mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.15)' }}
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                You're all set!
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                We've personalized your dashboard based on your interests and goals. 
                You can update these anytime in your settings.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-medium text-slate-800 mb-4">Quick actions to get started:</h3>
                <ul className="space-y-3">
                  {selectedInterests.includes('job-search') && (
                    <li className="flex items-center gap-3 text-slate-600">
                      <Briefcase className="w-5 h-5" style={{ color: accentPink }} />
                      <Link href="/jobs" className="hover:text-pink-600 transition-colors">
                        Browse job listings →
                      </Link>
                    </li>
                  )}
                  {selectedInterests.includes('mentorship') && (
                    <li className="flex items-center gap-3 text-slate-600">
                      <Heart className="w-5 h-5" style={{ color: accentPink }} />
                      <Link href="/mentorship" className="hover:text-pink-600 transition-colors">
                        Find a mentor →
                      </Link>
                    </li>
                  )}
                  {selectedInterests.includes('training') && (
                    <li className="flex items-center gap-3 text-slate-600">
                      <BookOpen className="w-5 h-5" style={{ color: accentPurple }} />
                      <Link href="/courses" className="hover:text-purple-600 transition-colors">
                        Explore courses →
                      </Link>
                    </li>
                  )}
                  {selectedInterests.includes('community') && (
                    <li className="flex items-center gap-3 text-slate-600">
                      <Users className="w-5 h-5" style={{ color: accentPurple }} />
                      <Link href="/community" className="hover:text-purple-600 transition-colors">
                        Join the community →
                      </Link>
                    </li>
                  )}
                  <li className="flex items-center gap-3 text-slate-600">
                    <Building2 className="w-5 h-5" style={{ color: accentPink }} />
                    <Link href="/profile" className="hover:text-pink-600 transition-colors">
                      Complete your profile →
                    </Link>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={completeOnboarding}
                disabled={saving}
                className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-8 py-3 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                style={{ 
                  background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                  boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                }}
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
