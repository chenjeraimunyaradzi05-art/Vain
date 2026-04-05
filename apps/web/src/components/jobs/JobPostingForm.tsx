'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * JobPostingForm - Create and edit job listings
 * 
 * Features:
 * - Create new job postings
 * - Edit existing job postings
 * - Rich job description editor
 * - Skill requirements
 * - Location and work arrangement
 * - Salary and benefits
 * - Indigenous employer badge support
 */

interface JobPosting {
  id?: string;
  title: string;
  company: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  skills: string[];
  location: string;
  workArrangement: 'onsite' | 'remote' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'casual' | 'internship';
  salaryMin?: number;
  salaryMax?: number;
  salaryType: 'annual' | 'hourly' | 'daily';
  showSalary: boolean;
  benefits: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  industry: string;
  department: string;
  closingDate?: string;
  isIndigenousEmployer: boolean;
  indigenousFocused: boolean;
  culturalSupport: string;
  contactEmail: string;
  applicationUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
}

interface JobPostingFormProps {
  initialData?: Partial<JobPosting>;
  onSubmit: (data: JobPosting) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

// Employment types
const employmentTypes: { value: string; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
  { value: 'internship', label: 'Internship/Traineeship' },
];

// Work arrangements
const workArrangements: { value: string; label: string; icon: string }[] = [
  { value: 'onsite', label: 'On-site', icon: '🏢' },
  { value: 'remote', label: 'Remote', icon: '🏠' },
  { value: 'hybrid', label: 'Hybrid', icon: '🔀' },
];

// Experience levels
const experienceLevels: { value: string; label: string; description: string }[] = [
  { value: 'entry', label: 'Entry Level', description: '0-2 years experience' },
  { value: 'mid', label: 'Mid Level', description: '3-5 years experience' },
  { value: 'senior', label: 'Senior', description: '6-9 years experience' },
  { value: 'lead', label: 'Lead/Manager', description: '10+ years experience' },
  { value: 'executive', label: 'Executive', description: 'C-level/Director' },
];

// Industries
const industries: string[] = [
  'Agriculture & Farming',
  'Arts & Culture',
  'Community Services',
  'Construction & Trades',
  'Education & Training',
  'Environment & Conservation',
  'Government & Public Sector',
  'Healthcare & Medical',
  'Hospitality & Tourism',
  'Information Technology',
  'Legal Services',
  'Manufacturing',
  'Media & Communications',
  'Mining & Resources',
  'Not-for-Profit',
  'Retail',
  'Transport & Logistics',
];

// Common benefits
const commonBenefits: string[] = [
  'Cultural leave',
  'Flexible hours',
  'Work from home',
  'Professional development',
  'Health insurance',
  'Superannuation above 11%',
  'Employee assistance program',
  'Parental leave',
  'Annual leave loading',
  'Salary packaging',
  'Company vehicle',
  'Relocation assistance',
  'Career progression',
  'Mentoring program',
  'Study assistance',
];

// Australian states/territories
const locations: string[] = [
  'Sydney, NSW',
  'Melbourne, VIC',
  'Brisbane, QLD',
  'Perth, WA',
  'Adelaide, SA',
  'Hobart, TAS',
  'Darwin, NT',
  'Canberra, ACT',
  'Gold Coast, QLD',
  'Newcastle, NSW',
  'Cairns, QLD',
  'Alice Springs, NT',
  'Remote Australia',
  'Multiple Locations',
];

// List input component for responsibilities, requirements, etc.
function ListInput({
  label,
  items,
  onChange,
  placeholder,
  maxItems = 10,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  maxItems?: number;
}) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    if (inputValue.trim() && items.length < maxItems) {
      onChange([...items, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2"
          >
            <span className="flex-1 text-sm text-gray-900 dark:text-white">{item}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {items.length < maxItems && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            Add
          </Button>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-500">{items.length}/{maxItems} items</p>
    </div>
  );
}

// Skill tag input
function SkillsInput({
  skills,
  onChange,
  suggestedSkills = [],
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
  suggestedSkills?: string[];
}) {
  const [inputValue, setInputValue] = useState('');

  const addSkill = (skill: string) => {
    if (skill.trim() && !skills.includes(skill.trim())) {
      onChange([...skills, skill.trim()]);
      setInputValue('');
    }
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(inputValue);
    }
  };

  const filteredSuggestions = suggestedSkills.filter(
    (s) => !skills.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Required Skills
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a skill and press Enter"
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      />
      {filteredSuggestions.length > 0 && inputValue && (
        <div className="mt-2 flex flex-wrap gap-1">
          {filteredSuggestions.slice(0, 5).map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSkill(skill)}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200"
            >
              + {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Benefits selector
function BenefitsSelector({
  selectedBenefits,
  onChange,
}: {
  selectedBenefits: string[];
  onChange: (benefits: string[]) => void;
}) {
  const toggleBenefit = (benefit: string) => {
    if (selectedBenefits.includes(benefit)) {
      onChange(selectedBenefits.filter((b) => b !== benefit));
    } else {
      onChange([...selectedBenefits, benefit]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Benefits & Perks
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {commonBenefits.map((benefit) => (
          <button
            key={benefit}
            type="button"
            onClick={() => toggleBenefit(benefit)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              selectedBenefits.includes(benefit)
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            {benefit}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main form component
export function JobPostingForm({
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
}: JobPostingFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<JobPosting>({
    title: initialData?.title || '',
    company: initialData?.company || '',
    description: initialData?.description || '',
    responsibilities: initialData?.responsibilities || [],
    requirements: initialData?.requirements || [],
    niceToHave: initialData?.niceToHave || [],
    skills: initialData?.skills || [],
    location: initialData?.location || '',
    workArrangement: initialData?.workArrangement || 'onsite',
    employmentType: initialData?.employmentType || 'full-time',
    salaryMin: initialData?.salaryMin,
    salaryMax: initialData?.salaryMax,
    salaryType: initialData?.salaryType || 'annual',
    showSalary: initialData?.showSalary ?? true,
    benefits: initialData?.benefits || [],
    experienceLevel: initialData?.experienceLevel || 'mid',
    industry: initialData?.industry || '',
    department: initialData?.department || '',
    closingDate: initialData?.closingDate || '',
    isIndigenousEmployer: initialData?.isIndigenousEmployer || false,
    indigenousFocused: initialData?.indigenousFocused || false,
    culturalSupport: initialData?.culturalSupport || '',
    contactEmail: initialData?.contactEmail || user?.email || '',
    applicationUrl: initialData?.applicationUrl || '',
    status: initialData?.status || 'draft',
  });

  const updateField = <K extends keyof JobPosting>(field: K, value: JobPosting[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Job title is required';
      if (!formData.company.trim()) newErrors.company = 'Company name is required';
      if (!formData.description.trim()) newErrors.description = 'Job description is required';
      if (!formData.location) newErrors.location = 'Location is required';
    }

    if (step === 2) {
      if (formData.responsibilities.length === 0) {
        newErrors.responsibilities = 'Add at least one responsibility';
      }
      if (formData.requirements.length === 0) {
        newErrors.requirements = 'Add at least one requirement';
      }
    }

    if (step === 3) {
      if (!formData.contactEmail.trim()) {
        newErrors.contactEmail = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Invalid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (status: 'draft' | 'active') => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData, status });
    } catch (error) {
      console.error('Failed to submit job posting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Post a Job' : 'Edit Job Posting'}
          </h1>
          <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white ${
                errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Your company name"
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white ${
                errors.company ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.company && <p className="mt-1 text-sm text-red-500">{errors.company}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Provide a detailed description of the role..."
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Location & Work Arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location *
              </label>
              <select
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-white ${
                  errors.location ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Work Arrangement
              </label>
              <div className="flex gap-2">
                {workArrangements.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('workArrangement', value as JobPosting['workArrangement'])}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      formData.workArrangement === value
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Employment Type & Experience Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => updateField('employmentType', e.target.value as JobPosting['employmentType'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {employmentTypes.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => updateField('experienceLevel', e.target.value as JobPosting['experienceLevel'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {experienceLevels.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Industry & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="e.g., Engineering, Marketing"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Requirements */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Requirements & Responsibilities</h2>
          
          <ListInput
            label="Key Responsibilities *"
            items={formData.responsibilities}
            onChange={(items) => updateField('responsibilities', items)}
            placeholder="Add a key responsibility..."
          />
          {errors.responsibilities && (
            <p className="text-sm text-red-500">{errors.responsibilities}</p>
          )}

          <ListInput
            label="Essential Requirements *"
            items={formData.requirements}
            onChange={(items) => updateField('requirements', items)}
            placeholder="Add an essential requirement..."
          />
          {errors.requirements && (
            <p className="text-sm text-red-500">{errors.requirements}</p>
          )}

          <ListInput
            label="Nice to Have"
            items={formData.niceToHave}
            onChange={(items) => updateField('niceToHave', items)}
            placeholder="Add a nice-to-have qualification..."
          />

          <SkillsInput
            skills={formData.skills}
            onChange={(skills) => updateField('skills', skills)}
            suggestedSkills={[
              'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
              'Project Management', 'Communication', 'Leadership', 'Problem Solving',
              'Data Analysis', 'Customer Service', 'Microsoft Office', 'Agile',
            ]}
          />
        </div>
      )}

      {/* Step 3: Compensation & Benefits */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compensation & Benefits</h2>

          {/* Salary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Salary Range
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.showSalary}
                  onChange={(e) => updateField('showSalary', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-600 dark:text-gray-400">Display salary on listing</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum ($)</label>
                <input
                  type="number"
                  value={formData.salaryMin || ''}
                  onChange={(e) => updateField('salaryMin', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 80000"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Maximum ($)</label>
                <input
                  type="number"
                  value={formData.salaryMax || ''}
                  onChange={(e) => updateField('salaryMax', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 120000"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pay Period</label>
                <select
                  value={formData.salaryType}
                  onChange={(e) => updateField('salaryType', e.target.value as JobPosting['salaryType'])}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="annual">Annual</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>
          </div>

          <BenefitsSelector
            selectedBenefits={formData.benefits}
            onChange={(benefits) => updateField('benefits', benefits)}
          />

          {/* Contact & Application */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                placeholder="hr@company.com"
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-white ${
                  errors.contactEmail ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
              />
              {errors.contactEmail && <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                External Application URL
              </label>
              <input
                type="url"
                value={formData.applicationUrl}
                onChange={(e) => updateField('applicationUrl', e.target.value)}
                placeholder="https://company.com/careers/apply"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Closing Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Application Closing Date
            </label>
            <input
              type="date"
              value={formData.closingDate}
              onChange={(e) => updateField('closingDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Step 4: Indigenous Focus & Review */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Indigenous Focus & Review</h2>

          {/* Indigenous Employer Options */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              Indigenous Employment Commitment
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isIndigenousEmployer}
                  onChange={(e) => updateField('isIndigenousEmployer', e.target.checked)}
                  className="rounded border-gray-300 mt-1"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Indigenous-owned or managed business
                  </span>
                  <p className="text-sm text-gray-500">
                    This business is owned or managed by Aboriginal and/or Torres Strait Islander peoples
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.indigenousFocused}
                  onChange={(e) => updateField('indigenousFocused', e.target.checked)}
                  className="rounded border-gray-300 mt-1"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Indigenous-focused role
                  </span>
                  <p className="text-sm text-gray-500">
                    This role is specifically designed for or prioritizes Indigenous candidates
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cultural Support Offered
                </label>
                <textarea
                  value={formData.culturalSupport}
                  onChange={(e) => updateField('culturalSupport', e.target.value)}
                  placeholder="Describe any cultural support or initiatives your company offers..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Job Preview</h3>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{formData.title || 'Job Title'}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{formData.company || 'Company Name'}</p>
                </div>
                {formData.isIndigenousEmployer && (
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                    🤝 Indigenous Employer
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm">
                  {formData.location || 'Location'}
                </span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm">
                  {employmentTypes.find(t => t.value === formData.employmentType)?.label}
                </span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm">
                  {workArrangements.find(w => w.value === formData.workArrangement)?.icon} {workArrangements.find(w => w.value === formData.workArrangement)?.label}
                </span>
                {formData.showSalary && formData.salaryMin && formData.salaryMax && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                    ${formData.salaryMin.toLocaleString()} - ${formData.salaryMax.toLocaleString()} {formData.salaryType}
                  </span>
                )}
              </div>

              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.skills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
                Save as Draft
              </Button>
              <Button onClick={() => handleSubmit('active')} disabled={isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Publish Job'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobPostingForm;
