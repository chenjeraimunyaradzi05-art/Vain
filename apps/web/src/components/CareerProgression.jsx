'use client';

/**
 * Career Progression Component
 * 
 * Career timeline, milestones, and goal tracking
 */

import { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Target,
  TrendingUp,
  Star,
  Award,
  Calendar,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  Clock,
  Briefcase,
  GraduationCap,
  Trophy,
  Flag,
  Edit2,
  Trash2,
  Loader2,
  MapPin,
  ArrowUp,
  Sparkles,
  BookOpen
} from 'lucide-react';

// Goal categories
const GOAL_CATEGORIES = [
  { id: 'skill', label: 'Skill Development', icon: Star, color: 'purple' },
  { id: 'certification', label: 'Certification', icon: Award, color: 'blue' },
  { id: 'promotion', label: 'Promotion', icon: ArrowUp, color: 'green' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'yellow' },
  { id: 'career_change', label: 'Career Change', icon: Briefcase, color: 'rose' },
  { id: 'leadership', label: 'Leadership', icon: Trophy, color: 'orange' }
];

// Milestone types
const MILESTONE_TYPES = {
  job: { icon: Briefcase, color: 'from-blue-600 to-cyan-700', label: 'Job' },
  promotion: { icon: ArrowUp, color: 'from-green-600 to-emerald-700', label: 'Promotion' },
  certification: { icon: Award, color: 'from-purple-600 to-indigo-700', label: 'Certification' },
  education: { icon: GraduationCap, color: 'from-yellow-600 to-orange-700', label: 'Education' },
  award: { icon: Trophy, color: 'from-amber-600 to-yellow-700', label: 'Award' },
  skill: { icon: Star, color: 'from-rose-600 to-pink-700', label: 'Skill' }
};

function TimelineItem({ milestone, isLast }) {
  const type = MILESTONE_TYPES[milestone.type] || MILESTONE_TYPES.job;
  const Icon = type.icon;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-0.5 h-full bg-slate-700" />
      )}
      
      {/* Icon */}
      <div className={`relative z-10 w-10 h-10 rounded-full bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-white">{milestone.title}</h4>
              {milestone.company && (
                <p className="text-sm text-slate-400">{milestone.company}</p>
              )}
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {formatDate(milestone.startDate)}
              {milestone.endDate && ` - ${formatDate(milestone.endDate)}`}
            </span>
          </div>
          
          {milestone.description && (
            <p className="text-sm text-slate-300 mb-3">{milestone.description}</p>
          )}
          
          {milestone.achievements && milestone.achievements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {milestone.achievements.map((achievement, idx) => (
                <span key={idx} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                  {achievement}
                </span>
              ))}
            </div>
          )}
          
          {milestone.location && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              {milestone.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onToggleComplete }) {
  const category = GOAL_CATEGORIES.find(c => c.id === goal.category) || GOAL_CATEGORIES[0];
  const Icon = category.icon;
  
  const progress = goal.progress || 0;
  const isCompleted = goal.status === 'completed';
  
  const getDaysRemaining = () => {
    if (!goal.targetDate) return null;
    const target = new Date(goal.targetDate);
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const daysRemaining = getDaysRemaining();

  return (
    <div className={`bg-slate-800/50 rounded-xl p-5 border ${isCompleted ? 'border-green-800/50' : 'border-slate-700'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-${category.color}-600/20 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${category.color}-400`} />
          </div>
          <div>
            <h4 className={`font-semibold ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
              {goal.title}
            </h4>
            <span className={`text-xs text-${category.color}-400`}>{category.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleComplete(goal.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCompleted 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(goal)}
            className="text-slate-400 hover:text-white p-1"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="text-slate-400 hover:text-red-400 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {goal.description && (
        <p className="text-sm text-slate-400 mb-4">{goal.description}</p>
      )}
      
      {/* Progress bar */}
      {!isCompleted && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-${category.color}-600 to-${category.color}-400 transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        {goal.targetDate && (
          <span className={`flex items-center gap-1 ${
            daysRemaining !== null && daysRemaining < 0 
              ? 'text-red-400' 
              : daysRemaining !== null && daysRemaining < 7 
                ? 'text-yellow-400' 
                : 'text-slate-500'
          }`}>
            <Clock className="w-3 h-3" />
            {daysRemaining !== null && daysRemaining >= 0 
              ? `${daysRemaining} days left` 
              : daysRemaining !== null 
                ? 'Overdue' 
                : 'No deadline'}
          </span>
        )}
        
        {goal.steps && goal.steps.length > 0 && (
          <span className="text-slate-500">
            {goal.steps.filter(s => s.completed).length}/{goal.steps.length} steps
          </span>
        )}
      </div>
    </div>
  );
}

