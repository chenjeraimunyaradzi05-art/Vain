"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import api from '../../../lib/api';

const DEMO_COURSES = [
    {
        id: '1',
        title: 'Certificate III in Information Technology',
        provider: 'TAFE NSW',
        providerType: 'tafe',
        category: 'tech',
        duration: '12 months',
        format: 'Blended',
        price: 0,
        isFree: true,
        description: 'Learn foundational IT skills including networking, security, and support.',
        rating: 4.7,
        enrollments: 1250,
        culturallyRelevant: true,
    },
    {
        id: '2',
        title: 'Project Management Fundamentals',
        provider: 'LinkedIn Learning',
        providerType: 'online',
        category: 'business',
        duration: '6 weeks',
        format: 'Online',
        price: 2999,
        isFree: false,
        description: 'Master project management principles and methodologies.',
        rating: 4.5,
        enrollments: 8500,
        culturallyRelevant: false,
    },
    {
        id: '3',
        title: 'White Card Training',
        provider: 'SafeWork Australia',
        providerType: 'rto',
        category: 'health',
        duration: '1 day',
        format: 'In-person',
        price: 9900,
        isFree: false,
        description: 'General construction induction for working safely on construction sites.',
        rating: 4.8,
        enrollments: 15000,
        culturallyRelevant: false,
    },
    {
        id: '4',
        title: 'Indigenous Business Leadership Program',
        provider: 'First Nations Foundation',
        providerType: 'rto',
        category: 'leadership',
        duration: '3 months',
        format: 'Blended',
        price: 0,
        isFree: true,
        description: 'Develop leadership skills grounded in Indigenous values and business acumen.',
        rating: 4.9,
        enrollments: 450,
        culturallyRelevant: true,
    },
    {
        id: '5',
        title: 'Certificate IV in Plumbing',
        provider: 'TAFE QLD',
        providerType: 'tafe',
        category: 'trades',
        duration: '2 years',
        format: 'Apprenticeship',
        price: 0,
        isFree: true,
        description: 'Complete plumbing qualification through hands-on apprenticeship.',
        rating: 4.6,
        enrollments: 890,
        culturallyRelevant: false,
    },
];

function CourseDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id;

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cancelled = searchParams?.get('cancelled') === 'true';

    const demoCourse = useMemo(() => {
        if (!id) return null;
        return DEMO_COURSES.find((c) => String(c.id) === String(id)) || null;
    }, [id]);

    useEffect(() => {
        if (!id) return;
        let mounted = true;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await api(`/courses/${id}`);
                if (!mounted) return;

                if (res.ok && res.data?.course) {
                    setCourse(res.data.course);
                    return;
                }

                if (demoCourse) {
                    setCourse(demoCourse);
                    return;
                }

                setError(res.data?.error || 'Course not found');
            } catch (e) {
                if (!mounted) return;
                if (demoCourse) {
                    setCourse(demoCourse);
                } else {
                    setError('Failed to load course');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [id, demoCourse]);

    const title = course?.title || course?.name || 'Course';
    const provider = course?.provider || course?.providerName || 'Unknown';
    const duration = course?.duration || (course?.durationWeeks ? `${course.durationWeeks} weeks` : 'Varies');
    const location = course?.location || course?.format || course?.deliveryMode || 'On-campus';

    const priceValue =
        typeof course?.price === 'number'
            ? course.price
            : typeof course?.priceInCents === 'number'
                ? course.priceInCents / 100
                : typeof course?.price === 'string'
                    ? Number(course.price)
                    : typeof course?.priceInCents === 'string'
                        ? Number(course.priceInCents) / 100
                        : typeof course?.price === 'undefined' && typeof course?.priceInCents === 'undefined'
                            ? null
                            : null;

    const isFree =
        course?.isFree === true ||
        priceValue === 0 ||
        priceValue === null;

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-10">
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><span className="bg-slate-700 rounded w-20 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-16 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-32 h-4 inline-block animate-pulse"></span></li>
                    </ol>
                </nav>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
                    <div className="h-7 bg-slate-700 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2 mb-6"></div>
                    <div className="h-24 bg-slate-800 rounded w-full mb-6"></div>
                    <div className="h-10 bg-slate-800 rounded w-40"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/courses" className="hover:text-blue-400 transition-colors">Courses</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">{title}</li>
                </ol>
            </nav>

            {cancelled && (
                <div className="mb-6 p-4 rounded-lg border border-yellow-700/50 bg-yellow-900/20 text-yellow-200">
                    Enrolment cancelled — you can try again anytime.
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-lg border border-red-700/50 bg-red-900/20 text-red-200">
                    {String(error)}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm text-slate-400">{provider}</div>
                            <h1 className="text-2xl font-bold mt-1">{title}</h1>
                        </div>
                        {course?.culturallyRelevant && (
                            <span className="px-3 py-1 bg-amber-900/40 text-amber-200 text-xs rounded-full h-fit">
                                🔸 Culturally Relevant
                            </span>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">⏱️ {duration}</span>
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">📍 {location}</span>
                        <span
                            className={`px-2 py-1 text-xs rounded ${isFree ? 'bg-green-900/40 text-green-200' : 'bg-slate-800 text-slate-300'}`}
                        >
                            {isFree ? '✓ Free' : priceValue !== null ? `$${Number(priceValue).toLocaleString()}` : 'Paid'}
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    <h2 className="font-semibold text-slate-100 mb-2">About this course</h2>
                    <p className="text-slate-300 leading-relaxed">
                        {course?.description || 'No description available.'}
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <Link
                            href={`/courses/${id}/enroll`}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-700 bg-green-900/20 hover:bg-green-900/40 transition-colors"
                        >
                            Enrol now
                        </Link>
                        <a
                            href="/courses"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-700 bg-slate-950/30 hover:bg-slate-900 transition-colors"
                        >
                            Back to courses
                        </a>
                    </div>

                    {course?.url && (
                        <div className="mt-6 text-sm text-slate-400">
                            External link:{' '}
                            <a className="text-blue-300 hover:text-blue-200 underline" href={course.url} target="_blank" rel="noreferrer">
                                {course.url}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Loading fallback for Suspense
function CourseDetailLoading() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><span className="bg-slate-700 rounded w-20 h-4 inline-block animate-pulse"></span></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><span className="bg-slate-700 rounded w-16 h-4 inline-block animate-pulse"></span></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><span className="bg-slate-700 rounded w-32 h-4 inline-block animate-pulse"></span></li>
                </ol>
            </nav>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
                <div className="h-7 bg-slate-700 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2 mb-6"></div>
                <div className="h-24 bg-slate-800 rounded w-full mb-6"></div>
                <div className="h-10 bg-slate-800 rounded w-40"></div>
            </div>
        </div>
    );
}

// Wrap with Suspense to handle useSearchParams on server
export default function CourseDetailPage() {
    return (
        <Suspense fallback={<CourseDetailLoading />}>
            <CourseDetailContent />
        </Suspense>
    );
}
