'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * CoverLetterBuilder - Create and manage cover letters
 * 
 * Features:
 * - Create cover letters from templates
 * - AI-powered content suggestions
 * - Customize for specific jobs
 * - Export as PDF/DOCX
 */

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  jobTitle?: string;
  companyName?: string;
  template: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'professional' | 'creative' | 'minimal' | 'modern';
  structure: {
    opening: string;
    body: string[];
    closing: string;
  };
}

interface ContentSuggestion {
  type: 'opening' | 'achievement' | 'skill' | 'closing';
  text: string;
}

// API functions
const coverLetterApi = {
  async getCoverLetters(): Promise<{ letters: CoverLetter[] }> {
    const res = await fetch('/api/cover-letters', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch letters');
    return res.json();
  },

  async getCoverLetter(id: string): Promise<CoverLetter> {
    const res = await fetch(`/api/cover-letters/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch letter');
    return res.json();
  },

  async createCoverLetter(data: Partial<CoverLetter>): Promise<CoverLetter> {
    const res = await fetch('/api/cover-letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create letter');
    return res.json();
  },

  async updateCoverLetter(id: string, data: Partial<CoverLetter>): Promise<CoverLetter> {
    const res = await fetch(`/api/cover-letters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update letter');
    return res.json();
  },

  async deleteCoverLetter(id: string): Promise<void> {
    const res = await fetch(`/api/cover-letters/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete letter');
  },

  async duplicateCoverLetter(id: string): Promise<CoverLetter> {
    const res = await fetch(`/api/cover-letters/${id}/duplicate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to duplicate letter');
    return res.json();
  },

  async getTemplates(): Promise<{ templates: CoverLetterTemplate[] }> {
    const res = await fetch('/api/cover-letters/templates', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  async getSuggestions(params: {
    jobTitle?: string;
    companyName?: string;
    section?: string;
  }): Promise<{ suggestions: ContentSuggestion[] }> {
    const searchParams = new URLSearchParams();
    if (params.jobTitle) searchParams.set('jobTitle', params.jobTitle);
    if (params.companyName) searchParams.set('companyName', params.companyName);
    if (params.section) searchParams.set('section', params.section);

    const res = await fetch(`/api/cover-letters/suggestions?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    return res.json();
  },

  async exportCoverLetter(id: string, format: 'pdf' | 'docx'): Promise<Blob> {
    const res = await fetch(`/api/cover-letters/${id}/export?format=${format}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to export letter');
    return res.blob();
  },
};

// Cover Letter Templates
const defaultTemplates: CoverLetterTemplate[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Classic and formal style for traditional industries',
    category: 'professional',
    preview: 'Dear Hiring Manager,\n\nI am writing to express my interest...',
    structure: {
      opening: 'Dear [Hiring Manager],\n\nI am writing to express my sincere interest in the [Job Title] position at [Company Name]. With my background in [Field] and proven track record of [Achievement], I am confident in my ability to contribute to your team.',
      body: [
        'In my current role at [Current Company], I have [Specific Achievement with metrics]. This experience has equipped me with the skills necessary to excel in this position.',
        'I am particularly drawn to [Company Name] because of [Specific Reason]. Your commitment to [Company Value/Mission] aligns perfectly with my professional values.',
      ],
      closing: 'I would welcome the opportunity to discuss how my skills and experience can benefit [Company Name]. Thank you for considering my application.\n\nSincerely,\n[Your Name]',
    },
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Stand out with a unique and engaging approach',
    category: 'creative',
    preview: 'What do great design, coffee, and [Company] have in common?...',
    structure: {
      opening: "What do [Industry Passion], innovation, and [Company Name] have in common? They all inspire me to do my best work every day.\n\nMy journey to becoming a [Job Title] started with [Personal Story], and today, I'm thrilled to bring that passion to your team.",
      body: [
        "At [Current Company], I didn't just [Job Function]—I transformed it. By [Specific Innovation], I achieved [Impressive Result]. But what really drives me is the opportunity to [Creative Contribution].",
        "I've followed [Company Name]'s work on [Recent Project/Initiative], and I'm amazed by [Specific Detail]. I'd love to contribute my [Unique Skill] to help you achieve [Company Goal].",
      ],
      closing: "Let's create something amazing together. I'd love to chat about how my creative approach and proven results can help [Company Name] reach new heights.\n\nExcitedly,\n[Your Name]",
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and concise for fast-paced environments',
    category: 'minimal',
    preview: "Hi,\n\nI'm interested in the [Position]...",
    structure: {
      opening: "Hi,\n\nI'm excited about the [Job Title] role at [Company Name].",
      body: [
        '• [Key Skill]: [Brief Achievement]\n• [Key Skill]: [Brief Achievement]\n• [Key Skill]: [Brief Achievement]',
        'What draws me to [Company Name]: [One Compelling Reason].',
      ],
      closing: "Let's talk.\n\n[Your Name]\n[Phone] | [Email] | [LinkedIn]",
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary style for tech and startup roles',
    category: 'modern',
    preview: "Hey team! I'm [Name], and I'd love to join...",
    structure: {
      opening: "Hey [Team/Hiring Manager],\n\nI'm [Your Name], and I'm genuinely excited about the [Job Title] opportunity at [Company Name]. After learning about your work on [Recent Initiative], I knew I had to reach out.",
      body: [
        "Here's what I bring to the table:\n\n🚀 [Achievement with Impact]\n💡 [Innovative Solution You Implemented]\n📈 [Measurable Result]",
        "I've been following [Company Name] since [Timeframe/Event], and I'm particularly impressed by [Specific Initiative]. I'd love to contribute to [Goal] by leveraging my experience in [Relevant Skill].",
      ],
      closing: "I'd love to grab a virtual coffee and chat about how I can help [Company Name] [Achieve Goal]. Looking forward to connecting!\n\nBest,\n[Your Name]",
    },
  },
];

// Letter Card Component
function LetterCard({
  letter,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: {
  letter: CoverLetter;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const preview = letter.content.substring(0, 150) + (letter.content.length > 150 ? '...' : '');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{letter.title}</h3>
              {letter.isDefault && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Default
                </span>
              )}
            </div>
            {letter.jobTitle && letter.companyName && (
              <p className="text-sm text-gray-500">
                {letter.jobTitle} at {letter.companyName}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // More options menu
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
          {preview}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span>Updated {new Date(letter.updatedAt).toLocaleDateString('en-AU')}</span>
          <span className="capitalize">{letter.template} template</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={onEdit} className="flex-1">Edit</Button>
          <button
            onClick={onDuplicate}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Duplicate"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {!letter.isDefault && (
            <button
              onClick={onSetDefault}
              className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
              title="Set as default"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: CoverLetterTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const categoryColors = {
    professional: 'bg-blue-100 text-blue-700',
    creative: 'bg-purple-100 text-purple-700',
    minimal: 'bg-gray-100 text-gray-700',
    modern: 'bg-green-100 text-green-700',
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${categoryColors[template.category]}`}>
          {template.category}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{template.description}</p>
      <div className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 rounded p-2 line-clamp-2">
        {template.preview}
      </div>
    </button>
  );
}

// Editor Component
function CoverLetterEditor({
  letter,
  templates,
  onSave,
  onCancel,
  onExport,
}: {
  letter: CoverLetter | null;
  templates: CoverLetterTemplate[];
  onSave: (data: Partial<CoverLetter>) => void;
  onCancel: () => void;
  onExport: (format: 'pdf' | 'docx') => void;
}) {
  const [title, setTitle] = useState(letter?.title || 'My Cover Letter');
  const [jobTitle, setJobTitle] = useState(letter?.jobTitle || '');
  const [companyName, setCompanyName] = useState(letter?.companyName || '');
  const [selectedTemplate, setSelectedTemplate] = useState(letter?.template || 'professional');
  const [content, setContent] = useState(letter?.content || '');
  const [showTemplates, setShowTemplates] = useState(!letter);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load template content when template changes
  useEffect(() => {
    if (!letter && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate) || defaultTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        const fullContent = `${template.structure.opening}\n\n${template.structure.body.join('\n\n')}\n\n${template.structure.closing}`;
        setContent(fullContent);
      }
    }
  }, [selectedTemplate, letter, templates]);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!jobTitle && !companyName) return;
    try {
      const { suggestions } = await coverLetterApi.getSuggestions({ jobTitle, companyName });
      setSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, [jobTitle, companyName]);

  const insertSuggestion = (text: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + text + content.substring(end);
      setContent(newContent);
    } else {
      setContent(prev => prev + '\n\n' + text);
    }
    setShowSuggestions(false);
  };

  const handleSave = () => {
    onSave({
      title,
      jobTitle,
      companyName,
      template: selectedTemplate,
      content,
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Letter Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Atlassian"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template
              </label>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between"
              >
                <span className="capitalize">{selectedTemplate}</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Templates Selection */}
        {showTemplates && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Choose a Template</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(templates.length > 0 ? templates : defaultTemplates).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => {
                    setSelectedTemplate(template.id);
                    setShowTemplates(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content Editor */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Letter Content</h3>
            <Button variant="outline" onClick={fetchSuggestions} className="text-sm">
              ✨ Get AI Suggestions
            </Button>
          </div>
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            placeholder="Start writing your cover letter..."
          />
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{content.split(/\s+/).filter(w => w).length} words</span>
            <span>{content.length} characters</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} className="flex-1">
            {letter ? 'Save Changes' : 'Create Cover Letter'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {letter && (
            <>
              <Button variant="outline" onClick={() => onExport('pdf')}>
                📄 PDF
              </Button>
              <Button variant="outline" onClick={() => onExport('docx')}>
                📝 Word
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* AI Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">✨ Suggestions</h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => insertSuggestion(suggestion.text)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 capitalize">{suggestion.type}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Writing Tips */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">💡 Writing Tips</h3>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Keep it to one page (300-400 words)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Research the company and personalize
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Highlight relevant achievements
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Use keywords from the job description
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              End with a clear call to action
            </li>
          </ul>
        </div>

        {/* Placeholders Guide */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📝 Placeholders</h3>
          <p className="text-sm text-gray-500 mb-3">Replace these placeholders with your information:</p>
          <div className="space-y-2 text-sm">
            {[
              '[Your Name]',
              '[Job Title]',
              '[Company Name]',
              '[Hiring Manager]',
              '[Current Company]',
              '[Achievement]',
              '[Specific Reason]',
            ].map((placeholder) => (
              <div
                key={placeholder}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono text-xs"
              >
                {placeholder}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CoverLetterBuilder() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLetter, setEditingLetter] = useState<CoverLetter | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lettersRes, templatesRes] = await Promise.all([
        coverLetterApi.getCoverLetters(),
        coverLetterApi.getTemplates(),
      ]);
      setLetters(lettersRes.letters);
      setTemplates(templatesRes.templates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (data: Partial<CoverLetter>) => {
    try {
      if (editingLetter) {
        const updated = await coverLetterApi.updateCoverLetter(editingLetter.id, data);
        setLetters(letters.map(l => l.id === updated.id ? updated : l));
      } else {
        const created = await coverLetterApi.createCoverLetter(data);
        setLetters([created, ...letters]);
      }
      setIsEditing(false);
      setEditingLetter(null);
    } catch (error) {
      console.error('Failed to save letter:', error);
    }
  };

  const handleDuplicate = async (letter: CoverLetter) => {
    try {
      const duplicated = await coverLetterApi.duplicateCoverLetter(letter.id);
      setLetters([duplicated, ...letters]);
    } catch (error) {
      console.error('Failed to duplicate letter:', error);
    }
  };

  const handleDelete = async (letterId: string) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    try {
      await coverLetterApi.deleteCoverLetter(letterId);
      setLetters(letters.filter(l => l.id !== letterId));
    } catch (error) {
      console.error('Failed to delete letter:', error);
    }
  };

  const handleSetDefault = async (letter: CoverLetter) => {
    try {
      await coverLetterApi.updateCoverLetter(letter.id, { isDefault: true });
      setLetters(letters.map(l => ({ ...l, isDefault: l.id === letter.id })));
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!editingLetter) return;
    try {
      const blob = await coverLetterApi.exportCoverLetter(editingLetter.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editingLetter.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Editing Mode
  if (isEditing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setIsEditing(false);
            setEditingLetter(null);
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Letters
        </button>

        <CoverLetterEditor
          letter={editingLetter}
          templates={templates}
          onSave={handleSave}
          onCancel={() => {
            setIsEditing(false);
            setEditingLetter(null);
          }}
          onExport={handleExport}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cover Letters</h1>
          <p className="text-gray-500 mt-1">Create personalized cover letters for your applications</p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Letter
        </Button>
      </div>

      {/* Letters Grid */}
      {letters.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {letters.map((letter) => (
            <LetterCard
              key={letter.id}
              letter={letter}
              onEdit={() => {
                setEditingLetter(letter);
                setIsEditing(true);
              }}
              onDuplicate={() => handleDuplicate(letter)}
              onDelete={() => handleDelete(letter.id)}
              onSetDefault={() => handleSetDefault(letter)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">✉️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No cover letters yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Create your first cover letter to get started</p>
          <Button onClick={() => setIsEditing(true)}>Create Cover Letter</Button>
        </div>
      )}

      {/* Templates Preview */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Available Templates</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(templates.length > 0 ? templates : defaultTemplates).map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => {
                setEditingLetter(null);
                setIsEditing(true);
              }}
            >
              <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoverLetterBuilder;
