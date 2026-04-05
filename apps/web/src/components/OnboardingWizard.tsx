'use client';

/**
 * Complete Onboarding Wizard
 * 
 * Multi-step onboarding flow for new users with progress tracking,
 * profile completion, and personalized recommendations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Briefcase,
  Heart,
  Bell,
  Upload,
  X,
  Sparkles,
  MapPin,
  Building2,
  GraduationCap,
  Languages,
  Star,
  Target,
  Shield,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface OnboardingData {
  // Step 1: Basic Info
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  profilePhoto?: File | null;
  
  // Step 2: Background
  indigenousStatus: string;
  languages: string[];
  culturalConnections: string[];
  
  // Step 3: Experience
  currentStatus: string;
  yearsExperience: number;
  education: string;
  skills: string[];
  
  // Step 4: Preferences
  jobTypes: string[];
  industries: string[];
  salaryRange: { min: number; max: number };
  remotePreference: string;
  
  // Step 5: Goals
  careerGoals: string[];
  supportNeeded: string[];
  mentorshipInterest: boolean;
  
  // Step 6: Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: string[];
}

const INITIAL_DATA: OnboardingData = {
  firstName: '',
  lastName: '',
  phone: '',
  location: '',
  profilePhoto: null,
  indigenousStatus: '',
  languages: [],
  culturalConnections: [],
  currentStatus: '',
  yearsExperience: 0,
  education: '',
  skills: [],
  jobTypes: [],
  industries: [],
  salaryRange: { min: 40000, max: 80000 },
  remotePreference: 'flexible',
  careerGoals: [],
  supportNeeded: [],
  mentorshipInterest: false,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  notificationTypes: ['jobs', 'applications', 'messages'],
};

const STEPS = [
  { id: 'basic', title: 'About You', icon: User },
  { id: 'background', title: 'Background', icon: Heart },
  { id: 'experience', title: 'Experience', icon: Briefcase },
  { id: 'preferences', title: 'Preferences', icon: Target },
  { id: 'goals', title: 'Goals', icon: Star },
  { id: 'notifications', title: 'Notifications', icon: Bell },
];

const SKILLS_OPTIONS = [
  'Communication', 'Teamwork', 'Problem Solving', 'Leadership',
  'Time Management', 'Customer Service', 'Microsoft Office', 'Data Entry',
  'Project Management', 'Sales', 'Marketing', 'Accounting',
  'Construction', 'Healthcare', 'Hospitality', 'Retail',
  'Driving', 'Forklift', 'First Aid', 'RSA/RSG',
];

const INDUSTRIES_OPTIONS = [
  'Healthcare', 'Education', 'Construction', 'Mining', 'Government',
  'Hospitality', 'Retail', 'Technology', 'Finance', 'Arts & Culture',
  'Social Services', 'Agriculture', 'Transport', 'Manufacturing',
];

const CAREER_GOALS = [
  'Find employment', 'Career change', 'Skill development', 'Higher education',
  'Start a business', 'Leadership role', 'Work-life balance', 'Remote work',
  'Community impact', 'Cultural connection at work',
];

const SUPPORT_TYPES = [
  'Resume writing', 'Interview preparation', 'Job search assistance',
  'Training & certifications', 'Mentorship', 'Career counselling',
  'Financial literacy', 'Transport assistance', 'Childcare support',
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { showToast, setOnboardingComplete } = useUIStore();
  const { user } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Pre-fill with existing user data
  useEffect(() => {
    if (user?.profile) {
      setData(prev => ({
        ...prev,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
      }));
    }
  }, [user]);

  const updateData = useCallback((field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const toggleArrayItem = useCallback((field: keyof OnboardingData, item: string) => {
    setData(prev => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(item)
          ? arr.filter(i => i !== item)
          : [...arr, item],
      };
    });
  }, []);

  const validateStep = useCallback(() => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Basic info
        if (!data.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!data.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!data.location.trim()) newErrors.location = 'Location is required';
        break;
      case 1: // Background
        if (!data.indigenousStatus) newErrors.indigenousStatus = 'Please select an option';
        break;
      case 2: // Experience
        if (!data.currentStatus) newErrors.currentStatus = 'Please select your current status';
        if (data.skills.length === 0) newErrors.skills = 'Please select at least one skill';
        break;
      case 3: // Preferences
        if (data.jobTypes.length === 0) newErrors.jobTypes = 'Please select at least one job type';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, data]);

  const handleNext = () => {
    if (!validateStep()) return;
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateData('profilePhoto', file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Upload photo if present
      let photoUrl = null;
      if (data.profilePhoto) {
        const formData = new FormData();
        formData.append('file', data.profilePhoto);
        const { ok, data: uploadData } = await api<{ url: string }>('/upload/profile-photo', {
          method: 'POST',
          body: formData,
          headers: {}, // Let browser set content-type for FormData
        });
        if (ok) photoUrl = uploadData?.url;
      }

      // Submit profile data
      const { ok } = await api('/profile/onboarding', {
        method: 'POST',
        body: {
          ...data,
          profilePhoto: photoUrl,
        },
      });

      if (ok) {
        setOnboardingComplete(true);
        showToast({
          type: 'success',
          title: 'Welcome!',
          message: 'Your profile is set up. Let\'s find you some opportunities!',
        });
        router.push('/dashboard');
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save your profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Complete Your Profile
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white text-sm"
            >
              Skip for now
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={`flex flex-col items-center gap-1 transition-colors ${
                      isCompleted || isCurrent
                        ? 'text-purple-400'
                        : 'text-slate-600'
                    } ${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-purple-600 text-white' :
                      isCurrent ? 'bg-purple-600/20 border-2 border-purple-600' :
                      'bg-slate-700'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span className="text-xs hidden sm:block">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Let's get to know you</h2>
                <p className="text-slate-400">This helps employers find and connect with you</p>
              </div>

              {/* Profile Photo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                    {photoPreview ? (
                      <OptimizedImage src={toCloudinaryAutoUrl(photoPreview)} alt="Profile photo preview" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-500" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700">
                    <Upload className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={data.firstName}
                    onChange={(e) => updateData('firstName', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white ${
                      errors.firstName ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-sm text-red-400 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={data.lastName}
                    onChange={(e) => updateData('lastName', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white ${
                      errors.lastName ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Smith"
                  />
                  {errors.lastName && <p className="text-sm text-red-400 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="0412 345 678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location *
                </label>
                <input
                  type="text"
                  value={data.location}
                  onChange={(e) => updateData('location', e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white ${
                    errors.location ? 'border-red-500' : 'border-slate-600'
                  }`}
                  placeholder="Sydney, NSW"
                />
                {errors.location && <p className="text-sm text-red-400 mt-1">{errors.location}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Background */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Your Background</h2>
                <p className="text-slate-400">This helps us connect you with culturally safe opportunities</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Do you identify as Aboriginal and/or Torres Strait Islander? *
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'aboriginal', label: 'Aboriginal' },
                    { value: 'torres_strait_islander', label: 'Torres Strait Islander' },
                    { value: 'both', label: 'Both Aboriginal and Torres Strait Islander' },
                    { value: 'no', label: 'No, I do not identify' },
                    { value: 'prefer_not', label: 'Prefer not to say' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                      <input
                        type="radio"
                        name="indigenousStatus"
                        value={option.value}
                        checked={data.indigenousStatus === option.value}
                        onChange={(e) => updateData('indigenousStatus', e.target.value)}
                        className="text-purple-600"
                      />
                      <span className="text-slate-300">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.indigenousStatus && <p className="text-sm text-red-400 mt-2">{errors.indigenousStatus}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Languages className="w-4 h-4 inline mr-1" />
                  Languages spoken
                </label>
                <div className="flex flex-wrap gap-2">
                  {['English', 'Kriol', 'Yolŋu Matha', 'Pitjantjatjara', 'Other First Nations Language', 'Other'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleArrayItem('languages', lang)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        data.languages.includes(lang)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-300 font-medium">Your privacy is protected</p>
                    <p className="text-sm text-slate-400 mt-1">
                      This information helps us find culturally safe employers. It's never shared without your permission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Experience */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Your Experience</h2>
                <p className="text-slate-400">Tell us about your work history and skills</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Current Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'employed', label: 'Currently employed' },
                    { value: 'seeking', label: 'Actively seeking work' },
                    { value: 'studying', label: 'Student' },
                    { value: 'not_seeking', label: 'Not currently seeking' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateData('currentStatus', option.value)}
                      className={`p-3 rounded-lg text-sm text-left transition-colors ${
                        data.currentStatus === option.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.currentStatus && <p className="text-sm text-red-400 mt-2">{errors.currentStatus}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                <select
                  value={data.yearsExperience}
                  onChange={(e) => updateData('yearsExperience', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value={0}>No formal experience</option>
                  <option value={1}>Less than 1 year</option>
                  <option value={2}>1-2 years</option>
                  <option value={5}>3-5 years</option>
                  <option value={10}>5-10 years</option>
                  <option value={15}>10+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <GraduationCap className="w-4 h-4 inline mr-1" />
                  Highest Education
                </label>
                <select
                  value={data.education}
                  onChange={(e) => updateData('education', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select...</option>
                  <option value="year10">Year 10</option>
                  <option value="year12">Year 12</option>
                  <option value="cert2">Certificate II</option>
                  <option value="cert3">Certificate III</option>
                  <option value="cert4">Certificate IV</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="postgrad">Postgraduate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Skills & Abilities *</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS_OPTIONS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleArrayItem('skills', skill)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        data.skills.includes(skill)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {errors.skills && <p className="text-sm text-red-400 mt-2">{errors.skills}</p>}
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Your Preferences</h2>
                <p className="text-slate-400">What kind of work are you looking for?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Job Type *</label>
                <div className="flex flex-wrap gap-2">
                  {['Full-time', 'Part-time', 'Casual', 'Contract', 'Internship'].map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleArrayItem('jobTypes', type)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        data.jobTypes.includes(type)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.jobTypes && <p className="text-sm text-red-400 mt-2">{errors.jobTypes}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Preferred Industries
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES_OPTIONS.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => toggleArrayItem('industries', industry)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        data.industries.includes(industry)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Salary Range (Annual)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="30000"
                      max="200000"
                      step="5000"
                      value={data.salaryRange.min}
                      onChange={(e) => updateData('salaryRange', { ...data.salaryRange, min: Number(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-slate-400 text-sm mt-1">
                      ${data.salaryRange.min.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-slate-500">to</span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="30000"
                      max="200000"
                      step="5000"
                      value={data.salaryRange.max}
                      onChange={(e) => updateData('salaryRange', { ...data.salaryRange, max: Number(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-slate-400 text-sm mt-1">
                      ${data.salaryRange.max.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Remote Work Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'onsite', label: 'On-site only' },
                    { value: 'flexible', label: 'Flexible/Hybrid' },
                    { value: 'remote', label: 'Remote only' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateData('remotePreference', option.value)}
                      className={`p-3 rounded-lg text-sm transition-colors ${
                        data.remotePreference === option.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Goals */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Your Goals</h2>
                <p className="text-slate-400">What are you hoping to achieve?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Career Goals</label>
                <div className="flex flex-wrap gap-2">
                  {CAREER_GOALS.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleArrayItem('careerGoals', goal)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        data.careerGoals.includes(goal)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">What support would help you?</label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_TYPES.map((support) => (
                    <button
                      key={support}
                      onClick={() => toggleArrayItem('supportNeeded', support)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        data.supportNeeded.includes(support)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {support}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.mentorshipInterest}
                    onChange={(e) => updateData('mentorshipInterest', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <div>
                    <p className="font-medium text-white">I'm interested in mentorship</p>
                    <p className="text-sm text-slate-400">Connect with experienced mentors in your industry</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 6: Notifications */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Stay in the Loop</h2>
                <p className="text-slate-400">How would you like to receive updates?</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-slate-400">Receive updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.emailNotifications}
                    onChange={(e) => updateData('emailNotifications', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-white">SMS Notifications</p>
                    <p className="text-sm text-slate-400">Get text messages for urgent updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.smsNotifications}
                    onChange={(e) => updateData('smsNotifications', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-white">Push Notifications</p>
                    <p className="text-sm text-slate-400">Browser and app notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.pushNotifications}
                    onChange={(e) => updateData('pushNotifications', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Notify me about:</label>
                <div className="space-y-2">
                  {[
                    { value: 'jobs', label: 'New job matches' },
                    { value: 'applications', label: 'Application updates' },
                    { value: 'messages', label: 'New messages' },
                    { value: 'mentorship', label: 'Mentorship opportunities' },
                    { value: 'events', label: 'Events and training' },
                  ].map((type) => (
                    <label key={type.value} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.notificationTypes.includes(type.value)}
                        onChange={() => toggleArrayItem('notificationTypes', type.value)}
                        className="rounded text-purple-600"
                      />
                      <span className="text-slate-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length - 1 && currentStep > 0 && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  Complete Setup
                  <Check className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
