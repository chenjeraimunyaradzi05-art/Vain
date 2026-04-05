'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * InterviewPrep - Interview preparation and practice
 * 
 * Features:
 * - Practice interviews
 * - Question bank
 * - AI feedback
 * - Company-specific prep
 * - STAR method guidance
 * - Video recording practice
 */

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational' | 'cultural' | 'role-specific';
  difficulty: 'easy' | 'medium' | 'hard';
  tips: string[];
  sampleAnswer?: string;
  starPrompt?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  tags: string[];
  timeLimit: number; // seconds
  isBookmarked: boolean;
  userAnswer?: string;
  lastPracticed?: string;
}

interface PracticeSession {
  id: string;
  type: 'quick' | 'full' | 'company-specific';
  questions: InterviewQuestion[];
  duration: number; // minutes
  completedAt?: string;
  score?: number;
  feedback?: SessionFeedback;
}

interface SessionFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  questionFeedback: {
    questionId: string;
    score: number;
    feedback: string;
  }[];
}

interface CompanyInterview {
  id: string;
  company: string;
  companyLogo?: string;
  role: string;
  interviewStages: {
    name: string;
    description: string;
    duration: string;
    tips: string[];
  }[];
  commonQuestions: InterviewQuestion[];
  culture: string[];
  prepTips: string[];
}

interface UserAnswer {
  questionId: string;
  text: string;
  audioUrl?: string;
  videoUrl?: string;
  recordedAt: string;
}

