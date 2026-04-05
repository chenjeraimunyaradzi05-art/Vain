'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * PortfolioBuilder - Create and manage professional portfolio
 * 
 * Features:
 * - Portfolio projects showcase
 * - Drag-and-drop reordering
 * - Multiple media types
 * - Public portfolio page
 * - Analytics and views
 */

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  media: PortfolioMedia[];
  links: PortfolioLink[];
  startDate?: string;
  endDate?: string;
  isOngoing: boolean;
  collaborators?: string[];
  tools: string[];
  order: number;
  isPublished: boolean;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioMedia {
  id: string;
  type: 'image' | 'video' | 'document' | 'embed';
  url: string;
  thumbnail?: string;
  caption?: string;
  order: number;
}

interface PortfolioLink {
  id: string;
  label: string;
  url: string;
  type: 'website' | 'github' | 'demo' | 'presentation' | 'other';
}

interface PortfolioSettings {
  isPublic: boolean;
  customUrl?: string;
  headline?: string;
  bio?: string;
  showContactInfo: boolean;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'list' | 'masonry';
  socialLinks: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
}

interface PortfolioStats {
  totalViews: number;
  uniqueVisitors: number;
  projectViews: { projectId: string; title: string; views: number }[];
  viewsByDay: { date: string; views: number }[];
}

