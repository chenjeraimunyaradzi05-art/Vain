'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * ResumeBuilder - Create and manage professional resumes
 * 
 * Features:
 * - Multiple resume versions
 * - Template selection
 * - Section management
 * - PDF export
 * - ATS optimization
 * - Skills matching
 */

interface Resume {
  id: string;
  name: string;
  template: string;
  isDefault: boolean;
  lastModified: string;
  sections: ResumeSection[];
  completionScore: number;
  atsScore?: number;
}

interface ResumeSection {
  id: string;
  type: 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'projects' | 'languages' | 'interests' | 'references' | 'custom';
  title: string;
  isEnabled: boolean;
  order: number;
  content: any;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  portfolio?: string;
  photo?: string;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  highlights: string[];
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  gpa?: string;
  honors?: string[];
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

interface ResumeTemplate {
  id: string;
  name: string;
  preview: string;
  category: 'professional' | 'creative' | 'minimal' | 'modern';
  isPremium: boolean;
}

// API functions
const resumeApi = {
  async getResumes(): Promise<{ resumes: Resume[] }> {
    const res = await fetch('/api/resumes', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch resumes');
    return res.json();
  },

  async getResume(id: string): Promise<Resume> {
    const res = await fetch(`/api/resumes/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch resume');
    return res.json();
  },

  async createResume(data: { name: string; template: string }): Promise<Resume> {
    const res = await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create resume');
    return res.json();
  },

  async updateResume(id: string, data: Partial<Resume>): Promise<Resume> {
    const res = await fetch(`/api/resumes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update resume');
    return res.json();
  },

  async updateSection(resumeId: string, sectionId: string, content: any): Promise<void> {
    const res = await fetch(`/api/resumes/${resumeId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to update section');
  },

  async deleteResume(id: string): Promise<void> {
    const res = await fetch(`/api/resumes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete resume');
  },

  async duplicateResume(id: string): Promise<Resume> {
    const res = await fetch(`/api/resumes/${id}/duplicate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to duplicate resume');
    return res.json();
  },

  async exportPDF(id: string): Promise<Blob> {
    const res = await fetch(`/api/resumes/${id}/export/pdf`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to export PDF');
    return res.blob();
  },

  async getTemplates(): Promise<{ templates: ResumeTemplate[] }> {
    const res = await fetch('/api/resumes/templates', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  async analyzeATS(id: string, jobDescription: string): Promise<{ score: number; suggestions: string[] }> {
    const res = await fetch(`/api/resumes/${id}/analyze-ats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jobDescription }),
    });
    if (!res.ok) throw new Error('Failed to analyze');
    return res.json();
  },
};

// Templates
const defaultTemplates: ResumeTemplate[] = [
  { id: 'classic', name: 'Classic', preview: '/templates/classic.png', category: 'professional', isPremium: false },
  { id: 'modern', name: 'Modern', preview: '/templates/modern.png', category: 'modern', isPremium: false },
  { id: 'minimal', name: 'Minimal', preview: '/templates/minimal.png', category: 'minimal', isPremium: false },
  { id: 'creative', name: 'Creative', preview: '/templates/creative.png', category: 'creative', isPremium: true },
];

// Default sections
const defaultSections: ResumeSection[] = [
  { id: 'personal', type: 'personal', title: 'Personal Information', isEnabled: true, order: 0, content: {} },
  { id: 'summary', type: 'summary', title: 'Professional Summary', isEnabled: true, order: 1, content: '' },
  { id: 'experience', type: 'experience', title: 'Work Experience', isEnabled: true, order: 2, content: [] },
  { id: 'education', type: 'education', title: 'Education', isEnabled: true, order: 3, content: [] },
  { id: 'skills', type: 'skills', title: 'Skills', isEnabled: true, order: 4, content: [] },
  { id: 'certifications', type: 'certifications', title: 'Certifications', isEnabled: false, order: 5, content: [] },
  { id: 'projects', type: 'projects', title: 'Projects', isEnabled: false, order: 6, content: [] },
];

// Skill levels
const skillLevels = [
  { value: 'beginner', label: 'Beginner', percent: 25 },
  { value: 'intermediate', label: 'Intermediate', percent: 50 },
  { value: 'advanced', label: 'Advanced', percent: 75 },
  { value: 'expert', label: 'Expert', percent: 100 },
];

// Resume Card
function ResumeCard({
  resume,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: {
  resume: Resume;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Preview */}
      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-900 relative p-4">
        <div className="w-full h-full bg-white rounded shadow-sm border border-gray-200 p-2 text-[6px] leading-tight text-gray-400">
          <div className="h-2 w-1/2 bg-gray-200 rounded mb-1" />
          <div className="h-1 w-1/3 bg-gray-100 rounded mb-2" />
          <div className="space-y-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-1 bg-gray-100 rounded" style={{ width: `${100 - i * 10}%` }} />
            ))}
          </div>
        </div>

        {/* Default Badge */}
        {resume.isDefault && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              Default
            </span>
          </div>
        )}

        {/* Menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-600 dark:text-gray-400"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Edit
              </button>
              <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Duplicate
              </button>
              {!resume.isDefault && (
                <button onClick={() => { onSetDefault(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Set as Default
                </button>
              )}
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white">{resume.name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Last modified {new Date(resume.lastModified).toLocaleDateString('en-AU')}
        </p>

        {/* Completion */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Completion</span>
            <span className="text-gray-700 dark:text-gray-300">{resume.completionScore}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                resume.completionScore >= 80 ? 'bg-green-500' :
                resume.completionScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${resume.completionScore}%` }}
            />
          </div>
        </div>

        <Button size="sm" className="w-full mt-4" onClick={onEdit}>
          Edit Resume
        </Button>
      </div>
    </div>
  );
}

// Section Editor Components
function PersonalInfoEditor({
  data,
  onChange,
}: {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
        <input
          type="text"
          value={data.firstName || ''}
          onChange={(e) => onChange({ ...data, firstName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
        <input
          type="text"
          value={data.lastName || ''}
          onChange={(e) => onChange({ ...data, lastName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={data.email || ''}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
        <input
          type="tel"
          value={data.phone || ''}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
        <input
          type="text"
          value={data.location || ''}
          onChange={(e) => onChange({ ...data, location: e.target.value })}
          placeholder="City, State/Country"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn (optional)</label>
        <input
          type="url"
          value={data.linkedIn || ''}
          onChange={(e) => onChange({ ...data, linkedIn: e.target.value })}
          placeholder="https://linkedin.com/in/..."
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portfolio (optional)</label>
        <input
          type="url"
          value={data.portfolio || ''}
          onChange={(e) => onChange({ ...data, portfolio: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
}

function SummaryEditor({
  data,
  onChange,
}: {
  data: string;
  onChange: (data: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Write a 2-3 sentence summary highlighting your professional background and career goals.
      </p>
      <textarea
        value={data || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Results-driven professional with..."
        rows={4}
        maxLength={500}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{(data || '').length}/500</p>
    </div>
  );
}

function ExperienceEditor({
  data,
  onChange,
}: {
  data: Experience[];
  onChange: (data: Experience[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      isCurrent: false,
      description: '',
      highlights: [],
    };
    onChange([...data, newExp]);
    setEditingId(newExp.id);
  };

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    onChange(data.map(exp => exp.id === id ? { ...exp, ...updates } : exp));
  };

  const removeExperience = (id: string) => {
    onChange(data.filter(exp => exp.id !== id));
  };

  const addHighlight = (id: string) => {
    const exp = data.find(e => e.id === id);
    if (exp) {
      updateExperience(id, { highlights: [...exp.highlights, ''] });
    }
  };

  return (
    <div className="space-y-4">
      {data.map((exp) => (
        <div key={exp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {editingId === exp.id ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={exp.location}
                    onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                    <input
                      type="month"
                      value={exp.startDate}
                      onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  {!exp.isCurrent && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <input
                        type="month"
                        value={exp.endDate || ''}
                        onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exp.isCurrent}
                  onChange={(e) => updateExperience(exp.id, { isCurrent: e.target.checked, endDate: undefined })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">I currently work here</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Achievements</label>
                {exp.highlights.map((highlight, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...exp.highlights];
                        newHighlights[i] = e.target.value;
                        updateExperience(exp.id, { highlights: newHighlights });
                      }}
                      placeholder="Achieved X by doing Y resulting in Z"
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const newHighlights = exp.highlights.filter((_, idx) => idx !== i);
                        updateExperience(exp.id, { highlights: newHighlights });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addHighlight(exp.id)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add Achievement
                </button>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => removeExperience(exp.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
                <Button size="sm" onClick={() => setEditingId(null)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between cursor-pointer" onClick={() => setEditingId(exp.id)}>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{exp.position || 'Untitled Position'}</h4>
                <p className="text-sm text-gray-500">{exp.company} · {exp.location}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" className="w-full" onClick={addExperience}>
        + Add Experience
      </Button>
    </div>
  );
}

function SkillsEditor({
  data,
  onChange,
}: {
  data: Skill[];
  onChange: (data: Skill[]) => void;
}) {
  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate' as Skill['level'] });

  const addSkill = () => {
    if (newSkill.name.trim()) {
      onChange([...data, { ...newSkill, name: newSkill.name.trim() }]);
      setNewSkill({ name: '', level: 'intermediate' });
    }
  };

  const removeSkill = (name: string) => {
    onChange(data.filter(s => s.name !== name));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newSkill.name}
          onChange={(e) => setNewSkill(s => ({ ...s, name: e.target.value }))}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          placeholder="Add a skill..."
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <select
          value={newSkill.level}
          onChange={(e) => setNewSkill(s => ({ ...s, level: e.target.value as Skill['level'] }))}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {skillLevels.map((sl) => (
            <option key={sl.value} value={sl.value}>{sl.label}</option>
          ))}
        </select>
        <Button onClick={addSkill}>Add</Button>
      </div>

      <div className="space-y-2">
        {data.map((skill, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="flex-1 text-gray-900 dark:text-white">{skill.name}</span>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${skillLevels.find(sl => sl.value === skill.level)?.percent || 50}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-20">{skillLevels.find(sl => sl.value === skill.level)?.label}</span>
            <button onClick={() => removeSkill(skill.name)} className="text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resume Editor
function ResumeEditor({
  resume,
  onClose,
  onSave,
}: {
  resume: Resume;
  onClose: () => void;
  onSave: (resume: Resume) => void;
}) {
  const [sections, setSections] = useState<ResumeSection[]>(resume.sections);
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id);
  const [isSaving, setIsSaving] = useState(false);

  const updateSectionContent = (sectionId: string, content: any) => {
    setSections(prev =>
      prev.map(s => s.id === sectionId ? { ...s, content } : s)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...resume, sections });
    } finally {
      setIsSaving(false);
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{resume.name}</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Preview</Button>
          <Button variant="outline">Download PDF</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Sections */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">SECTIONS</h3>
            <div className="space-y-1">
              {sections.filter(s => s.isEnabled).map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {currentSection && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  {currentSection.title}
                </h2>

                {currentSection.type === 'personal' && (
                  <PersonalInfoEditor
                    data={currentSection.content || {}}
                    onChange={(data) => updateSectionContent(currentSection.id, data)}
                  />
                )}

                {currentSection.type === 'summary' && (
                  <SummaryEditor
                    data={currentSection.content || ''}
                    onChange={(data) => updateSectionContent(currentSection.id, data)}
                  />
                )}

                {currentSection.type === 'experience' && (
                  <ExperienceEditor
                    data={currentSection.content || []}
                    onChange={(data) => updateSectionContent(currentSection.id, data)}
                  />
                )}

                {currentSection.type === 'skills' && (
                  <SkillsEditor
                    data={currentSection.content || []}
                    onChange={(data) => updateSectionContent(currentSection.id, data)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ResumeBuilder() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [templates, setTemplates] = useState<ResumeTemplate[]>(defaultTemplates);
  const [isLoading, setIsLoading] = useState(true);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('classic');

  const loadResumes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { resumes } = await resumeApi.getResumes();
      setResumes(resumes);
    } catch (error) {
      console.error('Failed to load resumes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleCreateResume = async () => {
    if (!newResumeName.trim()) return;
    try {
      const newResume = await resumeApi.createResume({
        name: newResumeName,
        template: selectedTemplate,
      });
      setResumes(prev => [...prev, newResume]);
      setShowNewModal(false);
      setNewResumeName('');
      setEditingResume(newResume);
    } catch (error) {
      console.error('Failed to create resume:', error);
    }
  };

  const handleDuplicateResume = async (resume: Resume) => {
    try {
      const duplicated = await resumeApi.duplicateResume(resume.id);
      setResumes(prev => [...prev, duplicated]);
    } catch (error) {
      console.error('Failed to duplicate:', error);
    }
  };

  const handleDeleteResume = async (resume: Resume) => {
    if (confirm(`Delete "${resume.name}"? This cannot be undone.`)) {
      try {
        await resumeApi.deleteResume(resume.id);
        setResumes(prev => prev.filter(r => r.id !== resume.id));
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const handleSetDefault = async (resume: Resume) => {
    try {
      await resumeApi.updateResume(resume.id, { isDefault: true });
      setResumes(prev =>
        prev.map(r => ({ ...r, isDefault: r.id === resume.id }))
      );
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleSaveResume = async (resume: Resume) => {
    try {
      await resumeApi.updateResume(resume.id, resume);
      setResumes(prev => prev.map(r => r.id === resume.id ? resume : r));
      setEditingResume(null);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  if (editingResume) {
    return (
      <ResumeEditor
        resume={editingResume}
        onClose={() => setEditingResume(null)}
        onSave={handleSaveResume}
      />
    );
  }

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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resume Builder</h1>
          <p className="text-gray-500 mt-1">Create ATS-optimized resumes</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Resume
        </Button>
      </div>

      {/* Resumes Grid */}
      {resumes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onEdit={() => setEditingResume(resume)}
              onDuplicate={() => handleDuplicateResume(resume)}
              onDelete={() => handleDeleteResume(resume)}
              onSetDefault={() => handleSetDefault(resume)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No resumes yet</h3>
          <p className="text-gray-500 mt-2 mb-4">Create your first professional resume</p>
          <Button onClick={() => setShowNewModal(true)}>Create Resume</Button>
        </div>
      )}

      {/* New Resume Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Resume</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resume Name
                </label>
                <input
                  type="text"
                  value={newResumeName}
                  onChange={(e) => setNewResumeName(e.target.value)}
                  placeholder="e.g., Tech Resume, General Resume"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative p-2 border-2 rounded-lg transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-blue-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded" />
                      <p className="text-xs text-center mt-1">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateResume} disabled={!newResumeName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeBuilder;
