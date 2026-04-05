'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * SkillsAssessment - Skills assessment and certification system
 * 
 * Features:
 * - Browse available skill assessments
 * - Take assessments with various question types
 * - View results and skill levels
 * - Earn skill badges and certifications
 * - Track skill development over time
 */

interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  assessmentCount: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number; // in minutes
  questionCount: number;
  passScore: number;
  badge?: {
    id: string;
    name: string;
    icon: string;
  };
  isCertified: boolean;
  userAttempts?: {
    count: number;
    bestScore: number;
    lastAttempt: string;
    passed: boolean;
  };
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'multi-select' | 'true-false' | 'code' | 'short-answer';
  text: string;
  code?: string;
  options?: { id: string; text: string }[];
  points: number;
}

interface AssessmentResult {
  id: string;
  assessmentId: string;
  score: number;
  passed: boolean;
  totalPoints: number;
  earnedPoints: number;
  timeTaken: number;
  completedAt: string;
  breakdown: {
    questionId: string;
    correct: boolean;
    points: number;
  }[];
  badge?: {
    id: string;
    name: string;
    icon: string;
  };
}

interface UserSkillProfile {
  totalAssessments: number;
  passedAssessments: number;
  badges: { id: string; name: string; icon: string; earnedAt: string }[];
  skillLevels: { skill: string; level: number; assessments: number }[];
}

