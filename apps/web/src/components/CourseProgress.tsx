'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CourseProgress - Course progress tracking and certificate management
 * 
 * Features:
 * - View enrolled courses with progress
 * - Track lesson completion
 * - Download certificates
 * - Course notes
 * - Quiz results
 */

interface Lesson {
  id: string;
  title: string;
  duration: number; // minutes
  type: 'video' | 'reading' | 'quiz' | 'exercise';
  completed: boolean;
  progress: number;
  timeSpent: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  progress: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  instructor: {
    name: string;
    avatar?: string;
  };
  category: string;
  totalLessons: number;
  completedLessons: number;
  totalDuration: number; // minutes
  timeSpent: number; // minutes
  progress: number;
  enrolledAt: string;
  lastAccessedAt?: string;
  certificateAvailable: boolean;
  certificateId?: string;
  modules: Module[];
}

interface CourseNote {
  id: string;
  courseId: string;
  lessonId?: string;
  content: string;
  timestamp?: number;
  createdAt: string;
}

interface QuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  passed: boolean;
  completedAt: string;
}

// API functions
const courseProgressApi = {
  async getEnrolledCourses(): Promise<{ courses: Course[] }> {
    const { ok, data } = await api<{ courses: Course[] }>('/courses/enrolled');
    if (!ok) throw new Error('Failed to fetch courses');
    return data!;
  },

  async getCourseProgress(courseId: string): Promise<Course> {
    const { ok, data } = await api<Course>(`/courses/${courseId}/progress`);
    if (!ok) throw new Error('Failed to fetch progress');
    return data!;
  },

  async markLessonComplete(courseId: string, lessonId: string): Promise<void> {
    const { ok } = await api(`/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
    if (!ok) throw new Error('Failed to mark complete');
  },

  async updateLessonProgress(courseId: string, lessonId: string, data: { progress: number; timeSpent?: number }): Promise<void> {
    const { ok } = await api(`/courses/${courseId}/lessons/${lessonId}/progress`, {
      method: 'PUT',
      body: data,
    });
    if (!ok) throw new Error('Failed to update progress');
  },

  async getCertificate(courseId: string): Promise<{ certificateUrl: string }> {
    const { ok, data } = await api<{ certificateUrl: string }>(`/courses/${courseId}/certificate`);
    if (!ok) throw new Error('Failed to get certificate');
    return data!;
  },

  async getCourseNotes(courseId: string): Promise<{ notes: CourseNote[] }> {
    const { ok, data } = await api<{ notes: CourseNote[] }>(`/courses/${courseId}/notes`);
    if (!ok) throw new Error('Failed to get notes');
    return data!;
  },

  async saveNote(courseId: string, data: { lessonId?: string; content: string }): Promise<CourseNote> {
    const res = await fetch(`/api/courses/${courseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save note');
    return res.json();
  },

  async deleteNote(courseId: string, noteId: string): Promise<void> {
    const res = await fetch(`/api/courses/${courseId}/notes/${noteId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete note');
  },

  async getQuizResults(courseId: string): Promise<{ results: QuizResult[] }> {
    const res = await fetch(`/api/courses/${courseId}/quiz-results`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get quiz results');
    return res.json();
  },
};

// Helper functions
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Lesson type icons
const lessonTypeIcons: Record<string, React.ReactNode> = {
  video: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reading: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  quiz: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  exercise: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

// Course Card Component
function CourseCard({ 
  course, 
  onClick,
}: { 
  course: Course;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden
        cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Course Image */}
      <div className="relative h-40 bg-gradient-to-br from-blue-500 to-purple-600">
        {course.imageUrl && (
          <OptimizedImage 
            src={toCloudinaryAutoUrl(course.imageUrl)} 
            alt={course.title}
            width={400}
            height={160}
            className="w-full h-full object-cover"
          />
        )}
        {course.certificateAvailable && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Certificate Ready
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
          {course.category}
        </p>
        <h3 className="mt-1 font-semibold text-gray-900 dark:text-white line-clamp-2">
          {course.title}
        </h3>

        {/* Instructor */}
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
            {course.instructor.avatar ? (
              <OptimizedImage src={toCloudinaryAutoUrl(course.instructor.avatar)} alt={course.instructor.name} width={24} height={24} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                {course.instructor.name.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{course.instructor.name}</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              {course.completedLessons} / {course.totalLessons} lessons
            </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{course.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                course.progress === 100 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDuration(course.timeSpent)} spent</span>
          {course.lastAccessedAt && (
            <span>Last: {formatDate(course.lastAccessedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Course Detail View
function CourseDetailView({ 
  course, 
  onBack,
  onMarkComplete,
  onDownloadCertificate,
}: { 
  course: Course;
  onBack: () => void;
  onMarkComplete: (lessonId: string) => Promise<void>;
  onDownloadCertificate: () => void;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([course.modules[0]?.id]));
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const data = await courseProgressApi.getCourseNotes(course.id);
        setNotes(data.notes);
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    loadNotes();
  }, [course.id]);

  // Save note
  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setIsLoading(true);
    try {
      const note = await courseProgressApi.saveNote(course.id, { content: newNote });
      setNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await courseProgressApi.deleteNote(course.id, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{course.category}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
        </div>
        {course.certificateAvailable && (
          <Button onClick={onDownloadCertificate}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Certificate
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{course.progress}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Course Complete</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {course.completedLessons} / {course.totalLessons}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lessons</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(course.timeSpent)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Time Spent</p>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              course.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${course.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules & Lessons */}
        <div className="lg:col-span-2 space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <div 
              key={module.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                    ${module.progress === 100 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {module.progress === 100 ? '✓' : moduleIndex + 1}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">{module.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {module.lessons.filter(l => l.completed).length} / {module.lessons.length} completed
                    </p>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedModules.has(module.id) ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Lessons */}
              {expandedModules.has(module.id) && (
                <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {module.lessons.map((lesson) => (
                    <div 
                      key={lesson.id}
                      className={`flex items-center gap-4 p-4 ${
                        lesson.completed ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      {/* Completion checkbox */}
                      <button
                        onClick={() => !lesson.completed && onMarkComplete(lesson.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          lesson.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                        }`}
                      >
                        {lesson.completed && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Lesson type icon */}
                      <div className="text-gray-400">
                        {lessonTypeIcons[lesson.type]}
                      </div>

                      {/* Lesson info */}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          lesson.completed 
                            ? 'text-gray-500 dark:text-gray-400 line-through' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {lesson.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDuration(lesson.duration)} · {lesson.type}
                        </p>
                      </div>

                      {/* Progress indicator for in-progress lessons */}
                      {!lesson.completed && lesson.progress > 0 && (
                        <div className="w-16">
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${lesson.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar - Notes */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Course Notes</h3>
              <span className="text-sm text-gray-500">{notes.length}</span>
            </div>

            {/* Add Note */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
                  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <Button 
                size="sm" 
                className="w-full mt-2" 
                onClick={handleSaveNote}
                disabled={!newNote.trim() || isLoading}
              >
                Save Note
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(note.createdAt)}</span>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No notes yet. Start taking notes to remember key points!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Course Progress Component
export function CourseProgress() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Load courses
  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await courseProgressApi.getEnrolledCourses();
      setCourses(data.courses);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load course detail
  const loadCourseDetail = async (courseId: string) => {
    try {
      const course = await courseProgressApi.getCourseProgress(courseId);
      setSelectedCourse(course);
    } catch (error) {
      console.error('Failed to load course:', error);
    }
  };

  // Mark lesson complete
  const handleMarkComplete = async (lessonId: string) => {
    if (!selectedCourse) return;
    try {
      await courseProgressApi.markLessonComplete(selectedCourse.id, lessonId);
      // Reload course detail to get updated progress
      await loadCourseDetail(selectedCourse.id);
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  };

  // Download certificate
  const handleDownloadCertificate = async () => {
    if (!selectedCourse) return;
    try {
      const { certificateUrl } = await courseProgressApi.getCertificate(selectedCourse.id);
      window.open(certificateUrl, '_blank');
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  // Filter courses
  const filteredCourses = courses.filter(course => {
    if (filter === 'in-progress') return course.progress > 0 && course.progress < 100;
    if (filter === 'completed') return course.progress === 100;
    return true;
  });

  // Stats
  const stats = {
    totalCourses: courses.length,
    completed: courses.filter(c => c.progress === 100).length,
    inProgress: courses.filter(c => c.progress > 0 && c.progress < 100).length,
    totalTime: courses.reduce((acc, c) => acc + c.timeSpent, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Show course detail
  if (selectedCourse) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CourseDetailView
          course={selectedCourse}
          onBack={() => setSelectedCourse(null)}
          onMarkComplete={handleMarkComplete}
          onDownloadCertificate={handleDownloadCertificate}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Track your learning progress and earn certificates
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p>
          <p className="text-sm text-gray-500">Enrolled Courses</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-purple-600">{formatDuration(stats.totalTime)}</p>
          <p className="text-sm text-gray-500">Total Time</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All Courses' },
          { key: 'in-progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              filter === item.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => loadCourseDetail(course.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {filter === 'all' ? 'No courses enrolled' : `No ${filter} courses`}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? 'Explore our course catalog to start learning!'
              : 'Check other filters or enroll in new courses.'}
          </p>
          {filter === 'all' && (
            <Button className="mt-4" onClick={() => router.push('/courses')}>
              Browse Courses
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseProgress;
