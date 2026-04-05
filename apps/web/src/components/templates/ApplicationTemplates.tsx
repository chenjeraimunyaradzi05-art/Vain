'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * ApplicationTemplates - Reusable application templates and snippets
 * 
 * Features:
 * - Create and manage reusable content templates
 * - Quick answers for common application questions
 * - Auto-fill capabilities
 * - Smart suggestions based on job requirements
 */

interface ApplicationTemplate {
  id: string;
  title: string;
  category: 'answer' | 'snippet' | 'full-response' | 'summary';
  content: string;
  tags: string[];
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

interface QuestionCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: ApplicationTemplate[];
}

interface SmartSuggestion {
  questionType: string;
  suggestedTemplates: ApplicationTemplate[];
  confidence: number;
}

// API functions
const templatesApi = {
  async getTemplates(): Promise<{ templates: ApplicationTemplate[] }> {
    const res = await fetch('/api/application-templates', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  async getTemplate(id: string): Promise<ApplicationTemplate> {
    const res = await fetch(`/api/application-templates/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch template');
    return res.json();
  },

  async createTemplate(data: Partial<ApplicationTemplate>): Promise<ApplicationTemplate> {
    const res = await fetch('/api/application-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create template');
    return res.json();
  },

  async updateTemplate(id: string, data: Partial<ApplicationTemplate>): Promise<ApplicationTemplate> {
    const res = await fetch(`/api/application-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update template');
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`/api/application-templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete template');
  },

  async toggleFavorite(id: string): Promise<void> {
    const res = await fetch(`/api/application-templates/${id}/favorite`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to toggle favorite');
  },

  async getSuggestions(question: string): Promise<{ suggestions: SmartSuggestion[] }> {
    const res = await fetch(`/api/application-templates/suggest?question=${encodeURIComponent(question)}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to get suggestions');
    return res.json();
  },

  async getCategories(): Promise<{ categories: QuestionCategory[] }> {
    const res = await fetch('/api/application-templates/categories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async recordUsage(id: string): Promise<void> {
    const res = await fetch(`/api/application-templates/${id}/use`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to record usage');
  },
};

// Default categories
const defaultCategories: QuestionCategory[] = [
  {
    id: 'about-me',
    name: 'About Me',
    icon: '👤',
    description: 'Personal introductions and background',
    templates: [],
  },
  {
    id: 'experience',
    name: 'Experience',
    icon: '💼',
    description: 'Work history and achievements',
    templates: [],
  },
  {
    id: 'skills',
    name: 'Skills & Abilities',
    icon: '🎯',
    description: 'Technical and soft skills',
    templates: [],
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    icon: '🧠',
    description: 'STAR method responses',
    templates: [],
  },
  {
    id: 'motivation',
    name: 'Motivation',
    icon: '🔥',
    description: 'Why you want the job',
    templates: [],
  },
  {
    id: 'culture',
    name: 'Culture Fit',
    icon: '🤝',
    description: 'Values and work style',
    templates: [],
  },
  {
    id: 'salary',
    name: 'Salary & Benefits',
    icon: '💰',
    description: 'Compensation discussions',
    templates: [],
  },
  {
    id: 'closing',
    name: 'Closing',
    icon: '✅',
    description: 'Questions and follow-ups',
    templates: [],
  },
];

// Category config for display
const categoryConfig = {
  answer: { label: 'Quick Answer', color: 'bg-blue-100 text-blue-700' },
  snippet: { label: 'Snippet', color: 'bg-purple-100 text-purple-700' },
  'full-response': { label: 'Full Response', color: 'bg-green-100 text-green-700' },
  summary: { label: 'Summary', color: 'bg-orange-100 text-orange-700' },
};

// Template Card Component
function TemplateCard({
  template,
  onEdit,
  onDelete,
  onCopy,
  onToggleFavorite,
}: {
  template: ApplicationTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onToggleFavorite: () => void;
}) {
  const preview = template.content.substring(0, 150) + (template.content.length > 150 ? '...' : '');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{template.title}</h3>
            <button
              onClick={onToggleFavorite}
              className={`flex-shrink-0 ${template.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
            >
              <svg className="w-5 h-5" fill={template.isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${categoryConfig[template.category].color}`}>
            {categoryConfig[template.category].label}
          </span>
        </div>
      </div>

      {/* Preview */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{preview}</p>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 4 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Usage Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>Used {template.usageCount} times</span>
        {template.lastUsed && (
          <span>Last: {new Date(template.lastUsed).toLocaleDateString('en-AU')}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onCopy} className="flex-1">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </Button>
        <button
          onClick={onEdit}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Add/Edit Template Modal
function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: ApplicationTemplate | null;
  onClose: () => void;
  onSave: (data: Partial<ApplicationTemplate>) => void;
}) {
  const [title, setTitle] = useState(template?.title || '');
  const [category, setCategory] = useState<ApplicationTemplate['category']>(template?.category || 'answer');
  const [content, setContent] = useState(template?.content || '');
  const [tags, setTags] = useState<string[]>(template?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!title || !content) return;
    onSave({ title, category, content, tags });
  };

  // Common question prompts
  const questionPrompts = [
    { label: 'Tell me about yourself', tag: 'about-me' },
    { label: 'Why do you want this job?', tag: 'motivation' },
    { label: 'What are your strengths?', tag: 'skills' },
    { label: 'Where do you see yourself in 5 years?', tag: 'goals' },
    { label: 'Describe a challenging situation', tag: 'behavioral' },
    { label: 'Why should we hire you?', tag: 'closing' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., My career background summary"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Quick Question Buttons */}
          {!template && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Common Questions (click to set title)
              </label>
              <div className="flex flex-wrap gap-2">
                {questionPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => {
                      setTitle(prompt.label);
                      if (!tags.includes(prompt.tag)) {
                        setTags([...tags, prompt.tag]);
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.entries(categoryConfig) as [ApplicationTemplate['category'], { label: string; color: string }][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    category === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Write your template content here. You can use placeholders like [Company Name], [Job Title], [Year], etc."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
              <span>{content.split(/\s+/).filter(w => w).length} words</span>
              <span>{content.length} characters</span>
            </div>
          </div>

          {/* Placeholders Guide */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Available Placeholders</h4>
            <div className="flex flex-wrap gap-2">
              {['[Company Name]', '[Job Title]', '[Year]', '[Role]', '[Industry]', '[Location]'].map((placeholder) => (
                <button
                  key={placeholder}
                  onClick={() => setContent(prev => prev + ' ' + placeholder)}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs font-mono rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1" disabled={!title || !content}>
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Smart Suggestion Component
function SmartSuggestionBar({
  onGetSuggestions,
}: {
  onGetSuggestions: (question: string) => void;
}) {
  const [question, setQuestion] = useState('');

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white mb-8">
      <h2 className="text-xl font-semibold mb-2">✨ Smart Template Finder</h2>
      <p className="text-purple-100 mb-4">
        Paste an application question and we'll find matching templates
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Tell me about a time you led a team..."
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
        />
        <Button
          onClick={() => question && onGetSuggestions(question)}
          className="bg-white text-purple-600 hover:bg-purple-50"
        >
          Find Templates
        </Button>
      </div>
    </div>
  );
}

// Main Component
export function ApplicationTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ApplicationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ApplicationTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { templates } = await templatesApi.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Get unique tags
  const allTags = [...new Set(templates.flatMap(t => t.tags))].sort();

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (showFavoritesOnly && !template.isFavorite) return false;
    if (categoryFilter && template.category !== categoryFilter) return false;
    if (tagFilter && !template.tags.includes(tagFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.title.toLowerCase().includes(query) ||
        template.content.toLowerCase().includes(query) ||
        template.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleSave = async (data: Partial<ApplicationTemplate>) => {
    try {
      if (editingTemplate) {
        const updated = await templatesApi.updateTemplate(editingTemplate.id, data);
        setTemplates(templates.map(t => t.id === updated.id ? updated : t));
        setEditingTemplate(null);
      } else {
        const created = await templatesApi.createTemplate(data);
        setTemplates([created, ...templates]);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await templatesApi.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleCopy = async (template: ApplicationTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      await templatesApi.recordUsage(template.id);
      setTemplates(templates.map(t => 
        t.id === template.id 
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t
      ));
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleToggleFavorite = async (template: ApplicationTemplate) => {
    try {
      await templatesApi.toggleFavorite(template.id);
      setTemplates(templates.map(t => 
        t.id === template.id ? { ...t, isFavorite: !t.isFavorite } : t
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleGetSuggestions = async (question: string) => {
    try {
      // Filter matching templates based on question keywords
      // For now, filter by keywords in question
      const keywords = question.toLowerCase().split(' ');
      const filtered = templates.filter(t => 
        keywords.some(k => t.title.toLowerCase().includes(k) || t.content.toLowerCase().includes(k))
      );
      // Could show in a modal or highlight results
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Application Templates</h1>
          <p className="text-gray-500 mt-1">Reusable answers for job applications</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Template
        </Button>
      </div>

      {/* Smart Suggestion Bar */}
      <SmartSuggestionBar onGetSuggestions={handleGetSuggestions} />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{templates.length}</div>
          <div className="text-sm text-gray-500">Templates</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{templates.filter(t => t.isFavorite).length}</div>
          <div className="text-sm text-gray-500">Favorites</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{templates.reduce((acc, t) => acc + t.usageCount, 0)}</div>
          <div className="text-sm text-gray-500">Total Uses</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{allTags.length}</div>
          <div className="text-sm text-gray-500">Tags</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Types</option>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            showFavoritesOnly
              ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
              : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          ⭐ Favorites
        </button>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => handleDelete(template.id)}
              onCopy={() => handleCopy(template)}
              onToggleFavorite={() => handleToggleFavorite(template)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {templates.length > 0 ? 'No matching templates' : 'No templates yet'}
          </h3>
          <p className="text-gray-500 mt-2 mb-6">
            {templates.length > 0 
              ? 'Try adjusting your filters' 
              : 'Create templates to speed up your job applications'}
          </p>
          {templates.length === 0 && (
            <Button onClick={() => setShowModal(true)}>Create Template</Button>
          )}
        </div>
      )}

      {/* Quick Start Templates */}
      {templates.length === 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Start: Common Questions
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {defaultCategories.slice(0, 4).map((category) => (
              <button
                key={category.id}
                onClick={() => setShowModal(true)}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-left hover:border-blue-300 transition-colors"
              >
                <span className="text-2xl">{category.icon}</span>
                <h3 className="font-medium text-gray-900 dark:text-white mt-2">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {(showModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Copy Toast */}
      {copiedId && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
}

export default ApplicationTemplates;