function GoalFormModal({ goal, onSave, onClose }) {
  const [formData, setFormData] = useState(goal || {
    title: '',
    description: '',
    category: 'skill',
    targetDate: '',
    steps: []
  });
  const [saving, setSaving] = useState(false);
  const [newStep, setNewStep] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setFormData({
      ...formData,
      steps: [...(formData.steps || []), { text: newStep, completed: false }]
    });
    setNewStep('');
  };

  const removeStep = (idx) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            {goal ? 'Edit Goal' : 'Create Goal'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              placeholder="e.g., Get Project Management certification"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                    formData.category === cat.id
                      ? `border-${cat.color}-500 bg-${cat.color}-900/20`
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <cat.icon className={`w-5 h-5 text-${cat.color}-400`} />
                  <span className="text-xs text-slate-300">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white resize-none"
              placeholder="What do you want to achieve?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Date</label>
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Steps (optional)</label>
            <div className="space-y-2 mb-2">
              {formData.steps?.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                  <span className="flex-1 text-sm text-slate-300">{step.text}</span>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm"
                placeholder="Add a step..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
              />
              <button
                type="button"
                onClick={addStep}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
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
              disabled={saving || !formData.title.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {goal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CareerPathSuggestions({ suggestions, onSelectPath }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-800/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h4 className="font-semibold text-white">Suggested Career Paths</h4>
          <p className="text-sm text-slate-400">Based on your skills and experience</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((path, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPath(path)}
            className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-white truncate">{path.title}</h5>
              <p className="text-xs text-slate-400 truncate">{path.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function LearningResources({ resources }) {
  if (!resources || resources.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h4 className="font-semibold text-white">Recommended Learning</h4>
          <p className="text-sm text-slate-400">Resources to help you reach your goals</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {resources.map((resource, idx) => (
          <a
            key={idx}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              resource.type === 'course' ? 'bg-blue-600/20 text-blue-400' :
              resource.type === 'certification' ? 'bg-purple-600/20 text-purple-400' :
              'bg-green-600/20 text-green-400'
            }`}>
              {resource.type === 'course' ? <GraduationCap className="w-4 h-4" /> :
               resource.type === 'certification' ? <Award className="w-4 h-4" /> :
               <BookOpen className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-white text-sm truncate">{resource.title}</h5>
              <p className="text-xs text-slate-400">{resource.provider}</p>
            </div>
            {resource.free && (
              <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">Free</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CareerProgression() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [milestones, setMilestones] = useState([]);
  const [goals, setGoals] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [resources, setResources] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Fetch career data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        const [milestonesRes, goalsRes, suggestionsRes] = await Promise.all([
          api('/career-progression/timeline'),
          api('/career-progression/goals'),
          api('/career-progression/suggestions'),
        ]);
        
        if (milestonesRes.ok) {
          setMilestones(milestonesRes.data.milestones || []);
        }
        
        if (goalsRes.ok) {
          setGoals(goalsRes.data.goals || []);
        }
        
        if (suggestionsRes.ok) {
          setSuggestions(suggestionsRes.data.paths || []);
          setResources(suggestionsRes.data.resources || []);
        }
      } catch (error) {
        console.error('Failed to fetch career data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleSaveGoal = async (goalData) => {
    try {
      const isEditing = !!goalData.id;
      const url = isEditing 
        ? `/career-progression/goals/${goalData.id}`
        : '/career-progression/goals';
      
      const { ok, data: savedGoal } = await api(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: goalData,
      });
      
      if (ok) {
        if (isEditing) {
          setGoals(goals.map(g => g.id === savedGoal.id ? savedGoal : g));
        } else {
          setGoals([...goals, savedGoal]);
        }
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setShowGoalModal(false);
      setEditingGoal(null);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await api(`/career-progression/goals/${goalId}`, { method: 'DELETE' });
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleToggleComplete = async (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const newStatus = goal.status === 'completed' ? 'in_progress' : 'completed';
    
    try {
      await api(`/career-progression/goals/${goalId}`, {
        method: 'PUT',
        body: { ...goal, status: newStatus, progress: newStatus === 'completed' ? 100 : goal.progress },
      });
      
      setGoals(goals.map(g => 
        g.id === goalId 
          ? { ...g, status: newStatus, progress: newStatus === 'completed' ? 100 : g.progress }
          : g
      ));
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleSelectPath = (path) => {
    setEditingGoal({
      title: `Advance to ${path.title}`,
      description: path.description,
      category: 'promotion',
      steps: path.steps || []
    });
    setShowGoalModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="bg-slate-900 min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Career Progression</h1>
          <p className="text-slate-400">Track your career journey and plan your next steps</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{milestones.length}</div>
            <div className="text-sm text-slate-400">Milestones</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{activeGoals.length}</div>
            <div className="text-sm text-slate-400">Active Goals</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">{completedGoals.length}</div>
            <div className="text-sm text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {milestones.length > 0 
                ? Math.floor((new Date() - new Date(milestones[milestones.length - 1]?.startDate)) / (1000 * 60 * 60 * 24 * 365.25))
                : 0}
            </div>
            <div className="text-sm text-slate-400">Years Experience</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'timeline' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline
            </span>
            {activeTab === 'timeline' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'goals' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goals
            </span>
            {activeTab === 'goals' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'explore' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Explore
            </span>
            {activeTab === 'explore' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-0">
            {milestones.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/30 rounded-xl">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No milestones yet</h3>
                <p className="text-slate-400 mb-4">Add your work history and achievements to build your timeline</p>
                <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors">
                  Add Milestone
                </button>
              </div>
            ) : (
              milestones.map((milestone, idx) => (
                <TimelineItem
                  key={milestone.id || idx}
                  milestone={milestone}
                  isLast={idx === milestones.length - 1}
                />
              ))
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Your Goals</h3>
              <button
                onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </button>
            </div>

            {activeGoals.length === 0 && completedGoals.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/30 rounded-xl">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No goals yet</h3>
                <p className="text-slate-400 mb-4">Set career goals to track your progress</p>
              </div>
            ) : (
              <>
                {activeGoals.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={(g) => { setEditingGoal(g); setShowGoalModal(true); }}
                        onDelete={handleDeleteGoal}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))}
                  </div>
                )}

                {completedGoals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Completed ({completedGoals.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
                      {completedGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={(g) => { setEditingGoal(g); setShowGoalModal(true); }}
                          onDelete={handleDeleteGoal}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Explore Tab */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <CareerPathSuggestions suggestions={suggestions} onSelectPath={handleSelectPath} />
            <LearningResources resources={resources} />
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalFormModal
          goal={editingGoal}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        />
      )}
    </div>
  );
}
