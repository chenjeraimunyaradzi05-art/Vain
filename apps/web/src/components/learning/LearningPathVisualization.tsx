'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * LearningPathVisualization - Interactive learning path display
 * 
 * Features:
 * - Visual learning path with milestones
 * - Progress tracking
 * - Course recommendations
 * - Skills development roadmap
 * - Achievement tracking
 * - Career goal mapping
 */

interface LearningModule {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'certification' | 'project' | 'assessment' | 'workshop';
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  prerequisites: string[];
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  progress?: number;
  completedAt?: string;
  image?: string;
  provider?: string;
  isFree?: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  estimatedDuration: number; // hours
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  modules: LearningModule[];
  progress: number;
  enrolledAt?: string;
  completedModules: number;
  totalModules: number;
  badgeUrl?: string;
}

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  targetDate?: string;
  paths: LearningPath[];
  requiredSkills: string[];
  currentSkillLevel: Record<string, number>;
}

// API functions
const learningApi = {
  async getPaths(): Promise<{ paths: LearningPath[] }> {
    const res = await fetch('/api/learning/paths', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch learning paths');
    return res.json();
  },

  async getPath(id: string): Promise<LearningPath> {
    const res = await fetch(`/api/learning/paths/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch learning path');
    return res.json();
  },

  async enrollPath(id: string): Promise<void> {
    const res = await fetch(`/api/learning/paths/${id}/enroll`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to enroll in path');
  },

  async getCareerGoals(): Promise<{ goals: CareerGoal[] }> {
    const res = await fetch('/api/learning/career-goals', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch career goals');
    return res.json();
  },

  async getRecommendedPaths(): Promise<{ paths: LearningPath[] }> {
    const res = await fetch('/api/learning/paths/recommended', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  },
};

// Format duration
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Module type config
const moduleTypeConfig: Record<string, { icon: string; color: string }> = {
  course: { icon: '📚', color: 'blue' },
  certification: { icon: '🏆', color: 'amber' },
  project: { icon: '🛠️', color: 'green' },
  assessment: { icon: '📝', color: 'purple' },
  workshop: { icon: '👥', color: 'orange' },
};

// Difficulty config
const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'green' },
  intermediate: { label: 'Intermediate', color: 'yellow' },
  advanced: { label: 'Advanced', color: 'red' },
};

// Module Card Component
function ModuleCard({
  module,
  index,
  isActive,
  onStart,
  onContinue,
}: {
  module: LearningModule;
  index: number;
  isActive: boolean;
  onStart: () => void;
  onContinue: () => void;
}) {
  const typeConfig = moduleTypeConfig[module.type] || moduleTypeConfig.course;
  const diffConfig = difficultyConfig[module.difficulty] || difficultyConfig.beginner;
  const isLocked = module.status === 'locked';
  const isCompleted = module.status === 'completed';
  const isInProgress = module.status === 'in-progress';

  return (
    <div className={`relative ${index > 0 ? 'mt-4' : ''}`}>
      {/* Connecting line */}
      {index > 0 && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Module card */}
      <div
        className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
          isLocked
            ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
            : isCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-lg'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
        }`}
      >
        {/* Status indicator */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            isLocked
              ? 'bg-gray-200 dark:bg-gray-700'
              : isCompleted
              ? 'bg-green-500'
              : isInProgress
              ? 'bg-blue-500'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          {isLocked ? (
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : isCompleted ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            typeConfig.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{module.title}</h4>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{module.description}</p>
            </div>
            {module.isFree && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                Free
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(module.duration)}
            </span>
            <span className={`px-2 py-0.5 rounded bg-${diffConfig.color}-100 dark:bg-${diffConfig.color}-900/30 text-${diffConfig.color}-700 dark:text-${diffConfig.color}-400`}>
              {diffConfig.label}
            </span>
            <span className="capitalize">{module.type}</span>
            {module.provider && (
              <span className="text-gray-400">by {module.provider}</span>
            )}
          </div>

          {/* Skills */}
          {module.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {module.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {skill}
                </span>
              ))}
              {module.skills.length > 3 && (
                <span className="text-xs text-gray-400">+{module.skills.length - 3} more</span>
              )}
            </div>
          )}

          {/* Progress bar for in-progress modules */}
          {isInProgress && module.progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{module.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${module.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action button */}
          {!isLocked && !isCompleted && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={isInProgress ? onContinue : onStart}
              >
                {isInProgress ? 'Continue' : 'Start'}
              </Button>
            </div>
          )}

          {/* Prerequisites */}
          {isLocked && module.prerequisites.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Complete first: {module.prerequisites.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Learning Path Card Component
function LearningPathCard({
  path,
  onView,
  onEnroll,
}: {
  path: LearningPath;
  onView: () => void;
  onEnroll: () => void;
}) {
  const diffConfig = difficultyConfig[path.difficulty] || difficultyConfig.beginner;
  const isEnrolled = !!path.enrolledAt;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{path.title}</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{path.targetRole}</p>
          </div>
          {path.badgeUrl && (
            <OptimizedImage src={toCloudinaryAutoUrl(path.badgeUrl)} alt={`${path.title} badge`} width={48} height={48} className="w-12 h-12" />
          )}
        </div>

        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{path.description}</p>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {path.estimatedDuration}h
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {path.totalModules} modules
          </span>
          <span className={`px-2 py-0.5 rounded bg-${diffConfig.color}-100 dark:bg-${diffConfig.color}-900/30 text-${diffConfig.color}-700 dark:text-${diffConfig.color}-400`}>
            {diffConfig.label}
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {path.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
            >
              {skill}
            </span>
          ))}
          {path.skills.length > 4 && (
            <span className="text-xs text-gray-400">+{path.skills.length - 4}</span>
          )}
        </div>
      </div>

      {/* Progress / Actions */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {isEnrolled ? (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">
                {path.completedModules} of {path.totalModules} completed
              </span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{path.progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${path.progress}%` }}
              />
            </div>
            <Button onClick={onView} className="w-full">Continue Learning</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onView} className="flex-1">Preview</Button>
            <Button onClick={onEnroll} className="flex-1">Enroll</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Skills Radar Chart (simplified visual)
function SkillsRadar({ skills, levels }: { skills: string[]; levels: Record<string, number> }) {
  const maxLevel = 100;
  
  return (
    <div className="space-y-3">
      {skills.map((skill) => {
        const level = levels[skill] || 0;
        return (
          <div key={skill}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">{skill}</span>
              <span className="text-gray-500">{level}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  level >= 80 ? 'bg-green-500' : level >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${level}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main Component
export function LearningPathVisualization() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [recommendedPaths, setRecommendedPaths] = useState<LearningPath[]>([]);
  const [careerGoals, setCareerGoals] = useState<CareerGoal[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'enrolled' | 'browse' | 'career'>('enrolled');

  const loadData = useCallback(async () => {
    try {
      const [pathsRes, recommendedRes, goalsRes] = await Promise.all([
        learningApi.getPaths(),
        learningApi.getRecommendedPaths(),
        learningApi.getCareerGoals(),
      ]);
      setPaths(pathsRes.paths);
      setRecommendedPaths(recommendedRes.paths);
      setCareerGoals(goalsRes.goals);
    } catch (error) {
      console.error('Failed to load learning data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enrolledPaths = useMemo(() => 
    paths.filter(p => p.enrolledAt),
    [paths]
  );

  const handleEnroll = async (pathId: string) => {
    try {
      await learningApi.enrollPath(pathId);
      await loadData();
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  const handleViewPath = async (pathId: string) => {
    try {
      const path = await learningApi.getPath(pathId);
      setSelectedPath(path);
    } catch (error) {
      console.error('Failed to load path:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Path Detail View
  if (selectedPath) {
    const currentModuleIndex = selectedPath.modules.findIndex(
      m => m.status === 'in-progress' || m.status === 'available'
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => setSelectedPath(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Learning Paths
        </button>

        {/* Path header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{selectedPath.targetRole}</span>
              <h1 className="text-3xl font-bold mt-3">{selectedPath.title}</h1>
              <p className="text-blue-100 mt-2 max-w-2xl">{selectedPath.description}</p>
            </div>
            {selectedPath.badgeUrl && (
              <OptimizedImage src={toCloudinaryAutoUrl(selectedPath.badgeUrl)} alt={`${selectedPath.title} badge`} width={80} height={80} className="w-20 h-20" />
            )}
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>
                {selectedPath.completedModules} of {selectedPath.totalModules} modules completed
              </span>
              <span className="font-semibold">{selectedPath.progress}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${selectedPath.progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6 text-sm">
            <div>
              <span className="text-blue-200">Duration</span>
              <p className="font-semibold">{selectedPath.estimatedDuration} hours</p>
            </div>
            <div>
              <span className="text-blue-200">Difficulty</span>
              <p className="font-semibold capitalize">{selectedPath.difficulty}</p>
            </div>
            <div>
              <span className="text-blue-200">Skills</span>
              <p className="font-semibold">{selectedPath.skills.length} skills</p>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Learning Path
          </h2>
          <div className="space-y-2">
            {selectedPath.modules.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                index={index}
                isActive={index === currentModuleIndex}
                onStart={() => { /* TODO: implement module start */ }}
                onContinue={() => { /* TODO: implement module continue */ }}
              />
            ))}
          </div>
        </div>

        {/* Skills you'll gain */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Skills You'll Gain</h3>
          <div className="flex flex-wrap gap-2">
            {selectedPath.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Paths</h1>
        <p className="text-gray-500 mt-2">
          Structured learning paths to help you reach your career goals
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setView('enrolled')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            view === 'enrolled'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Learning ({enrolledPaths.length})
        </button>
        <button
          onClick={() => setView('browse')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            view === 'browse'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Browse Paths
        </button>
        <button
          onClick={() => setView('career')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            view === 'career'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Career Goals
        </button>
      </div>

      {/* Enrolled Paths */}
      {view === 'enrolled' && (
        <div>
          {enrolledPaths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledPaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  onView={() => handleViewPath(path.id)}
                  onEnroll={() => handleEnroll(path.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No learning paths yet
              </h3>
              <p className="text-gray-500 mt-2">
                Browse available paths and start your learning journey
              </p>
              <Button className="mt-4" onClick={() => setView('browse')}>
                Browse Paths
              </Button>
            </div>
          )}

          {/* Recommended section */}
          {enrolledPaths.length > 0 && recommendedPaths.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Recommended for You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedPaths.slice(0, 3).map((path) => (
                  <LearningPathCard
                    key={path.id}
                    path={path}
                    onView={() => handleViewPath(path.id)}
                    onEnroll={() => handleEnroll(path.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browse Paths */}
      {view === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              onView={() => handleViewPath(path.id)}
              onEnroll={() => handleEnroll(path.id)}
            />
          ))}
        </div>
      )}

      {/* Career Goals */}
      {view === 'career' && (
        <div className="space-y-8">
          {careerGoals.length > 0 ? (
            careerGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                    <p className="text-gray-500 mt-1">{goal.description}</p>
                    {goal.targetDate && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-AU', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">Edit Goal</Button>
                </div>

                {/* Skills Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Skills Progress
                    </h4>
                    <SkillsRadar
                      skills={goal.requiredSkills}
                      levels={goal.currentSkillLevel}
                    />
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Recommended Paths
                    </h4>
                    <div className="space-y-3">
                      {goal.paths.slice(0, 3).map((path) => (
                        <button
                          key={path.id}
                          onClick={() => handleViewPath(path.id)}
                          className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                            📚
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {path.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {path.totalModules} modules · {path.estimatedDuration}h
                            </p>
                          </div>
                          {path.enrolledAt && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                              {path.progress}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No career goals set
              </h3>
              <p className="text-gray-500 mt-2">
                Set your career goals to get personalized learning recommendations
              </p>
              <Button className="mt-4">Set Career Goals</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LearningPathVisualization;