// API functions
const interviewApi = {
  async getQuestions(params?: {
    category?: string;
    difficulty?: string;
    tag?: string;
    bookmarked?: boolean;
  }): Promise<{ questions: InterviewQuestion[] }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.bookmarked) searchParams.set('bookmarked', 'true');

    const res = await fetch(`/api/interview/questions?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  },

  async getCompanyInterviews(): Promise<{ companies: CompanyInterview[] }> {
    const res = await fetch('/api/interview/companies', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },

  async getCompanyInterview(companyId: string): Promise<CompanyInterview> {
    const res = await fetch(`/api/interview/companies/${companyId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch company');
    return res.json();
  },

  async startPracticeSession(type: string, options?: {
    categories?: string[];
    questionCount?: number;
    companyId?: string;
  }): Promise<PracticeSession> {
    const res = await fetch('/api/interview/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type, ...options }),
    });
    if (!res.ok) throw new Error('Failed to start session');
    return res.json();
  },

  async submitAnswer(sessionId: string, questionId: string, answer: {
    text: string;
    audioUrl?: string;
    videoUrl?: string;
  }): Promise<void> {
    const res = await fetch(`/api/interview/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ questionId, ...answer }),
    });
    if (!res.ok) throw new Error('Failed to submit answer');
  },

  async completeSession(sessionId: string): Promise<SessionFeedback> {
    const res = await fetch(`/api/interview/sessions/${sessionId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to complete session');
    return res.json();
  },

  async bookmarkQuestion(questionId: string): Promise<void> {
    const res = await fetch(`/api/interview/questions/${questionId}/bookmark`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to bookmark');
  },

  async getSessionHistory(): Promise<{ sessions: PracticeSession[] }> {
    const res = await fetch('/api/interview/sessions/history', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getSavedAnswers(): Promise<{ answers: UserAnswer[] }> {
    const res = await fetch('/api/interview/answers', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch answers');
    return res.json();
  },
};

// Categories
const categories = [
  { value: 'behavioral', label: 'Behavioral', icon: '🧠', description: 'Past experience & behavior' },
  { value: 'technical', label: 'Technical', icon: '💻', description: 'Skills & knowledge' },
  { value: 'situational', label: 'Situational', icon: '🎯', description: 'Hypothetical scenarios' },
  { value: 'cultural', label: 'Cultural Fit', icon: '🤝', description: 'Values & teamwork' },
  { value: 'role-specific', label: 'Role-Specific', icon: '📋', description: 'Job-specific questions' },
];

// Difficulty colors
const difficultyColors = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Question Card
function QuestionCard({
  question,
  onPractice,
  onBookmark,
  showAnswer,
}: {
  question: InterviewQuestion;
  onPractice: () => void;
  onBookmark: () => void;
  showAnswer?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = categories.find(c => c.value === question.category);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{category?.icon}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyColors[question.difficulty]}`}>
              {question.difficulty}
            </span>
            <span className="text-xs text-gray-500">{question.timeLimit}s suggested</span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">{question.question}</h3>
        </div>
        <button
          onClick={onBookmark}
          className={`p-2 rounded-lg transition-colors ${
            question.isBookmarked
              ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill={question.isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Tags */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {question.tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Tips */}
          {question.tips.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tips</h4>
              <ul className="space-y-1">
                {question.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* STAR Prompt */}
          {question.starPrompt && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
                STAR Method Guide
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">S - Situation: </span>
                  <span className="text-purple-600 dark:text-purple-400">{question.starPrompt.situation}</span>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">T - Task: </span>
                  <span className="text-purple-600 dark:text-purple-400">{question.starPrompt.task}</span>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">A - Action: </span>
                  <span className="text-purple-600 dark:text-purple-400">{question.starPrompt.action}</span>
                </div>
                <div>
                  <span className="font-medium text-purple-700 dark:text-purple-300">R - Result: </span>
                  <span className="text-purple-600 dark:text-purple-400">{question.starPrompt.result}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sample Answer */}
          {showAnswer && question.sampleAnswer && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sample Answer</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">{question.sampleAnswer}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:underline"
        >
          {isExpanded ? 'Show less' : 'Show tips & guidance'}
        </button>
        <Button size="sm" onClick={onPractice}>
          Practice
        </Button>
      </div>
    </div>
  );
}

// Practice Mode
function PracticeMode({
  session,
  onComplete,
  onExit,
}: {
  session: PracticeSession;
  onComplete: (feedback: SessionFeedback) => void;
  onExit: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(session.questions[0]?.timeLimit || 120);
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTips, setShowTips] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentQuestion = session.questions[currentIndex];
  const progress = ((currentIndex + 1) / session.questions.length) * 100;

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  useEffect(() => {
    setTimeLeft(currentQuestion?.timeLimit || 120);
    setAnswer(answers[currentQuestion?.id] || '');
    setShowTips(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = async () => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
    
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsCompleting(true);
      try {
        const feedback = await interviewApi.completeSession(session.id);
        onComplete(feedback);
      } catch (error) {
        console.error('Failed to complete:', error);
      } finally {
        setIsCompleting(false);
      }
    }
  };

  const handlePrevious = () => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
    setCurrentIndex(i => i - 1);
  };

  const category = categories.find(c => c.value === currentQuestion?.category);

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-gray-500">
              Question {currentIndex + 1} of {session.questions.length}
            </span>
          </div>
          <div className={`px-4 py-2 rounded-lg font-mono text-lg ${
            timeLeft < 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Question */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{category?.icon}</span>
              <span className="text-sm text-gray-500">{category?.label}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyColors[currentQuestion.difficulty]}`}>
                {currentQuestion.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Your Answer</h3>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showTips ? 'Hide tips' : 'Show tips'}
              </button>
            </div>

            {/* Tips */}
            {showTips && currentQuestion.tips.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Tips</h4>
                <ul className="space-y-1">
                  {currentQuestion.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <span>💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* STAR Guide */}
            {currentQuestion.starPrompt && (
              <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
                  Use the STAR Method
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-purple-700 dark:text-purple-300">
                    <strong>Situation:</strong> {currentQuestion.starPrompt.situation}
                  </div>
                  <div className="text-purple-700 dark:text-purple-300">
                    <strong>Task:</strong> {currentQuestion.starPrompt.task}
                  </div>
                  <div className="text-purple-700 dark:text-purple-300">
                    <strong>Action:</strong> {currentQuestion.starPrompt.action}
                  </div>
                  <div className="text-purple-700 dark:text-purple-300">
                    <strong>Result:</strong> {currentQuestion.starPrompt.result}
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />

            {/* Recording Options */}
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isRecording ? 'Stop Recording' : 'Record Audio'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Record Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button onClick={handleNext} disabled={isCompleting}>
            {currentIndex === session.questions.length - 1
              ? (isCompleting ? 'Submitting...' : 'Complete Session')
              : 'Next Question'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Feedback View
function FeedbackView({
  feedback,
  questions,
  onClose,
}: {
  feedback: SessionFeedback;
  questions: InterviewQuestion[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Session Results</h1>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Overall Score */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">{feedback.overallScore}%</div>
            <p className="text-gray-500">Overall Performance</p>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3">Strengths</h3>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-800 dark:text-green-300">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6">
              <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-3">Areas to Improve</h3>
              <ul className="space-y-2">
                {feedback.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-orange-800 dark:text-orange-300">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Question-by-Question Feedback</h3>
            <div className="space-y-4">
              {feedback.questionFeedback.map((qf, i) => {
                const question = questions.find(q => q.id === qf.questionId);
                return (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="font-medium text-gray-900 dark:text-white">{question?.question}</p>
                      <span className={`px-2 py-1 text-sm font-medium rounded ${
                        qf.score >= 80 ? 'bg-green-100 text-green-700' :
                        qf.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {qf.score}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{qf.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function InterviewPrep() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'practice' | 'questions' | 'companies' | 'history'>('practice');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [companies, setCompanies] = useState<CompanyInterview[]>([]);
  const [sessionHistory, setSessionHistory] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<{ feedback: SessionFeedback; questions: InterviewQuestion[] } | null>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [questionsRes, companiesRes, historyRes] = await Promise.all([
        interviewApi.getQuestions({ category: categoryFilter, difficulty: difficultyFilter }),
        interviewApi.getCompanyInterviews(),
        interviewApi.getSessionHistory(),
      ]);
      setQuestions(questionsRes.questions);
      setCompanies(companiesRes.companies);
      setSessionHistory(historyRes.sessions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, difficultyFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startQuickPractice = async () => {
    try {
      const session = await interviewApi.startPracticeSession('quick', {
        categories: categoryFilter ? [categoryFilter] : undefined,
        questionCount: 5,
      });
      setActiveSession(session);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const startFullPractice = async () => {
    try {
      const session = await interviewApi.startPracticeSession('full', { questionCount: 10 });
      setActiveSession(session);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleBookmark = async (question: InterviewQuestion) => {
    try {
      await interviewApi.bookmarkQuestion(question.id);
      setQuestions(prev =>
        prev.map(q => q.id === question.id ? { ...q, isBookmarked: !q.isBookmarked } : q)
      );
    } catch (error) {
      console.error('Failed to bookmark:', error);
    }
  };

  const handleSessionComplete = (feedback: SessionFeedback) => {
    setSessionFeedback({ feedback, questions: activeSession?.questions || [] });
    setActiveSession(null);
  };

  if (activeSession) {
    return (
      <PracticeMode
        session={activeSession}
        onComplete={handleSessionComplete}
        onExit={() => setActiveSession(null)}
      />
    );
  }

  if (sessionFeedback) {
    return (
      <FeedbackView
        feedback={sessionFeedback.feedback}
        questions={sessionFeedback.questions}
        onClose={() => setSessionFeedback(null)}
      />
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interview Prep</h1>
        <p className="text-gray-500 mt-1">Practice and prepare for your interviews</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['practice', 'questions', 'companies', 'history'] as const).map((tab) => (
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
      {activeTab === 'practice' && (
        <div className="space-y-6">
          {/* Quick Practice Options */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">Quick Practice</h3>
              <p className="text-blue-100 mb-4">5 questions • ~10 minutes</p>
              <p className="text-sm text-blue-100 mb-4">
                Perfect for a quick warm-up before an interview
              </p>
              <Button onClick={startQuickPractice} className="bg-white text-blue-600 hover:bg-blue-50">
                Start Quick Practice
              </Button>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">Full Session</h3>
              <p className="text-green-100 mb-4">10 questions • ~30 minutes</p>
              <p className="text-sm text-green-100 mb-4">
                Comprehensive practice with detailed feedback
              </p>
              <Button onClick={startFullPractice} className="bg-white text-green-600 hover:bg-green-50">
                Start Full Session
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Practice by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategoryFilter(cat.value); setActiveTab('questions'); }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="font-medium text-gray-900 dark:text-white">{cat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* STAR Method Guide */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-4">
              🌟 Master the STAR Method
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">S</div>
                <div className="font-medium text-purple-900 dark:text-purple-200">Situation</div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Set the scene and give context
                </p>
              </div>
              <div className="bg-white dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">T</div>
                <div className="font-medium text-purple-900 dark:text-purple-200">Task</div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Describe your responsibility
                </p>
              </div>
              <div className="bg-white dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">A</div>
                <div className="font-medium text-purple-900 dark:text-purple-200">Action</div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Explain what you did
                </p>
              </div>
              <div className="bg-white dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">R</div>
                <div className="font-medium text-purple-900 dark:text-purple-200">Result</div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Share the outcome
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onPractice={() => {}}
                onBookmark={() => handleBookmark(question)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4 mb-4">
                {company.companyLogo ? (
                  <OptimizedImage src={toCloudinaryAutoUrl(company.companyLogo)} alt={company.company} width={48} height={48} className="w-12 h-12 rounded-lg object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl font-bold text-gray-400">
                    {company.company.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{company.company}</h3>
                  <p className="text-sm text-gray-500">{company.role}</p>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {company.interviewStages.length} interview stages • {company.commonQuestions.length} sample questions
              </div>

              <Button variant="outline" size="sm" className="w-full">
                View Interview Guide
              </Button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {sessionHistory.length > 0 ? (
            <div className="space-y-4">
              {sessionHistory.map((session) => (
                <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                      {session.type} Practice
                    </h3>
                    <p className="text-sm text-gray-500">
                      {session.questions.length} questions • {session.duration} minutes
                    </p>
                    {session.completedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(session.completedAt).toLocaleDateString('en-AU')}
                      </p>
                    )}
                  </div>
                  {session.score !== undefined && (
                    <div className={`px-4 py-2 rounded-lg font-semibold ${
                      session.score >= 80 ? 'bg-green-100 text-green-700' :
                      session.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {session.score}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No practice sessions yet</h3>
              <p className="text-gray-500 mt-2 mb-4">Start practicing to track your progress</p>
              <Button onClick={startQuickPractice}>Start Practice</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InterviewPrep;
