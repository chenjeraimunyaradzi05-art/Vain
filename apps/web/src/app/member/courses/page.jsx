'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Member Courses Page - View enrolled courses and progress
 * /member/courses
 */
export default function MemberCoursesPage() {
    const [enrolments, setEnrolments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [activeEnrolmentId, setActiveEnrolmentId] = useState(null);
    const [progressDetails, setProgressDetails] = useState({});
    const [updatingLessonId, setUpdatingLessonId] = useState(null);

    const filters = [
        { value: 'all', label: 'All Courses' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'not-started', label: 'Not Started' },
    ];

    // Skeleton loading component
    function CourseSkeleton() {
        return (
            <div className="animate-pulse">
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
                            <div className="h-8 w-16 bg-slate-700 rounded mx-auto mb-2" />
                            <div className="h-4 w-20 bg-slate-800 rounded mx-auto" />
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="h-5 w-3/4 bg-slate-700 rounded mb-2" />
                                    <div className="h-4 w-1/4 bg-slate-800 rounded" />
                                </div>
                                <div className="h-6 w-20 bg-slate-700 rounded-full" />
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full mb-2" />
                            <div className="h-4 w-1/3 bg-slate-800 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    useEffect(() => {
        fetchEnrolments();
    }, []);

    async function fetchEnrolments() {
        setLoading(true);
        try {
            // Try course-payments endpoint (for tests) then fall back
            let res = await api('/course-payments/my-enrolments');
            
            if (!res.ok) {
                res = await api('/courses/enrolments');
            }
            
            if (!res.ok) throw new Error('Failed to load courses');
            
            const data = res.data;
            setEnrolments(data?.enrolments || data);
        } catch (err) {
            // Demo enrolments
            setEnrolments([
                {
                    id: '1',
                    courseId: '1',
                    courseTitle: 'Certificate III in Information Technology',
                    provider: 'TAFE NSW',
                    enrolledAt: '2024-11-15T00:00:00Z',
                    progress: 65,
                    status: 'in-progress',
                    nextLesson: 'Networking Fundamentals',
                    dueDate: '2025-02-28',
                    certificateUrl: null,
                },
                {
                    id: '2',
                    courseId: '4',
                    courseTitle: 'Indigenous Business Leadership Program',
                    provider: 'First Nations Foundation',
                    enrolledAt: '2024-08-01T00:00:00Z',
                    progress: 100,
                    status: 'completed',
                    completedAt: '2024-11-30T00:00:00Z',
                    nextLesson: null,
                    dueDate: null,
                    certificateUrl: '/certificates/leadership-2024.pdf',
                },
                {
                    id: '3',
                    courseId: '3',
                    courseTitle: 'White Card Training',
                    provider: 'SafeWork Australia',
                    enrolledAt: '2025-01-10T00:00:00Z',
                    progress: 0,
                    status: 'not-started',
                    nextLesson: 'Introduction to Construction Safety',
                    dueDate: '2025-01-25',
                    certificateUrl: null,
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function loadProgress(enrolmentId) {
        if (!enrolmentId) return;
        try {
            const res = await api(`/courses/enrolments/${enrolmentId}/progress`);
            if (res.ok) {
                setProgressDetails(prev => ({ ...prev, [enrolmentId]: res.data }));
            }
        } catch {
            // ignore
        }
    }

    async function completeLesson(enrolmentId, lessonId) {
        if (!enrolmentId || !lessonId) return;
        setUpdatingLessonId(lessonId);
        try {
            const res = await api(`/courses/enrolments/${enrolmentId}/lessons/${lessonId}/complete`, { method: 'POST' });
            if (res.ok) {
                setProgressDetails(prev => ({ ...prev, [enrolmentId]: res.data }));
                const normalizedStatus = res.data.status ? res.data.status.toLowerCase().replace('_', '-') : null;
                setEnrolments(prev => prev.map(e => (
                    e.id === enrolmentId
                        ? { ...e, progress: res.data.progress, status: normalizedStatus || e.status, nextLesson: res.data.nextLesson, completedAt: res.data.status === 'COMPLETED' ? new Date().toISOString() : e.completedAt, completedLessons: res.data.completedLessons, totalLessons: res.data.totalLessons }
                        : e
                )));
            }
        } catch {
            // ignore
        } finally {
            setUpdatingLessonId(null);
        }
    }

    const filteredEnrolments = enrolments.filter(e => 
        filter === 'all' || e.status === filter
    );

    const stats = {
        total: enrolments.length,
        inProgress: enrolments.filter(e => e.status === 'in-progress').length,
        completed: enrolments.filter(e => e.status === 'completed').length,
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">My Courses</li>
                </ol>
            </nav>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Courses</h1>
                    <p className="text-slate-300">Track your learning progress</p>
                </div>
                <Link
                    href="/courses"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    Browse Courses
                </Link>
            </div>

            {loading ? (
                <CourseSkeleton />
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid gap-4 md:grid-cols-3 mb-8">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
                            <div className="text-sm text-slate-400">Total Enrolled</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-yellow-400">{stats.inProgress}</div>
                            <div className="text-sm text-slate-400">In Progress</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
                            <div className="text-sm text-slate-400">Completed</div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                                    filter === f.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                            <p className="text-red-200">{error}</p>
                        </div>
                    )}

                    {filteredEnrolments.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📖</div>
                            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                            <p className="text-slate-400 mb-6">
                                {filter === 'all' 
                                    ? "You haven't enrolled in any courses yet"
                                    : `No ${filter.replace('-', ' ')} courses`}
                            </p>
                            <Link
                                href="/courses"
                                className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                Explore Courses
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEnrolments.map((enrolment) => (
                                <EnrolmentCard
                                    key={enrolment.id}
                                    enrolment={enrolment}
                                    isActive={activeEnrolmentId === enrolment.id}
                                    progress={progressDetails[enrolment.id]}
                                    onToggle={() => {
                                        const nextId = activeEnrolmentId === enrolment.id ? null : enrolment.id;
                                        setActiveEnrolmentId(nextId);
                                        if (nextId) loadProgress(nextId);
                                    }}
                                    onCompleteLesson={completeLesson}
                                    updatingLessonId={updatingLessonId}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function EnrolmentCard({ enrolment, isActive, progress, onToggle, onCompleteLesson, updatingLessonId }) {
    const statusColors = {
        'in-progress': 'bg-yellow-900 text-yellow-300',
        'completed': 'bg-green-900 text-green-300',
        'not-started': 'bg-slate-700 text-slate-300',
    };

    const statusLabels = {
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'not-started': 'Not Started',
    };

    // Handle both nested course object and flat enrolment structure
    const courseTitle = enrolment.courseTitle || enrolment.course?.name || enrolment.course?.title || 'Untitled Course';
    const provider = enrolment.provider || enrolment.course?.provider || 'Unknown Provider';
    const progressValue = enrolment.progress ?? progress?.progress ?? 0;
    const lessonCount = progress?.totalLessons || enrolment.totalLessons;
    const completedCount = progress?.completedLessons || enrolment.completedLessons;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <Link 
                            href={`/courses/${enrolment.courseId}`}
                            className="font-semibold hover:text-blue-400 transition-colors"
                        >
                            {courseTitle}
                        </Link>
                        <div className="text-sm text-slate-400">{provider}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[enrolment.status] || 'bg-slate-700 text-slate-300'}`}>
                        {statusLabels[enrolment.status] || enrolment.status}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">Progress</span>
                        <span className="font-medium">{progressValue}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all ${
                                progressValue === 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressValue}%` }}
                        />
                    </div>
                    {(lessonCount || completedCount) && (
                        <div className="mt-2 text-xs text-slate-400">
                            Lessons: {completedCount || 0}/{lessonCount || 0}
                        </div>
                    )}
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                    {enrolment.nextLesson && (
                        <div>
                            <span className="text-slate-400">Next: </span>
                            <span className="text-slate-200">{enrolment.nextLesson}</span>
                        </div>
                    )}
                    {enrolment.dueDate && (
                        <div>
                            <span className="text-slate-400">Due: </span>
                            <span className="text-slate-200">
                                {new Date(enrolment.dueDate).toLocaleDateString('en-AU', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    )}
                    {enrolment.completedAt && (
                        <div>
                            <span className="text-slate-400">Completed: </span>
                            <span className="text-green-400">
                                {new Date(enrolment.completedAt).toLocaleDateString('en-AU', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                {enrolment.status === 'completed' ? (
                    <>
                        <span className="text-sm text-green-400">✓ Course Completed</span>
                        {enrolment.certificateUrl && (
                            <a
                                href={enrolment.certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                View Certificate →
                            </a>
                        )}
                    </>
                ) : (
                    <>
                        <span className="text-sm text-slate-400">
                            Enrolled {new Date(enrolment.enrolledAt).toLocaleDateString('en-AU')}
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onToggle}
                                className="text-sm text-slate-300 hover:text-white"
                            >
                                {isActive ? 'Hide lessons' : 'View lessons'}
                            </button>
                            <Link
                                href={`/courses/${enrolment.courseId}/learn`}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                {enrolment.status === 'not-started' ? 'Start Learning' : 'Continue'} →
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {isActive && progress?.lessons && (
                <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">Lesson timeline</h4>
                    <ol className="relative border-l border-slate-800 ml-3 space-y-4">
                        {progress.lessons.map((lesson) => (
                            <li key={lesson.id} className="ml-4">
                                <span
                                    className={`absolute -left-1.5 h-3 w-3 rounded-full ${
                                        lesson.completedAt ? 'bg-emerald-400' : 'bg-slate-600'
                                    }`}
                                />
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className={lesson.completedAt ? 'text-slate-400 line-through text-sm' : 'text-slate-200 text-sm'}>
                                            {lesson.title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {lesson.completedAt
                                                ? `Completed ${new Date(lesson.completedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`
                                                : 'Not started'}
                                        </div>
                                    </div>
                                    {!lesson.completedAt && (
                                        <button
                                            onClick={() => onCompleteLesson(enrolment.id, lesson.id)}
                                            disabled={updatingLessonId === lesson.id}
                                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                                        >
                                            {updatingLessonId === lesson.id ? 'Saving…' : 'Mark complete'}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