// API functions
const assessmentsApi = {
  async getCategories(): Promise<{ categories: SkillCategory[] }> {
    const res = await fetch('/api/assessments/categories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async getAssessments(categoryId?: string): Promise<{ assessments: Assessment[] }> {
    const url = categoryId 
      ? `/api/assessments?category=${categoryId}` 
      : '/api/assessments';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch assessments');
    return res.json();
  },

  async getAssessment(id: string): Promise<Assessment> {
    const res = await fetch(`/api/assessments/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch assessment');
    return res.json();
  },

  async startAssessment(id: string): Promise<{ sessionId: string; questions: Question[] }> {
    const res = await fetch(`/api/assessments/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to start assessment');
    return res.json();
  },

  async submitAssessment(sessionId: string, answers: Record<string, string | string[]>): Promise<AssessmentResult> {
    const res = await fetch(`/api/assessments/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to submit assessment');
    return res.json();
  },

  async getSkillProfile(): Promise<UserSkillProfile> {
    const res = await fetch('/api/assessments/profile', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getHistory(): Promise<{ results: AssessmentResult[] }> {
    const res = await fetch('/api/assessments/history', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },
};

// Difficulty config
const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'green' },
  intermediate: { label: 'Intermediate', color: 'blue' },
  advanced: { label: 'Advanced', color: 'orange' },
  expert: { label: 'Expert', color: 'red' },
};

// Category Card
function CategoryCard({
  category,
  isSelected,
  onClick,
}: {
  category: SkillCategory;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-blue-500 text-white'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md'
      }`}
    >
      <span className="text-3xl">{category.icon}</span>
      <h3 className={`mt-2 font-semibold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
        {category.name}
      </h3>
      <p className={`text-sm mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
        {category.assessmentCount} assessments
      </p>
    </button>
  );
}

// Assessment Card
function AssessmentCard({
  assessment,
  onStart,
}: {
  assessment: Assessment;
  onStart: () => void;
}) {
  const difficulty = difficultyConfig[assessment.difficulty];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${difficulty.color}-100 dark:bg-${difficulty.color}-900/30 text-${difficulty.color}-700 dark:text-${difficulty.color}-400`}>
              {difficulty.label}
            </span>
            {assessment.isCertified && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Certified
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{assessment.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{assessment.description}</p>
        </div>
        {assessment.badge && (
          <div className="ml-4 text-center">
            <span className="text-3xl">{assessment.badge.icon}</span>
            <p className="text-xs text-gray-500 mt-1">Badge</p>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {assessment.duration} min
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {assessment.questionCount} questions
        </span>
        <span>Pass: {assessment.passScore}%</span>
      </div>

      {/* User Progress */}
      {assessment.userAttempts && (
        <div className={`mt-4 p-3 rounded-lg ${
          assessment.userAttempts.passed 
            ? 'bg-green-50 dark:bg-green-900/20' 
            : 'bg-gray-50 dark:bg-gray-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {assessment.userAttempts.passed ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-sm font-medium ${assessment.userAttempts.passed ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {assessment.userAttempts.passed ? 'Passed' : `Best: ${assessment.userAttempts.bestScore}%`}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {assessment.userAttempts.count} attempt{assessment.userAttempts.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mt-4">
        <Button 
          className="w-full" 
          onClick={onStart}
          variant={assessment.userAttempts?.passed ? 'outline' : 'primary'}
        >
          {assessment.userAttempts?.passed ? 'Retake Assessment' : 
           assessment.userAttempts ? 'Try Again' : 'Start Assessment'}
        </Button>
      </div>
    </div>
  );
}

// Question Component
function QuestionView({
  question,
  currentIndex,
  totalQuestions,
  answer,
  onAnswer,
}: {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  answer: string | string[] | undefined;
  onAnswer: (answer: string | string[]) => void;
}) {
  const handleOptionClick = (optionId: string) => {
    if (question.type === 'multi-select') {
      const currentAnswers = (answer as string[]) || [];
      const newAnswers = currentAnswers.includes(optionId)
        ? currentAnswers.filter(a => a !== optionId)
        : [...currentAnswers, optionId];
      onAnswer(newAnswers);
    } else {
      onAnswer(optionId);
    }
  };

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {question.points} point{question.points !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Text */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{question.text}</h3>

      {/* Code Block */}
      {question.code && (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm">
          <code>{question.code}</code>
        </pre>
      )}

      {/* Options */}
      {question.options && (
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = question.type === 'multi-select'
              ? (answer as string[] || []).includes(option.id)
              : answer === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-${question.type === 'multi-select' ? 'md' : 'full'} border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Short Answer */}
      {question.type === 'short-answer' && (
        <textarea
          value={(answer as string) || ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      )}

      {/* True/False */}
      {question.type === 'true-false' && (
        <div className="flex gap-4">
          {['true', 'false'].map((value) => (
            <button
              key={value}
              onClick={() => onAnswer(value)}
              className={`flex-1 p-4 rounded-lg border-2 font-medium transition-all ${
                answer === value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {value === 'true' ? 'True' : 'False'}
            </button>
          ))}
        </div>
      )}

      {question.type === 'multi-select' && (
        <p className="text-sm text-gray-500 mt-2">Select all that apply</p>
      )}
    </div>
  );
}

// Result Component
function ResultView({
  result,
  onClose,
  onRetake,
}: {
  result: AssessmentResult;
  onClose: () => void;
  onRetake: () => void;
}) {
  const percentage = Math.round((result.earnedPoints / result.totalPoints) * 100);

  return (
    <div className="text-center py-8">
      {/* Score Circle */}
      <div className={`w-40 h-40 mx-auto rounded-full flex flex-col items-center justify-center ${
        result.passed 
          ? 'bg-green-100 dark:bg-green-900/30' 
          : 'bg-red-100 dark:bg-red-900/30'
      }`}>
        <span className={`text-4xl font-bold ${
          result.passed ? 'text-green-600' : 'text-red-600'
        }`}>
          {result.score}%
        </span>
        <span className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
          {result.passed ? 'PASSED' : 'NOT PASSED'}
        </span>
      </div>

      {/* Badge Earned */}
      {result.badge && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">You earned a badge!</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <span className="text-3xl">{result.badge.icon}</span>
            <span className="font-medium text-amber-700 dark:text-amber-400">{result.badge.name}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8 max-w-md mx-auto">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.earnedPoints}</p>
          <p className="text-sm text-gray-500">Points Earned</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.totalPoints}</p>
          <p className="text-sm text-gray-500">Total Points</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-500">Time Taken</p>
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="mt-8 max-w-md mx-auto">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Question Breakdown</h4>
        <div className="flex flex-wrap gap-2 justify-center">
          {result.breakdown.map((q, i) => (
            <div
              key={q.questionId}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                q.correct 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center mt-8">
        <Button variant="outline" onClick={onClose}>
          Back to Assessments
        </Button>
        <Button onClick={onRetake}>
          {result.passed ? 'Retake Assessment' : 'Try Again'}
        </Button>
      </div>
    </div>
  );
}

// Main Component
export function SkillsAssessment() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [profile, setProfile] = useState<UserSkillProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Assessment state
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, assessmentsData, profileData] = await Promise.all([
        assessmentsApi.getCategories(),
        assessmentsApi.getAssessments(selectedCategory || undefined),
        assessmentsApi.getSkillProfile(),
      ]);
      setCategories(categoriesData.categories);
      setAssessments(assessmentsData.assessments);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(t => t !== null ? t - 1 : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Start assessment
  const handleStartAssessment = async (assessment: Assessment) => {
    try {
      const { sessionId, questions } = await assessmentsApi.startAssessment(assessment.id);
      setActiveAssessment(assessment);
      setSessionId(sessionId);
      setQuestions(questions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setResult(null);
      setTimeRemaining(assessment.duration * 60);
    } catch (error) {
      console.error('Failed to start assessment:', error);
    }
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (!sessionId) return;
    
    setIsSubmitting(true);
    try {
      const result = await assessmentsApi.submitAssessment(sessionId, answers);
      setResult(result);
      setTimeRemaining(null);
      await loadData(); // Refresh profile
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset assessment
  const handleClose = () => {
    setActiveAssessment(null);
    setSessionId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResult(null);
    setTimeRemaining(null);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Show result
  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ResultView
          result={result}
          onClose={handleClose}
          onRetake={() => activeAssessment && handleStartAssessment(activeAssessment)}
        />
      </div>
    );
  }

  // Show assessment questions
  if (activeAssessment && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const hasAnswer = answers[currentQuestion.id] !== undefined;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeAssessment.title}</h2>
          {timeRemaining !== null && (
            <div className={`px-4 py-2 rounded-lg font-mono font-medium ${
              timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <QuestionView
            question={currentQuestion}
            currentIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            answer={answers[currentQuestion.id]}
            onAnswer={(answer) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }))}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(i => i - 1)}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestionIndex(i)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i === currentQuestionIndex 
                    ? 'bg-blue-500 text-white' 
                    : answers[questions[i].id] !== undefined
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          ) : (
            <Button onClick={() => setCurrentQuestionIndex(i => i + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show assessment list
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skills Assessment</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Test your skills and earn certifications
        </p>
      </div>

      {/* Profile Summary */}
      {profile && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-2">Your Skill Profile</h3>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{profile.passedAssessments}</p>
                  <p className="text-sm opacity-80">Passed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.totalAssessments}</p>
                  <p className="text-sm opacity-80">Attempted</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.badges.length}</p>
                  <p className="text-sm opacity-80">Badges</p>
                </div>
              </div>
            </div>
            {profile.badges.length > 0 && (
              <div className="flex gap-2">
                {profile.badges.slice(0, 5).map((badge) => (
                  <span key={badge.id} className="text-3xl" title={badge.name}>{badge.icon}</span>
                ))}
                {profile.badges.length > 5 && (
                  <span className="text-sm opacity-80">+{profile.badges.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`p-4 rounded-xl text-left transition-all ${
            selectedCategory === null
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md'
          }`}
        >
          <span className="text-3xl">📊</span>
          <h3 className={`mt-2 font-semibold ${!selectedCategory ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            All
          </h3>
          <p className={`text-sm mt-1 ${!selectedCategory ? 'text-blue-100' : 'text-gray-500'}`}>
            {assessments.length} assessments
          </p>
        </button>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onClick={() => setSelectedCategory(category.id)}
          />
        ))}
      </div>

      {/* Assessments Grid */}
      {assessments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onStart={() => handleStartAssessment(assessment)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No assessments found</h3>
          <p className="text-gray-500 mt-2">Try selecting a different category</p>
        </div>
      )}
    </div>
  );
}

export default SkillsAssessment;
