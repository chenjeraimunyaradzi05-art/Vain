'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Skills Gap Analysis Component
 * Shows user's skills compared to job requirements
 */
export default function SkillsGapAnalysis({ jobId, onCoursesClick }) {
    const { isAuthenticated, user } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchAnalysis = useCallback(async () => {
        try {
            const { ok, data } = await api(`/skills/gap/${jobId}`);
            
            if (!ok) throw new Error('Failed to fetch skills analysis');
            
            setAnalysis(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [jobId]);
    
    useEffect(() => {
        if (jobId) {
            fetchAnalysis();
        }
    }, [fetchAnalysis, jobId]);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
            </div>
        );
    }
    
    if (!analysis) {
        return null;
    }
    
    const matchPercentage = analysis.matchPercentage || 0;
    const matchedSkills = analysis.matchedSkills || [];
    const missingSkills = analysis.missingSkills || [];
    const partialSkills = analysis.partialSkills || [];
    
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Skills Match Analysis</h3>
                <div className={`text-2xl font-bold ${
                    matchPercentage >= 80 ? 'text-green-600' :
                    matchPercentage >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                }`}>
                    {matchPercentage}% Match
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            matchPercentage >= 80 ? 'bg-green-500' :
                            matchPercentage >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                        }`}
                        style={{ width: `${matchPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>
            
            {/* Matched Skills */}
            {matchedSkills.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Skills You Have ({matchedSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {matchedSkills.map((skill) => (
                            <span
                                key={skill.id || skill.name}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700"
                            >
                                {skill.name}
                                {skill.level && (
                                    <span className="ml-1 text-green-500">
                                        ({skill.level}/5)
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Partial Skills */}
            {partialSkills.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Skills to Improve ({partialSkills.length})
                    </h4>
                    <div className="space-y-2">
                        {partialSkills.map((skill) => (
                            <div
                                key={skill.id || skill.name}
                                className="flex items-center justify-between bg-yellow-50 rounded-lg px-3 py-2"
                            >
                                <span className="text-yellow-800">{skill.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-600 text-sm">
                                        Level {skill.currentLevel || 0} → {skill.requiredLevel || 3}
                                    </span>
                                    <div className="w-20 h-2 bg-yellow-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full"
                                            style={{ 
                                                width: `${((skill.currentLevel || 0) / (skill.requiredLevel || 3)) * 100}%` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Missing Skills */}
            {missingSkills.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Skills to Learn ({missingSkills.length})
                    </h4>
                    <div className="space-y-2">
                        {missingSkills.map((skill) => (
                            <div
                                key={skill.id || skill.name}
                                className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-red-800">{skill.name}</span>
                                    {skill.required && (
                                        <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">
                                            Required
                                        </span>
                                    )}
                                </div>
                                {skill.suggestedCourse && (
                                    <button
                                        onClick={() => onCoursesClick?.(skill.suggestedCourse)}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View Course →
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-600">
                                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* CTA */}
            {missingSkills.length > 0 && (
                <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Ready to upskill?</p>
                        <p className="text-sm text-gray-600">
                            Find courses to fill your skills gap
                        </p>
                    </div>
                    <button
                        onClick={() => onCoursesClick?.()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                        Browse Courses
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Mini skills match badge for job cards
 */
export function SkillsMatchBadge({ matchPercentage }) {
    if (matchPercentage === undefined || matchPercentage === null) {
        return null;
    }
    
    const color = matchPercentage >= 80 ? 'green' :
                  matchPercentage >= 50 ? 'yellow' : 'red';
    
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${color}-100 text-${color}-700`}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {matchPercentage}% Match
        </span>
    );
}
