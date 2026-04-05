'use client';

/**
 * Career Milestones Component
 * Track career progression, achievements, and goals
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import {
  Trophy,
  Target,
  Star,
  CheckCircle,
  Circle,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Flag
} from 'lucide-react';

const API_URL = API_BASE;

// Milestone categories
const MILESTONE_TYPES = {
  job: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Employment' },
  education: { icon: GraduationCap, color: 'text-green-400', bg: 'bg-green-900/30', label: 'Education' },
  certification: { icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Certification' },
  skill: { icon: Star, color: 'text-purple-400', bg: 'bg-purple-900/30', label: 'Skill' },
  achievement: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-900/30', label: 'Achievement' },
  goal: { icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-900/30', label: 'Goal' },
};

// Mock milestones for demo
const MOCK_MILESTONES = [
  {
    id: '1',
    type: 'job',
    title: 'Started role at ABC Corporation',
    description: 'Began as Junior Developer in the technology team',
    date: '2024-01-15',
    completed: true,
  },
  {
    id: '2',
    type: 'certification',
    title: 'Completed First Aid Certificate',
    description: 'HLTAID011 - Provide First Aid',
    date: '2024-02-20',
    completed: true,
  },
  {
    id: '3',
    type: 'education',
    title: 'Enrolled in Certificate III',
    description: 'Certificate III in Information Technology',
    date: '2024-03-01',
    completed: true,
  },
  {
    id: '4',
    type: 'skill',
    title: 'Learned React Framework',
    description: 'Completed online course and built first project',
    date: '2024-04-10',
    completed: true,
  },
  {
    id: '5',
    type: 'goal',
    title: 'Complete Certificate III',
    description: 'Finish all units by end of year',
    date: '2024-12-31',
    completed: false,
  },
  {
    id: '6',
    type: 'goal',
    title: 'Get promoted to Mid-level Developer',
    description: 'Demonstrate skills and take on more responsibility',
    date: '2025-06-01',
    completed: false,
  },
];

function MilestoneCard({ milestone, onEdit, onDelete, onToggle }) {
  const type = MILESTONE_TYPES[milestone.type] || MILESTONE_TYPES.achievement;
  const TypeIcon = type.icon;
  const date = new Date(milestone.date);
  const isPast = date < new Date();
  const isGoal = milestone.type === 'goal';

  return (
    <div className={`relative pl-8 pb-8 ${milestone.completed ? '' : 'opacity-80'}`}>
      {/* Timeline line */}
      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-700" />
      
      {/* Timeline dot */}
      <button
        onClick={() => onToggle(milestone.id)}
        className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          milestone.completed
            ? 'bg-green-600 text-white'
            : isGoal
            ? 'bg-slate-700 text-slate-400 hover:bg-purple-600 hover:text-white'
            : 'bg-slate-700 text-slate-400'
        }`}
      >
        {milestone.completed ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      {/* Content */}
      <div className={`bg-slate-800/50 border rounded-xl p-4 ml-4 ${
        milestone.completed ? 'border-slate-700/50' : 'border-purple-700/30'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${type.bg} flex-shrink-0`}>
            <TypeIcon className={`w-5 h-5 ${type.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className={`font-semibold ${milestone.completed ? 'text-white' : 'text-purple-400'}`}>
                  {milestone.title}
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded ${type.bg} ${type.color}`}>
                  {type.label}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(milestone)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(milestone.id)}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {milestone.description && (
              <p className="text-sm text-slate-400 mt-2">
                {milestone.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {date.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {isGoal && !milestone.completed && (
                <span className="text-purple-400">
                  • {isPast ? 'Overdue' : 'Upcoming'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMilestoneModal({ isOpen, onClose, onSave, editingMilestone }) {
  const [formData, setFormData] = useState({
    type: 'achievement',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    completed: false,
  });

  useEffect(() => {
    if (editingMilestone) {
      setFormData({
        type: editingMilestone.type,
        title: editingMilestone.title,
        description: editingMilestone.description || '',
        date: editingMilestone.date,
        completed: editingMilestone.completed,
      });
    } else {
      setFormData({
        type: 'achievement',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        completed: false,
      });
    }
  }, [editingMilestone]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: editingMilestone?.id || Date.now().toString(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
            >
              {Object.entries(MILESTONE_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
              placeholder="e.g., Completed first project"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
              required
            />
          </div>

          {/* Completed */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.completed}
              onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-600"
            />
            <span className="text-sm text-slate-300">Mark as completed</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
            >
              {editingMilestone ? 'Save Changes' : 'Add Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgressStats({ milestones }) {
  const completed = milestones.filter(m => m.completed).length;
  const goals = milestones.filter(m => m.type === 'goal' && !m.completed).length;
  const thisYear = milestones.filter(m => {
    const date = new Date(m.date);
    return date.getFullYear() === new Date().getFullYear() && m.completed;
  }).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
        <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{completed}</div>
        <div className="text-xs text-slate-400">Completed</div>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
        <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{goals}</div>
        <div className="text-xs text-slate-400">Active Goals</div>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
        <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{thisYear}</div>
        <div className="text-xs text-slate-400">This Year</div>
      </div>
    </div>
  );
}

export default function CareerMilestones({ compact = false }) {
  const { token } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const fetchMilestones = useCallback(async () => {
    try {
      // In production, fetch from API
      // const res = await fetch(`${API_URL}/milestones`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // const data = await res.json();
      
      // Using mock data for now
      setMilestones(MOCK_MILESTONES);
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleSave = (milestone) => {
    if (editingMilestone) {
      setMilestones(prev => prev.map(m => m.id === milestone.id ? milestone : m));
    } else {
      setMilestones(prev => [...prev, milestone]);
    }
    setEditingMilestone(null);
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      setMilestones(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleToggle = (id) => {
    setMilestones(prev => prev.map(m => 
      m.id === id ? { ...m, completed: !m.completed } : m
    ));
  };

  // Sort milestones: incomplete goals first, then by date
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.date) - new Date(a.date);
  });

  const incompleteMilestones = sortedMilestones.filter(m => !m.completed);
  const completedMilestones = sortedMilestones.filter(m => m.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Compact mode for dashboard preview
  if (compact) {
    const recentMilestones = sortedMilestones.slice(0, 3);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{completedMilestones.length}</div>
            <div className="text-xs text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{incompleteMilestones.length}</div>
            <div className="text-xs text-slate-400">Goals</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{milestones.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
        </div>
        {recentMilestones.length > 0 ? (
          <div className="space-y-2">
            {recentMilestones.map(m => {
              const typeConfig = MILESTONE_TYPES[m.type] || MILESTONE_TYPES.achievement;
              const TypeIcon = typeConfig.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className={`p-1.5 rounded ${typeConfig.bg}`}>
                    <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="text-xs text-slate-400">{new Date(m.date).toLocaleDateString()}</div>
                  </div>
                  {m.completed && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">No milestones yet. Start tracking your career journey!</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-purple-400" />
            Career Milestones
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Track your career journey and achievements
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMilestone(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Milestone
        </button>
      </div>

      {/* Stats */}
      <ProgressStats milestones={milestones} />

      {/* Goals & Upcoming */}
      {incompleteMilestones.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Goals & Upcoming
          </h3>
          <div className="space-y-0">
            {incompleteMilestones.map(milestone => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedMilestones.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-lg font-semibold text-white mb-4 hover:text-purple-400 transition-colors"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            Completed ({completedMilestones.length})
            {showCompleted ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showCompleted && (
            <div className="space-y-0">
              {completedMilestones.map(milestone => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {milestones.length === 0 && (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Start Tracking Your Journey
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Add milestones to track your career progress, achievements, and goals.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Milestone
          </button>
        </div>
      )}

      {/* Modal */}
      <AddMilestoneModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMilestone(null);
        }}
        onSave={handleSave}
        editingMilestone={editingMilestone}
      />
    </div>
  );
}
