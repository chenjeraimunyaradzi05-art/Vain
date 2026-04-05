'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * WellnessDashboard - Wellness and mental health support hub
 * 
 * Features:
 * - Daily mood tracking
 * - Wellness resources
 * - Mindfulness exercises
 * - Support services directory
 * - Wellness goals
 * - Community support groups
 */

interface MoodEntry {
  id: string;
  mood: number; // 1-5
  note?: string;
  tags: string[];
  createdAt: string;
}

interface WellnessResource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'audio' | 'exercise';
  duration?: number;
  imageUrl?: string;
  url: string;
  category: string;
}

interface MindfulnessExercise {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: 'breathing' | 'meditation' | 'body-scan' | 'visualization';
  audioUrl?: string;
  steps: string[];
}

interface SupportService {
  id: string;
  name: string;
  description: string;
  phone?: string;
  website?: string;
  hours?: string;
  isEmergency: boolean;
  categories: string[];
}

interface WellnessGoal {
  id: string;
  title: string;
  description?: string;
  targetDays: number;
  completedDays: number;
  streak: number;
  isActive: boolean;
  lastCompleted?: string;
}

// API functions
const wellnessApi = {
  async getMoodHistory(days?: number): Promise<{ entries: MoodEntry[] }> {
    const res = await fetch(`/api/wellness/mood?days=${days || 30}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch mood history');
    return res.json();
  },

  async logMood(data: { mood: number; note?: string; tags?: string[] }): Promise<MoodEntry> {
    const res = await fetch('/api/wellness/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log mood');
    return res.json();
  },

  async getResources(category?: string): Promise<{ resources: WellnessResource[] }> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`/api/wellness/resources${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async getExercises(): Promise<{ exercises: MindfulnessExercise[] }> {
    const res = await fetch('/api/wellness/exercises', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch exercises');
    return res.json();
  },

  async getSupportServices(): Promise<{ services: SupportService[] }> {
    const res = await fetch('/api/wellness/support', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },

  async getGoals(): Promise<{ goals: WellnessGoal[] }> {
    const res = await fetch('/api/wellness/goals', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },

  async completeGoal(goalId: string): Promise<void> {
    const res = await fetch(`/api/wellness/goals/${goalId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to complete goal');
  },

  async createGoal(data: { title: string; description?: string; targetDays: number }): Promise<WellnessGoal> {
    const res = await fetch('/api/wellness/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },
};

// Mood emoji map
const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];
const moodColors = ['#EF4444', '#F59E0B', '#6B7280', '#10B981', '#22C55E'];

// Mood tags
const moodTags = [
  'Work', 'Family', 'Health', 'Social', 'Sleep', 'Exercise', 
  'Stress', 'Gratitude', 'Creativity', 'Learning', 'Nature', 'Relaxation'
];

// Mood Tracker Component
function MoodTracker({
  todayMood,
  moodHistory,
  onLogMood,
}: {
  todayMood: MoodEntry | null;
  moodHistory: MoodEntry[];
  onLogMood: (mood: number, note?: string, tags?: string[]) => void;
}) {
  const [selectedMood, setSelectedMood] = useState<number | null>(todayMood?.mood ?? null);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(!todayMood);

  const handleSubmit = () => {
    if (selectedMood !== null) {
      onLogMood(selectedMood, note || undefined, selectedTags.length > 0 ? selectedTags : undefined);
      setShowForm(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Calculate weekly average
  const weeklyMoods = moodHistory.filter(entry => {
    const date = new Date(entry.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  });
  const weeklyAverage = weeklyMoods.length > 0
    ? weeklyMoods.reduce((acc, e) => acc + e.mood, 0) / weeklyMoods.length
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mood Tracker</h2>
        {todayMood && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Update
          </button>
        )}
      </div>

      {showForm ? (
        <div className="space-y-4">
          {/* Mood Selection */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">How are you feeling today?</p>
            <div className="flex justify-between">
              {moodEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedMood(index + 1)}
                  className={`w-14 h-14 text-3xl rounded-xl transition-all ${
                    selectedMood === index + 1
                      ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {selectedMood && (
              <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">
                {moodLabels[selectedMood - 1]}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">What's influencing your mood?</p>
            <div className="flex flex-wrap gap-2">
              {moodTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit}
            disabled={selectedMood === null}
            className="w-full"
          >
            Log Mood
          </Button>
        </div>
      ) : todayMood ? (
        <div className="text-center py-4">
          <div className="text-5xl mb-2">{moodEmojis[todayMood.mood - 1]}</div>
          <p className="text-gray-600 dark:text-gray-400">
            You're feeling <span className="font-medium">{moodLabels[todayMood.mood - 1]}</span> today
          </p>
          {todayMood.tags && todayMood.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {todayMood.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Weekly Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Weekly Average</span>
          <span className="font-medium" style={{ color: moodColors[Math.round(weeklyAverage) - 1] || '#6B7280' }}>
            {weeklyAverage > 0 ? `${weeklyAverage.toFixed(1)} / 5` : 'No data'}
          </span>
        </div>
        {/* Mini chart */}
        <div className="mt-3 flex items-end justify-between h-12 gap-1">
          {[...Array(7)].map((_, i) => {
            const daysAgo = 6 - i;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const entry = moodHistory.find(e => 
              new Date(e.createdAt).toDateString() === date.toDateString()
            );
            const height = entry ? (entry.mood / 5) * 100 : 10;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full rounded-sm transition-all"
                  style={{ 
                    height: `${height}%`,
                    backgroundColor: entry ? moodColors[entry.mood - 1] : '#E5E7EB',
                  }}
                />
                <span className="text-[10px] text-gray-400 mt-1">
                  {date.toLocaleDateString('en-AU', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Wellness Goals Component
function WellnessGoals({
  goals,
  onComplete,
  onCreate,
}: {
  goals: WellnessGoal[];
  onComplete: (goalId: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wellness Goals</h2>
        <button onClick={onCreate} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          + Add Goal
        </button>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.filter(g => g.isActive).map((goal) => {
            const progress = (goal.completedDays / goal.targetDays) * 100;
            const todayCompleted =
              !!goal.lastCompleted &&
              new Date(goal.lastCompleted).toDateString() === new Date().toDateString();

            return (
              <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                    )}
                  </div>
                  {goal.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <span className="text-lg">🔥</span>
                      <span className="text-sm font-medium">{goal.streak}</span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{goal.completedDays} / {goal.targetDays} days</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Complete Button */}
                <button
                  onClick={() => !todayCompleted && onComplete(goal.id)}
                  disabled={todayCompleted}
                  className={`mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                    todayCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {todayCompleted ? '✓ Completed Today' : 'Mark Complete'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No active goals</p>
          <button 
            onClick={onCreate}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create your first goal
          </button>
        </div>
      )}
    </div>
  );
}

// Mindfulness Exercises Component
function MindfulnessSection({
  exercises,
  onStart,
}: {
  exercises: MindfulnessExercise[];
  onStart: (exercise: MindfulnessExercise) => void;
}) {
  const typeIcons: Record<string, string> = {
    breathing: '🫁',
    meditation: '🧘',
    'body-scan': '👤',
    visualization: '🌅',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Mindfulness Exercises
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {exercises.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onStart(exercise)}
            className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20
              rounded-xl text-left hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">{typeIcons[exercise.type] || '✨'}</div>
            <h3 className="font-medium text-gray-900 dark:text-white">{exercise.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{exercise.description}</p>
            <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
              {exercise.duration} min · {exercise.type.replace('-', ' ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Goal Creation Modal
function GoalModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description?: string; targetDays: number }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState(7);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Goal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Goal Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="e.g., Daily walk"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
              placeholder="Add a short note to stay motivated"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Days
            </label>
            <select
              value={targetDays}
              onChange={(e) => setTargetDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              {[7, 14, 21, 30].map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onCreate({ title: title.trim(), description: description.trim() || undefined, targetDays });
              setTitle('');
              setDescription('');
              setTargetDays(7);
            }}
            disabled={!title.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Support Services Component
function SupportServices({ services }: { services: SupportService[] }) {
  const emergencyServices = services.filter(s => s.isEmergency);
  const otherServices = services.filter(s => !s.isEmergency);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Support Services
      </h2>

      {/* Emergency Services */}
      {emergencyServices.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Crisis Support (24/7)
          </h3>
          <div className="space-y-3">
            {emergencyServices.map((service) => (
              <div key={service.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-gray-900 dark:text-white">{service.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{service.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {service.phone && (
                    <a 
                      href={`tel:${service.phone}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-sm rounded-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {service.phone}
                    </a>
                  )}
                  {service.website && (
                    <a 
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Services */}
      <div className="space-y-3">
        {otherServices.map((service) => (
          <div key={service.id} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{service.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{service.description}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {service.phone && (
                <a href={`tel:${service.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {service.phone}
                </a>
              )}
              {service.hours && (
                <span className="text-gray-500">· {service.hours}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {service.categories.map((cat) => (
                <span key={cat} className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Dashboard Component
export function WellnessDashboard() {
  const { user } = useAuth();
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [resources, setResources] = useState<WellnessResource[]>([]);
  const [exercises, setExercises] = useState<MindfulnessExercise[]>([]);
  const [services, setServices] = useState<SupportService[]>([]);
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<MindfulnessExercise | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [moodData, resourceData, exerciseData, serviceData, goalData] = await Promise.all([
        wellnessApi.getMoodHistory(30),
        wellnessApi.getResources(),
        wellnessApi.getExercises(),
        wellnessApi.getSupportServices(),
        wellnessApi.getGoals(),
      ]);
      setMoodHistory(moodData.entries);
      setResources(resourceData.resources);
      setExercises(exerciseData.exercises);
      setServices(serviceData.services);
      setGoals(goalData.goals);
    } catch (error) {
      console.error('Failed to load wellness data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Today's mood
  const todayMood = moodHistory.find(entry => 
    new Date(entry.createdAt).toDateString() === new Date().toDateString()
  ) || null;

  // Log mood
  const handleLogMood = async (mood: number, note?: string, tags?: string[]) => {
    try {
      const entry = await wellnessApi.logMood({ mood, note, tags });
      setMoodHistory(prev => [entry, ...prev.filter(e => 
        new Date(e.createdAt).toDateString() !== new Date().toDateString()
      )]);
    } catch (error) {
      console.error('Failed to log mood:', error);
    }
  };

  // Complete goal
  const handleCompleteGoal = async (goalId: string) => {
    try {
      await wellnessApi.completeGoal(goalId);
      setGoals(prev => prev.map(g => 
        g.id === goalId 
          ? { ...g, completedDays: g.completedDays + 1, streak: g.streak + 1, lastCompleted: new Date().toISOString() }
          : g
      ));
    } catch (error) {
      console.error('Failed to complete goal:', error);
    }
  };

  const handleCreateGoal = async (data: { title: string; description?: string; targetDays: number }) => {
    setIsCreatingGoal(true);
    try {
      const goal = await wellnessApi.createGoal(data);
      setGoals(prev => [goal, ...prev]);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsCreatingGoal(false);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wellness Hub</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Take care of your mental health and wellbeing
        </p>
      </div>

      {/* Inspiring quote */}
      <div className="mb-8 p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
        <p className="text-lg italic">
          "The greatest wealth is health." — Virgil
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mood Tracker */}
          <MoodTracker
            todayMood={todayMood}
            moodHistory={moodHistory}
            onLogMood={handleLogMood}
          />

          {/* Mindfulness */}
          <MindfulnessSection
            exercises={exercises}
            onStart={setSelectedExercise}
          />

          {/* Resources */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Wellness Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources.slice(0, 4).map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  className="block p-4 bg-gray-50 dark:bg-gray-750 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      {resource.type === 'video' && '🎬'}
                      {resource.type === 'article' && '📄'}
                      {resource.type === 'audio' && '🎧'}
                      {resource.type === 'exercise' && '🏃'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {resource.description}
                      </p>
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        {resource.category} {resource.duration && `· ${resource.duration} min`}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Goals */}
          <WellnessGoals
            goals={goals}
            onComplete={handleCompleteGoal}
            onCreate={() => setShowGoalModal(true)}
          />

          {/* Support Services */}
          <SupportServices services={services} />
        </div>
      </div>

      {/* Exercise Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedExercise.title}
              </h2>
              <button 
                onClick={() => setSelectedExercise(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedExercise.description}</p>

            <div className="text-sm text-purple-600 dark:text-purple-400 mb-4">
              Duration: {selectedExercise.duration} minutes
            </div>

            <div className="space-y-3">
              {selectedExercise.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-medium text-purple-600">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-gray-700 dark:text-gray-300">{step}</p>
                </div>
              ))}
            </div>

            <Button className="w-full mt-6" onClick={() => setSelectedExercise(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onCreate={handleCreateGoal}
        isLoading={isCreatingGoal}
      />
    </div>
  );
}

export default WellnessDashboard;
