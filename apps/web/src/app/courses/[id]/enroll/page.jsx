"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import useAuth from '../../../../hooks/useAuth';

const DEMO_COURSES = [
    {
        id: '1',
        title: 'Certificate III in Information Technology',
        provider: 'TAFE NSW',
        duration: '12 months',
        format: 'Blended',
        price: 0,
        isFree: true,
        description: 'Learn foundational IT skills including networking, security, and support.',
    },
    {
        id: '2',
        title: 'Project Management Fundamentals',
        provider: 'LinkedIn Learning',
        duration: '6 weeks',
        format: 'Online',
        price: 2999,
        isFree: false,
        description: 'Master project management principles and methodologies.',
    },
    {
        id: '3',
        title: 'White Card Training',
        provider: 'SafeWork Australia',
        duration: '1 day',
        format: 'In-person',
        price: 9900,
        isFree: false,
        description: 'General construction induction for working safely on construction sites.',
    },
];

export default function CourseEnrollPage() {
    const { user, isAuthenticated } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

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

    async function enroll() {
        if (!id) return;
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            // Prefer internal enrol endpoint.
            const internal = await api(`/courses/${id}/enrol`, {
                method: 'POST',
                body: JSON.stringify({}),
            });

            if (internal.ok) {
                setSuccess('Successfully enrolled in course.');
                return;
            }

            // If internal course is missing, try external course payment flow.
            const msg = internal.data?.error || '';
            const shouldTryExternal =
                internal.status === 404 ||
                String(msg).toLowerCase().includes('course not found');

            if (shouldTryExternal) {
                const external = await api('/course-payments/enrol', {
                    method: 'POST',
                    body: JSON.stringify({ courseId: String(id) }),
                });

                if (external.ok && external.data?.checkoutUrl) {
                    window.location.href = external.data.checkoutUrl;
                    return;
                }

                if (external.ok && external.data?.success) {
                    setSuccess(external.data?.message || 'Enrolled successfully.');
                    return;
                }

                setError(external.data?.error || 'Failed to enrol');
                return;
            }

            setError(internal.data?.error || 'Failed to enrol');
        } catch (e) {
            setError('Failed to enrol');
        } finally {
            setSubmitting(false);
        }
    }

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
                        : null;

    const isFree = course?.isFree === true || priceValue === 0 || priceValue === null;

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-10">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
                    <div className="h-6 bg-slate-700 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2 mb-6"></div>
                    <div className="h-10 bg-slate-800 rounded w-40"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/courses" className="hover:text-blue-400 transition-colors">Courses</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href={`/courses/${id}`} className="hover:text-blue-400 transition-colors">{title}</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Enroll</li>
                </ol>
            </nav>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <div className="text-sm text-slate-400">{provider}</div>
                    <h1 className="text-2xl font-bold mt-1">Enroll in course</h1>
                    <div className="mt-3 text-slate-300">{title}</div>
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
                    {!token && (
                        <div className="mb-4 p-3 rounded border border-yellow-700/50 bg-yellow-900/20 text-yellow-200 text-sm">
                            Please sign in to enroll.
                            <div className="mt-2">
                                <span className="text-blue-300">Sign-in disabled</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded border border-red-700/50 bg-red-900/20 text-red-200 text-sm">
                            {String(error)}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 rounded border border-green-700/50 bg-green-900/20 text-green-200 text-sm">
                            {String(success)}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={enroll}
                            disabled={!token || submitting}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-700 bg-green-900/20 hover:bg-green-900/40 transition-colors disabled:opacity-60"
                        >
                            {submitting ? 'Enrolling…' : 'Confirm enrollment'}
                        </button>
                        <button
                            onClick={() => router.push(`/courses/${id}`)}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-700 bg-slate-950/30 hover:bg-slate-900 transition-colors"
                        >
                            Back
                        </button>
                    </div>

                    {success && (
                        <div className="mt-4 text-sm text-slate-400">
                            Next: <a href="/member/training" className="text-blue-300 hover:text-blue-200 underline">view your training</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
