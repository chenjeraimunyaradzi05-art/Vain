'use client';

/**
 * Career Portfolio Builder Component
 * 
 * Features:
 * - Portfolio template selection
 * - Project showcase management
 * - Media gallery
 * - Public sharing settings
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Layout,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Copy,
  Check,
  Image,
  Video,
  FileText,
  ExternalLink,
  Settings,
  ChevronRight,
  Loader2,
  Briefcase,
  Calendar,
  Tag,
  Globe,
  Lock,
  Palette,
  Upload,
  X,
  Star,
  BarChart3
} from 'lucide-react';

// Template configurations
const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, minimalist design with focus on content',
    preview: '/templates/modern-preview.png',
    colors: ['#1e293b', '#8b5cf6', '#f8fafc']
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold colors and dynamic layouts for creative fields',
    preview: '/templates/creative-preview.png',
    colors: ['#ec4899', '#f97316', '#fef3c7']
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional corporate style for business roles',
    preview: '/templates/professional-preview.png',
    colors: ['#0f172a', '#3b82f6', '#ffffff']
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean with maximum whitespace',
    preview: '/templates/minimal-preview.png',
    colors: ['#18181b', '#71717a', '#fafafa']
  },
  {
    id: 'indigenous',
    name: 'Indigenous',
    description: 'Celebrates First Nations art and culture',
    preview: '/templates/indigenous-preview.png',
    colors: ['#78350f', '#d97706', '#fef3c7']
  }
];

const PROJECT_CATEGORIES = [
  { id: 'work', label: 'Work Experience', icon: Briefcase },
  { id: 'personal', label: 'Personal Projects', icon: Star },
  { id: 'volunteer', label: 'Volunteer Work', icon: Star },
  { id: 'academic', label: 'Academic', icon: FileText },
  { id: 'cultural', label: 'Cultural', icon: Star }
];

function TemplateCard({ template, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? 'border-purple-500 bg-purple-900/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Color preview */}
      <div className="flex gap-1 mb-3">
        {template.colors.map((color, idx) => (
          <div
            key={idx}
            className="w-6 h-6 rounded-full border border-slate-600"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      
      <h4 className="font-semibold text-white mb-1">{template.name}</h4>
      <p className="text-sm text-slate-400">{template.description}</p>
    </button>
  );
}

function ProjectCard({ project, onEdit, onDelete, onHighlight }) {
  const CategoryIcon = PROJECT_CATEGORIES.find(c => c.id === project.category)?.icon || Briefcase;
  
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
          <CategoryIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onHighlight(project.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              project.isHighlighted
                ? 'bg-yellow-900/50 text-yellow-400'
                : 'bg-slate-700/50 text-slate-400 hover:text-yellow-400'
            }`}
            title={project.isHighlighted ? 'Remove highlight' : 'Highlight project'}
          >
            <Star className="w-4 h-4" fill={project.isHighlighted ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 bg-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 bg-slate-700/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <h4 className="font-semibold text-white mb-1">{project.title}</h4>
      {project.role && (
        <p className="text-sm text-purple-400 mb-2">{project.role}</p>
      )}
      <p className="text-sm text-slate-400 line-clamp-2 mb-3">{project.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {project.skills?.slice(0, 3).map((skill, idx) => (
          <span key={idx} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
            {skill}
          </span>
        ))}
        {project.skills?.length > 3 && (
          <span className="text-xs text-slate-500">+{project.skills.length - 3} more</span>
        )}
      </div>
      
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {project.startDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(project.startDate).getFullYear()}
            {project.endDate && ` - ${new Date(project.endDate).getFullYear()}`}
            {project.isCurrent && ' - Present'}
          </span>
        )}
        {project.projectUrl && (
          <a
            href={project.projectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        )}
      </div>
    </div>
  );
}

function ProjectFormModal({ isOpen, onClose, onSave, project }) {
  const [formData, setFormData] = useState({
    title: '',
    role: '',
    description: '',
    category: 'work',
    startDate: '',
    endDate: '',
    isCurrent: false,
    projectUrl: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        startDate: project.startDate?.split('T')[0] || '',
        endDate: project.endDate?.split('T')[0] || '',
        skills: project.skills || []
      });
    } else {
      setFormData({
        title: '',
        role: '',
        description: '',
        category: 'work',
        startDate: '',
        endDate: '',
        isCurrent: false,
        projectUrl: '',
        skills: []
      });
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            {project ? 'Edit Project' : 'Add Project'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Role
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                placeholder="e.g., Lead Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                {PROJECT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={formData.isCurrent}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={formData.isCurrent}
              onChange={(e) => setFormData(prev => ({ ...prev, isCurrent: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700"
            />
            Currently working on this
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project URL
            </label>
            <input
              type="url"
              value={formData.projectUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, projectUrl: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Skills Used
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                placeholder="Add a skill"
              />
              <button
                type="button"
                onClick={addSkill}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 bg-slate-700 text-slate-300 px-2 py-1 rounded text-sm"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CareerPortfolio() {
  const { user, isAuthenticated } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const { ok, data } = await api('/portfolio');
      
      if (ok) {
        setPortfolio(data.portfolio);
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTemplateChange = async (templateId) => {
    try {
      await api('/portfolio/template', {
        method: 'POST',
        body: { templateId }
      });
      setPortfolio(prev => ({ ...prev, template: templateId }));
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await api(`/portfolio/projects/${editingProject.id}`, {
          method: 'PATCH',
          body: projectData
        });
      } else {
        await api('/portfolio/projects', {
          method: 'POST',
          body: projectData
        });
      }
      await fetchData();
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await api(`/portfolio/projects/${projectId}`, {
        method: 'DELETE'
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleHighlightProject = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      await api(`/portfolio/projects/${projectId}`, {
        method: 'PATCH',
        body: { isHighlighted: !project.isHighlighted }
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleTogglePublic = async () => {
    try {
      await api('/portfolio', {
        method: 'PATCH',
        body: { isPublic: !portfolio?.isPublic }
      });
      setPortfolio(prev => ({ ...prev, isPublic: !prev?.isPublic }));
    } catch (error) {
      console.error('Failed to update portfolio:', error);
    }
  };

  const copyShareLink = () => {
    if (portfolio?.slug) {
      navigator.clipboard.writeText(`${window.location.origin}/portfolio/${portfolio.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs = [
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'templates', label: 'Templates', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Career Portfolio</h2>
          <p className="text-slate-400">Showcase your work and achievements</p>
        </div>
        
        <div className="flex items-center gap-3">
          {portfolio?.slug && (
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{portfolio.slug}</span>
              <button
                onClick={copyShareLink}
                className="text-purple-400 hover:text-purple-300"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
          
          <button
            onClick={handleTogglePublic}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              portfolio?.isPublic
                ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {portfolio?.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {portfolio?.isPublic ? 'Public' : 'Private'}
          </button>
          
          {portfolio?.isPublic && portfolio?.slug && (
            <a
              href={`/portfolio/${portfolio.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      {portfolio && (
        <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{projects.length}</p>
            <p className="text-sm text-slate-400">Projects</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{portfolio.viewCount || 0}</p>
            <p className="text-sm text-slate-400">Views</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-white capitalize">{portfolio.template || 'modern'}</p>
            <p className="text-sm text-slate-400">Template</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Your Projects</h3>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No projects yet</h4>
                <p className="text-slate-400 mb-4">Add your first project to showcase your work</p>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setProjectModalOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={(p) => {
                      setEditingProject(p);
                      setProjectModalOpen(true);
                    }}
                    onDelete={handleDeleteProject}
                    onHighlight={handleHighlightProject}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={portfolio?.template === template.id}
                  onSelect={handleTemplateChange}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Portfolio Title
              </label>
              <input
                type="text"
                defaultValue={portfolio?.title}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                placeholder="My Portfolio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tagline
              </label>
              <input
                type="text"
                defaultValue={portfolio?.tagline}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                placeholder="Full-Stack Developer & Problem Solver"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bio
              </label>
              <textarea
                defaultValue={portfolio?.bio}
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none"
                placeholder="Tell visitors about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Custom URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/</span>
                <input
                  type="text"
                  defaultValue={portfolio?.slug}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  placeholder="your-name"
                />
              </div>
            </div>

            <div className="pt-4">
              <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Modal */}
      <ProjectFormModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        project={editingProject}
      />
    </div>
  );
}
