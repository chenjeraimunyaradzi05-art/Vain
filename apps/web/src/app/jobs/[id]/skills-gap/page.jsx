'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import JobMatchExplanation from '@/components/JobMatchExplanation';

/**
 * Job Skills Gap Analysis Page
 * /jobs/[id]/skills-gap
 */
export default function JobSkillsGapPage() {
    const params = useParams();
    const jobId = params.id;

    const [job, setJob] = useState(null);
    const [skillsGap, setSkillsGap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [jobId]);

    function normalizeGap(raw) {
        if (!raw) return null;

        const levelToDots = (lvl) => {
            const m = { beginner: 1, intermediate: 2, advanced: 3, expert: 3 };
            if (typeof lvl === 'number') return Math.max(1, Math.min(3, lvl));
            return m[String(lvl || '').toLowerCase()] || 2;
        };

        const matchPercentage =
            typeof raw.matchPercentage === 'number'
                ? raw.matchPercentage
                : typeof raw.matchScore === 'number'
                    ? raw.matchScore
                    : 0;

        const matchedSkills = (raw.matchedSkills || []).map((s) => {
            if (s?.skill) {
                return {
                    id: s.skill.id,
                    name: s.skill.name,
                    description: s.skill.description || '',
                    level: levelToDots(s.userLevel),
                };
            }
            return {
                id: s.id,
                name: s.name,
                description: s.description || '',
                level: levelToDots(s.level),
            };
        });

        const missingSkills = (raw.missingSkills || []).map((s) => {
            if (s?.skill) {
                return {
                    id: s.skill.id,
                    name: s.skill.name,
                    description: s.skill.description || '',
                    required: !!s.required,
                    minLevel: s.minLevel || null,
                };
            }
            return {
                id: s.id,
                name: s.name,
                description: s.description || '',
                required: !!s.required,
                minLevel: s.minLevel || null,
            };
        });

        const underqualifiedSkills = (raw.underqualifiedSkills || []).map((s) => {
            if (s?.skill) {
                return {
                    id: s.skill.id,
                    name: s.skill.name,
                    description: s.skill.description || '',
                    required: !!s.required,
                    userLevel: s.userLevel,
                    requiredLevel: s.requiredLevel || s.minLevel,
                };
            }
            return s;
        });

        const recommendedCourses = (raw.recommendedCourses || []).map((c) => ({
            id: c.id,
            name: c.title || c.name || 'Course',
            provider: c.provider || c.providerName || null,
            duration: c.duration || 'Varies',
            price: typeof c.price === 'number' ? c.price : null,
        }));

        return {
            matchPercentage,
            matchedSkills,
            missingSkills,
            underqualifiedSkills,
            recommendedCourses,
        };
    }

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch job details
            const jobRes = await api(`/jobs/${jobId}`);
            if (jobRes.ok) {
                const jobData = jobRes.data;
                setJob(jobData?.job || jobData);
            }

            // Fetch skills gap analysis
            const gapRes = await api(`/skills/gap-analysis/${jobId}`);
            if (gapRes.ok) {
                setSkillsGap(normalizeGap(gapRes.data));
            } else {
                setSkillsGap(null);
            }
        } catch (err) {
            console.error('Failed to load skills gap:', err);
            // Demo data
            setJob({
                title: 'Construction Laborer',
                company: 'BuildRight Australia',
                location: 'Sydney, NSW',
            });
            setSkillsGap(normalizeGap({
                matchedSkills: [
                    { id: '1', name: 'Communication', level: 3, description: 'Strong verbal and written skills' },
                    { id: '2', name: 'Teamwork', level: 2, description: 'Experience working in teams' },
                    { id: '5', name: 'Physical Fitness', level: 3, description: 'Ability to perform manual labor' },
                ],
                missingSkills: [
                    { id: '3', name: 'White Card', required: true, description: 'General Construction Induction Card' },
                    { id: '4', name: 'Forklift License', required: false, description: 'High Risk Work License' },
                ],
                matchPercentage: 60,
                recommendedCourses: [
                    { id: '1', name: 'White Card Training', provider: 'TAFE NSW', price: 120, duration: '1 day' },
                    { id: '2', name: 'Forklift License Course', provider: 'Skill Set Training', price: 450, duration: '2 days' },
                ],
            }));
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
                <span className="text-slate-400">Analyzing your skills...</span>
            </div>
        );
    }

    const matchColor = skillsGap?.matchPercentage >= 80 ? 'text-green-400' :
                       skillsGap?.matchPercentage >= 50 ? 'text-yellow-400' :
                       'text-red-400';

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/jobs" className="hover:text-blue-400 transition-colors">Jobs</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href={`/jobs/${jobId}`} className="hover:text-blue-400 transition-colors">{job?.title || 'Job'}</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Skills Gap</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Skills Gap Analysis</h1>
                <p className="text-slate-300">
                    See how your skills match with <span className="font-medium">{job?.title}</span>
                </p>
            </div>

            {!skillsGap && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8 text-slate-300">
                    Sign in to view your personalised skills gap analysis.
                    <div className="mt-2">
                        <span className="text-blue-400">Sign-in disabled</span>
                    </div>
                </div>
            )}

            {/* Match Score */}
            {skillsGap && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8 text-center">
                    <div className={`text-5xl font-bold mb-2 ${matchColor}`}>
                        {skillsGap.matchPercentage}%
                    </div>
                    <div className="text-slate-300">Skills Match</div>
                    <div className="mt-4 max-w-md mx-auto">
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${skillsGap.matchPercentage >= 80 ? 'bg-green-500' : skillsGap.matchPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${skillsGap.matchPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {skillsGap && (
                <div className="mb-8">
                    <JobMatchExplanation
                        matchPercentage={skillsGap.matchPercentage}
                        jobTitle={job?.title}
                        matchedSkills={skillsGap.matchedSkills}
                        missingSkills={skillsGap.missingSkills}
                        underqualifiedSkills={skillsGap.underqualifiedSkills}
                    />
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Matched Skills */}
                {skillsGap?.matchedSkills && skillsGap.matchedSkills.length > 0 && (
                    <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 text-green-300 flex items-center gap-2">
                            <span>✓</span> Matched Skills
                        </h2>
                        <ul className="space-y-3">
                            {skillsGap.matchedSkills.map((skill) => (
                                <li key={skill.id} className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{skill.name}</div>
                                        {skill.description && (
                                            <div className="text-sm text-slate-400">{skill.description}</div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map((level) => (
                                            <div 
                                                key={level}
                                                className={`w-3 h-3 rounded-full ${level <= skill.level ? 'bg-green-500' : 'bg-slate-700'}`}
                                            />
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Missing Skills */}
                {skillsGap?.missingSkills && skillsGap.missingSkills.length > 0 && (
                    <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 text-red-300 flex items-center gap-2">
                            <span>✗</span> Skills to Develop
                        </h2>
                        <ul className="space-y-3">
                            {skillsGap.missingSkills.map((skill) => (
                                <li key={skill.id} className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {skill.name}
                                            {skill.required && (
                                                <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded">Required</span>
                                            )}
                                        </div>
                                        {skill.description && (
                                            <div className="text-sm text-slate-400">{skill.description}</div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Recommended Courses */}
            {skillsGap?.recommendedCourses && skillsGap.recommendedCourses.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Recommended Training</h2>
                    <div className="space-y-4">
                        {skillsGap.recommendedCourses.map((course) => (
                            <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{course.name}</div>
                                    <div className="text-sm text-slate-400">
                                        {(course.provider || 'Provider')} • {course.duration}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {typeof course.price === 'number' ? (
                                        <div className="font-semibold text-blue-400">${course.price}</div>
                                    ) : (
                                        <div className="font-semibold text-slate-400">—</div>
                                    )}
                                    <Link 
                                        href={`/courses/${course.id}`}
                                        className="text-sm text-blue-400 hover:underline"
                                    >
                                        View course →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="mt-8 text-center">
                <Link
                    href={`/jobs/${jobId}/recommended-courses`}
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    View All Recommended Courses
                </Link>
            </div>
        </div>
    );
}
