'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from '../Button';

/**
 * JobPostingEditor - Create and edit job postings
 * 
 * Features:
 * - Rich job posting form
 * - Template support
 * - Preview mode
 * - Indigenous employment features
 */

interface JobPosting {
  id?: string;
  title: string;
  department: string;
  location: string;
  workType: 'onsite' | 'remote' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'casual' | 'internship';
  salary: {
    min: number;
    max: number;
    currency: string;
    frequency: 'annual' | 'hourly';
    showOnPosting: boolean;
  };
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  skills: string[];
  experience: {
    min: number;
    max: number;
  };
  education?: string;
  applicationDeadline?: string;
  startDate?: string;
  isIndigenousPreferred: boolean;
  indigenousInitiatives?: string;
  culturalConsiderations?: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  createdAt?: string;
  publishedAt?: string;
}

interface JobTemplate {
  id: string;
  name: string;
  category: string;
  posting: Partial<JobPosting>;
}

// API functions
const jobsApi = {
  async createJob(data: JobPosting): Promise<JobPosting> {
    const res = await api<JobPosting>('/employer/jobs', {
      method: 'POST',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to create job');
    return res.data;
  },

  async updateJob(id: string, data: JobPosting): Promise<JobPosting> {
    const res = await api<JobPosting>(`/employer/jobs/${id}`, {
      method: 'PUT',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to update job');
    return res.data;
  },

  async getJob(id: string): Promise<JobPosting> {
    const res = await api<JobPosting>(`/employer/jobs/${id}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch job');
    return res.data;
  },

  async getTemplates(): Promise<JobTemplate[]> {
    const res = await api<JobTemplate[]>('/employer/jobs/templates');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch templates');
    return res.data;
  },

  async publishJob(id: string): Promise<void> {
    const res = await api(`/employer/jobs/${id}/publish`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(res.error || 'Failed to publish job');
  },
};

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales',
  'Customer Success', 'Operations', 'Finance', 'Human Resources',
  'Legal', 'Administration', 'Other',
];

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java',
  'AWS', 'Azure', 'Docker', 'Kubernetes', 'SQL', 'MongoDB',
  'Communication', 'Leadership', 'Problem Solving', 'Teamwork',
  'Project Management', 'Agile', 'Customer Service', 'Data Analysis',
];

const COMMON_BENEFITS = [
  'Health Insurance', 'Dental Insurance', 'Vision Insurance',
  'Life Insurance', 'Superannuation', 'Flexible Hours',
  'Remote Work Options', 'Professional Development Budget',
  'Gym Membership', 'Paid Parental Leave', 'Annual Leave',
  'Sick Leave', 'Mental Health Days', 'Employee Assistance Program',
  'Stock Options', 'Performance Bonus', 'Salary Packaging',
];

// List Item Editor
function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  suggestions,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [inputValue, setInputValue] = useState('');

  const addItem = (item: string) => {
    if (item.trim() && !items.includes(item.trim())) {
      onChange([...items, item.trim()]);
    }
    setInputValue('');
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      {/* Items */}
      <div className="space-y-2 mb-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-400">•</span>
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index] = e.target.value;
                onChange(newItems);
              }}
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
            <button
              onClick={() => removeItem(index)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(inputValue))}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
        />
        <Button variant="outline" onClick={() => addItem(inputValue)}>
          Add
        </Button>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions
            .filter(s => !items.includes(s))
            .slice(0, 6)
            .map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addItem(suggestion)}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              >
                + {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// Skill Tag Selector
function SkillSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (skills: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const toggleSkill = (skill: string) => {
    if (selected.includes(skill)) {
      onChange(selected.filter(s => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  };

  const addCustomSkill = () => {
    if (inputValue.trim() && !selected.includes(inputValue.trim())) {
      onChange([...selected, inputValue.trim()]);
    }
    setInputValue('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Required Skills
      </label>
      <div className="flex flex-wrap gap-2 mb-3">
        {COMMON_SKILLS.map((skill) => (
          <button
            key={skill}
            onClick={() => toggleSkill(skill)}
            className={`px-3 py-1 rounded-full text-sm ${
              selected.includes(skill)
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {selected.includes(skill) ? '✓' : '+'} {skill}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
          placeholder="Add custom skill..."
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
        />
        <Button variant="outline" onClick={addCustomSkill}>Add</Button>
      </div>
    </div>
  );
}

// Job Preview
function JobPreview({ job }: { job: JobPosting }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {job.isIndigenousPreferred && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
              🌏 Indigenous Preferred
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm capitalize">
            {job.employmentType}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm capitalize">
            {job.workType}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title || 'Job Title'}</h1>
        <p className="text-gray-500">{job.department} • {job.location}</p>
        
        {job.salary.showOnPosting && (
          <p className="text-lg font-semibold text-green-600 mt-2">
            {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
            <span className="text-sm font-normal text-gray-500"> / {job.salary.frequency}</span>
          </p>
        )}
      </div>

      {job.description && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About the Role</h3>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {job.responsibilities.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Responsibilities</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {job.responsibilities.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {job.requirements.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Requirements</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {job.requirements.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {job.niceToHave.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Nice to Have</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {job.niceToHave.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {job.skills.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {job.benefits.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Benefits</h3>
          <div className="flex flex-wrap gap-2">
            {job.benefits.map((benefit, idx) => (
              <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                ✓ {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      {job.indigenousInitiatives && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
            🌏 Indigenous Employment Initiatives
          </h3>
          <p className="text-amber-700 dark:text-amber-400">{job.indigenousInitiatives}</p>
        </div>
      )}

      {job.culturalConsiderations && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">
            Cultural Considerations
          </h3>
          <p className="text-purple-700 dark:text-purple-400">{job.culturalConsiderations}</p>
        </div>
      )}
    </div>
  );
}

// Main Component
export function JobPostingEditor({
  jobId,
  onSave,
  onPublish,
}: {
  jobId?: string;
  onSave?: (job: JobPosting) => void;
  onPublish?: (job: JobPosting) => void;
}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'details' | 'compensation' | 'indigenous'>('basics');

  const [job, setJob] = useState<JobPosting>({
    title: '',
    department: '',
    location: '',
    workType: 'hybrid',
    employmentType: 'full-time',
    salary: {
      min: 0,
      max: 0,
      currency: 'AUD',
      frequency: 'annual',
      showOnPosting: true,
    },
    description: '',
    responsibilities: [],
    requirements: [],
    niceToHave: [],
    benefits: [],
    skills: [],
    experience: { min: 0, max: 0 },
    isIndigenousPreferred: false,
    status: 'draft',
  });

  useEffect(() => {
    if (jobId) {
      loadJob(jobId);
    }
    loadTemplates();
  }, [jobId]);

  const loadJob = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await jobsApi.getJob(id);
      setJob(data);
    } catch (error) {
      console.error('Failed to load job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await jobsApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSave = async () => {
    try {
      let savedJob: JobPosting;
      if (job.id) {
        savedJob = await jobsApi.updateJob(job.id, job);
      } else {
        savedJob = await jobsApi.createJob(job);
      }
      setJob(savedJob);
      onSave?.(savedJob);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handlePublish = async () => {
    try {
      if (!job.id) {
        const savedJob = await jobsApi.createJob(job);
        await jobsApi.publishJob(savedJob.id!);
        setJob({ ...savedJob, status: 'active' });
        onPublish?.(savedJob);
      } else {
        await jobsApi.publishJob(job.id);
        setJob({ ...job, status: 'active' });
        onPublish?.(job);
      }
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };

  const applyTemplate = (template: JobTemplate) => {
    setJob({ ...job, ...template.posting });
  };

  const updateJob = (updates: Partial<JobPosting>) => {
    setJob({ ...job, ...updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {jobId ? 'Edit Job Posting' : 'Create Job Posting'}
          </h1>
          <p className="text-gray-500 mt-1">
            {job.status === 'draft' ? '📝 Draft' : job.status === 'active' ? '🟢 Active' : job.status}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? '✏️ Edit' : '👁️ Preview'}
          </Button>
          <Button variant="outline" onClick={handleSave}>
            💾 Save Draft
          </Button>
          <Button onClick={handlePublish}>
            🚀 Publish
          </Button>
        </div>
      </div>

      {showPreview ? (
        <JobPreview job={job} />
      ) : (
        <>
          {/* Template Selection */}
          {!jobId && templates.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                Start from a template
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm hover:shadow"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            {(['basics', 'details', 'compensation', 'indigenous'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {activeTab === 'basics' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={job.title}
                      onChange={(e) => updateJob({ title: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department *
                    </label>
                    <select
                      value={job.department}
                      onChange={(e) => updateJob({ department: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    >
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={job.location}
                      onChange={(e) => updateJob({ location: e.target.value })}
                      placeholder="e.g., Sydney, NSW"
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Work Type *
                    </label>
                    <div className="flex gap-3">
                      {(['onsite', 'hybrid', 'remote'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateJob({ workType: type })}
                          className={`flex-1 px-4 py-2 rounded-lg capitalize ${
                            job.workType === type
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                              : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employment Type *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['full-time', 'part-time', 'contract', 'casual', 'internship'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => updateJob({ employmentType: type })}
                        className={`px-4 py-2 rounded-lg capitalize ${
                          job.employmentType === type
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    value={job.description}
                    onChange={(e) => updateJob({ description: e.target.value })}
                    placeholder="Describe the role, team, and what makes this opportunity exciting..."
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <ListEditor
                  label="Responsibilities"
                  items={job.responsibilities}
                  onChange={(items) => updateJob({ responsibilities: items })}
                  placeholder="Add a responsibility..."
                />

                <ListEditor
                  label="Requirements"
                  items={job.requirements}
                  onChange={(items) => updateJob({ requirements: items })}
                  placeholder="Add a requirement..."
                />

                <ListEditor
                  label="Nice to Have"
                  items={job.niceToHave}
                  onChange={(items) => updateJob({ niceToHave: items })}
                  placeholder="Add a nice-to-have..."
                />

                <SkillSelector
                  selected={job.skills}
                  onChange={(skills) => updateJob({ skills })}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Experience (Years)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={job.experience.min}
                        onChange={(e) => updateJob({ experience: { ...job.experience, min: parseInt(e.target.value) || 0 } })}
                        placeholder="Min"
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                      />
                      <span className="py-2">to</span>
                      <input
                        type="number"
                        value={job.experience.max}
                        onChange={(e) => updateJob({ experience: { ...job.experience, max: parseInt(e.target.value) || 0 } })}
                        placeholder="Max"
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Education Level
                    </label>
                    <select
                      value={job.education || ''}
                      onChange={(e) => updateJob({ education: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    >
                      <option value="">Not specified</option>
                      <option value="high-school">High School</option>
                      <option value="certificate">Certificate/Diploma</option>
                      <option value="bachelors">Bachelor's Degree</option>
                      <option value="masters">Master's Degree</option>
                      <option value="phd">PhD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compensation' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Salary Range
                  </label>
                  <div className="flex gap-4 items-center">
                    <select
                      value={job.salary.currency}
                      onChange={(e) => updateJob({ salary: { ...job.salary, currency: e.target.value } })}
                      className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    >
                      <option value="AUD">AUD</option>
                      <option value="USD">USD</option>
                      <option value="NZD">NZD</option>
                    </select>
                    <input
                      type="number"
                      value={job.salary.min || ''}
                      onChange={(e) => updateJob({ salary: { ...job.salary, min: parseInt(e.target.value) || 0 } })}
                      placeholder="Min"
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={job.salary.max || ''}
                      onChange={(e) => updateJob({ salary: { ...job.salary, max: parseInt(e.target.value) || 0 } })}
                      placeholder="Max"
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                    <select
                      value={job.salary.frequency}
                      onChange={(e) => updateJob({ salary: { ...job.salary, frequency: e.target.value as any } })}
                      className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    >
                      <option value="annual">Annual</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      checked={job.salary.showOnPosting}
                      onChange={(e) => updateJob({ salary: { ...job.salary, showOnPosting: e.target.checked } })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show salary on job posting</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Benefits & Perks
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COMMON_BENEFITS.map((benefit) => (
                      <button
                        key={benefit}
                        onClick={() => {
                          const newBenefits = job.benefits.includes(benefit)
                            ? job.benefits.filter(b => b !== benefit)
                            : [...job.benefits, benefit];
                          updateJob({ benefits: newBenefits });
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          job.benefits.includes(benefit)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                        }`}
                      >
                        {job.benefits.includes(benefit) ? '✓' : '+'} {benefit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={job.applicationDeadline || ''}
                      onChange={(e) => updateJob({ applicationDeadline: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={job.startDate || ''}
                      onChange={(e) => updateJob({ startDate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'indigenous' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-amber-800 dark:text-amber-300">
                    🌏 Ngurra Pathways supports Indigenous employment initiatives. 
                    Configure settings to attract and support Indigenous candidates.
                  </p>
                </div>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={job.isIndigenousPreferred}
                    onChange={(e) => updateJob({ isIndigenousPreferred: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Indigenous Preferred Role</p>
                    <p className="text-sm text-gray-500">
                      This role is designated as Indigenous preferred under special measures
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Indigenous Employment Initiatives
                  </label>
                  <textarea
                    value={job.indigenousInitiatives || ''}
                    onChange={(e) => updateJob({ indigenousInitiatives: e.target.value })}
                    placeholder="Describe your organization's Indigenous employment programs, RAPs, or initiatives..."
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cultural Considerations
                  </label>
                  <textarea
                    value={job.culturalConsiderations || ''}
                    onChange={(e) => updateJob({ culturalConsiderations: e.target.value })}
                    placeholder="Describe cultural leave policies, support for cultural obligations, or other considerations..."
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default JobPostingEditor;