// API functions
const portfolioApi = {
  async getProjects(): Promise<{ projects: PortfolioProject[] }> {
    const res = await fetch('/api/portfolio/projects', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(data: Partial<PortfolioProject>): Promise<PortfolioProject> {
    const res = await fetch('/api/portfolio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async updateProject(id: string, data: Partial<PortfolioProject>): Promise<PortfolioProject> {
    const res = await fetch(`/api/portfolio/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`/api/portfolio/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  async reorderProjects(projectIds: string[]): Promise<void> {
    const res = await fetch('/api/portfolio/projects/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectIds }),
    });
    if (!res.ok) throw new Error('Failed to reorder');
  },

  async uploadMedia(projectId: string, file: File): Promise<PortfolioMedia> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/portfolio/projects/${projectId}/media`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload media');
    return res.json();
  },

  async getSettings(): Promise<PortfolioSettings> {
    const res = await fetch('/api/portfolio/settings', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<PortfolioSettings>): Promise<PortfolioSettings> {
    const res = await fetch('/api/portfolio/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getStats(): Promise<PortfolioStats> {
    const res = await fetch('/api/portfolio/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
};

// Categories
const categories = [
  'Web Development',
  'Mobile App',
  'Design',
  'Data Science',
  'Marketing',
  'Business',
  'Art & Creative',
  'Writing',
  'Music & Audio',
  'Video',
  'Other',
];

// Link types
const linkTypes = [
  { value: 'website', label: 'Website', icon: '🌐' },
  { value: 'github', label: 'GitHub', icon: '💻' },
  { value: 'demo', label: 'Live Demo', icon: '🚀' },
  { value: 'presentation', label: 'Presentation', icon: '📊' },
  { value: 'other', label: 'Other', icon: '🔗' },
];

// Project Card
function ProjectCard({
  project,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  project: PortfolioProject;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
        {project.thumbnail ? (
          <OptimizedImage src={toCloudinaryAutoUrl(project.thumbnail)} alt={project.title || 'Project thumbnail'} width={400} height={225} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            project.isPublished
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {project.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>

        {/* Menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => { onTogglePublish(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {project.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{project.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{project.category}</p>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {project.views}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {project.likes}
          </span>
          <span>{project.media.length} media</span>
        </div>
      </div>
    </div>
  );
}

// Project Editor Modal
function ProjectEditorModal({
  project,
  onClose,
  onSave,
}: {
  project: PortfolioProject | null;
  onClose: () => void;
  onSave: (data: Partial<PortfolioProject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<PortfolioProject>>({
    title: project?.title || '',
    description: project?.description || '',
    category: project?.category || categories[0],
    tags: project?.tags || [],
    tools: project?.tools || [],
    links: project?.links || [],
    isOngoing: project?.isOngoing || false,
    isPublished: project?.isPublished || false,
  });
  const [tagInput, setTagInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [newLink, setNewLink] = useState({ label: '', url: '', type: 'website' as PortfolioLink['type'] });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(d => ({ ...d, tags: [...(d.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(d => ({ ...d, tags: d.tags?.filter(t => t !== tag) }));
  };

  const handleAddTool = () => {
    if (toolInput.trim() && !formData.tools?.includes(toolInput.trim())) {
      setFormData(d => ({ ...d, tools: [...(d.tools || []), toolInput.trim()] }));
      setToolInput('');
    }
  };

  const handleRemoveTool = (tool: string) => {
    setFormData(d => ({ ...d, tools: d.tools?.filter(t => t !== tool) }));
  };

  const handleAddLink = () => {
    if (newLink.label && newLink.url) {
      setFormData(d => ({
        ...d,
        links: [...(d.links || []), { ...newLink, id: Date.now().toString() }],
      }));
      setNewLink({ label: '', url: '', type: 'website' });
    }
  };

  const handleRemoveLink = (linkId: string) => {
    setFormData(d => ({ ...d, links: d.links?.filter(l => l.id !== linkId) }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(d => ({ ...d, title: e.target.value }))}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(d => ({ ...d, description: e.target.value }))}
              placeholder="Describe your project..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(d => ({ ...d, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button type="button" size="sm" onClick={handleAddTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-blue-500 hover:text-blue-700">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tools & Technologies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTool())}
                placeholder="Add a tool..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button type="button" size="sm" onClick={handleAddTool}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tools?.map((tool, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded flex items-center gap-1">
                  {tool}
                  <button onClick={() => handleRemoveTool(tool)} className="text-gray-400 hover:text-gray-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Links
            </label>
            <div className="flex gap-2 mb-2">
              <select
                value={newLink.type}
                onChange={(e) => setNewLink(l => ({ ...l, type: e.target.value as PortfolioLink['type'] }))}
                className="w-28 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {linkTypes.map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.icon} {lt.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={newLink.label}
                onChange={(e) => setNewLink(l => ({ ...l, label: e.target.value }))}
                placeholder="Label"
                className="w-28 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink(l => ({ ...l, url: e.target.value }))}
                placeholder="https://..."
                className="flex-1 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <Button type="button" size="sm" onClick={handleAddLink}>Add</Button>
            </div>
            {formData.links && formData.links.length > 0 && (
              <div className="space-y-2">
                {formData.links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{linkTypes.find(lt => lt.value === link.type)?.icon}</span>
                      <span className="font-medium">{link.label}</span>
                      <span className="text-gray-400 truncate max-w-48">{link.url}</span>
                    </div>
                    <button onClick={() => handleRemoveLink(link.id)} className="text-red-500 hover:text-red-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOngoing}
                onChange={(e) => setFormData(d => ({ ...d, isOngoing: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ongoing Project</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData(d => ({ ...d, isPublished: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Publish to Portfolio</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.title || !formData.description}>
            {isSaving ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Settings Panel
function SettingsPanel({
  settings,
  onSave,
}: {
  settings: PortfolioSettings;
  onSave: (data: Partial<PortfolioSettings>) => void;
}) {
  const [formData, setFormData] = useState<Partial<PortfolioSettings>>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Portfolio Settings</h3>

      <div className="space-y-6">
        {/* Public Toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Public Portfolio</span>
            <p className="text-sm text-gray-500">Make your portfolio visible to everyone</p>
          </div>
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(e) => setFormData(d => ({ ...d, isPublic: e.target.checked }))}
            className="w-5 h-5 rounded border-gray-300"
          />
        </label>

        {/* Custom URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom URL
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">ngurra.com.au/portfolio/</span>
            <input
              type="text"
              value={formData.customUrl || ''}
              onChange={(e) => setFormData(d => ({ ...d, customUrl: e.target.value }))}
              placeholder="your-name"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Headline
          </label>
          <input
            type="text"
            value={formData.headline || ''}
            onChange={(e) => setFormData(d => ({ ...d, headline: e.target.value }))}
            placeholder="Full Stack Developer | Creative Designer"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData(d => ({ ...d, bio: e.target.value }))}
            placeholder="Tell visitors about yourself..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
        </div>

        {/* Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Layout
          </label>
          <div className="flex gap-4">
            {['grid', 'list', 'masonry'].map((layout) => (
              <label key={layout} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.layout === layout}
                  onChange={() => setFormData(d => ({ ...d, layout: layout as PortfolioSettings['layout'] }))}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{layout}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Theme
          </label>
          <div className="flex gap-4">
            {['light', 'dark', 'auto'].map((theme) => (
              <label key={theme} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.theme === theme}
                  onChange={() => setFormData(d => ({ ...d, theme: theme as PortfolioSettings['theme'] }))}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{theme}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Show Contact Info</span>
            <p className="text-sm text-gray-500">Display your email for inquiries</p>
          </div>
          <input
            type="checkbox"
            checked={formData.showContactInfo}
            onChange={(e) => setFormData(d => ({ ...d, showContactInfo: e.target.checked }))}
            className="w-5 h-5 rounded border-gray-300"
          />
        </label>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

// Main Component
export function PortfolioBuilder() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'settings' | 'analytics'>('projects');
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null | 'new'>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsRes, settingsRes, statsRes] = await Promise.all([
        portfolioApi.getProjects(),
        portfolioApi.getSettings(),
        portfolioApi.getStats(),
      ]);
      setProjects(projectsRes.projects);
      setSettings(settingsRes);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async (data: Partial<PortfolioProject>) => {
    try {
      if (editingProject === 'new') {
        await portfolioApi.createProject(data);
      } else if (editingProject) {
        await portfolioApi.updateProject(editingProject.id, data);
      }
      await loadData();
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async (project: PortfolioProject) => {
    if (confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      try {
        await portfolioApi.deleteProject(project.id);
        setProjects(prev => prev.filter(p => p.id !== project.id));
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const handleTogglePublish = async (project: PortfolioProject) => {
    try {
      await portfolioApi.updateProject(project.id, { isPublished: !project.isPublished });
      setProjects(prev =>
        prev.map(p => (p.id === project.id ? { ...p, isPublished: !p.isPublished } : p))
      );
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    }
  };

  const handleSaveSettings = async (data: Partial<PortfolioSettings>) => {
    try {
      const updated = await portfolioApi.updateSettings(data);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save settings:', error);
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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
          <p className="text-gray-500 mt-1">Showcase your work and achievements</p>
        </div>
        <div className="flex gap-3">
          {settings?.isPublic && settings.customUrl && (
            <Button variant="outline" onClick={() => window.open(`/portfolio/${settings.customUrl}`, '_blank')}>
              View Public Portfolio
            </Button>
          )}
          <Button onClick={() => setEditingProject('new')}>
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['projects', 'settings', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'projects' && (
        <div>
          {projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => setEditingProject(project)}
                  onDelete={() => handleDeleteProject(project)}
                  onTogglePublish={() => handleTogglePublish(project)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
              <p className="text-gray-500 mt-2 mb-4">Start building your portfolio by adding your first project</p>
              <Button onClick={() => setEditingProject('new')}>Add Your First Project</Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} />
      )}

      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueVisitors}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Published</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter(p => p.isPublished).length}
              </p>
            </div>
          </div>

          {/* Top Projects */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Projects by Views</h3>
            <div className="space-y-3">
              {stats.projectViews.slice(0, 5).map((pv) => (
                <div key={pv.projectId} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{pv.title}</span>
                  <span className="text-gray-500">{pv.views} views</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Editor Modal */}
      {editingProject && (
        <ProjectEditorModal
          project={editingProject === 'new' ? null : editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
}

export default PortfolioBuilder;
