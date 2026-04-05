'use client';

import React from 'react';

function uniqStrings(items: (string | { name: string } | null | undefined)[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const s = String((typeof item === 'string' ? item : item?.name) || '').trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}

function pickTopSkillNames(skills: (string | { name: string })[], limit: number): string[] {
    if (!Array.isArray(skills) || skills.length === 0) return [];
    return uniqStrings(skills).slice(0, Math.max(0, limit));
}

function formatList(names: string[]): string {
    if (!names || names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

interface JobMatchExplanationProps {
    matchPercentage: number;
    jobTitle: string;
    matchedSkills?: (string | { name: string })[];
    missingSkills?: (string | { name: string })[];
    underqualifiedSkills?: (string | { name: string })[];
    maxExamples?: number;
    className?: string;
}

/**
 * JobMatchExplanation
 *
 * Deterministic, UI-only helper explaining a match score.
 */
export default function JobMatchExplanation({
    matchPercentage,
    jobTitle,
    matchedSkills = [],
    missingSkills = [],
    underqualifiedSkills = [],
    maxExamples = 3,
    className = '',
}: JobMatchExplanationProps) {
    const pct = Number.isFinite(matchPercentage) ? Math.max(0, Math.min(100, Math.round(matchPercentage))) : 0;
    
    const matchedNames = pickTopSkillNames(matchedSkills, maxExamples);
    const missingNames = pickTopSkillNames(missingSkills, maxExamples);

    let message = '';
    let colorClass = 'text-gray-600';

    if (pct >= 90) {
        message = `Excellent match! You have strong skills for this ${jobTitle} role`;
        if (matchedNames.length > 0) {
            message += `, including ${formatList(matchedNames)}.`;
        }
        colorClass = 'text-green-700 bg-green-50 border-green-200';
    } else if (pct >= 70) {
        message = `Good match. You have most of the core skills`;
        if (matchedNames.length > 0) {
            message += ` like ${formatList(matchedNames)}`;
        }
        if (missingNames.length > 0) {
            message += `, but might need to brush up on ${formatList(missingNames)}.`;
        }
        colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (pct >= 50) {
        message = `Potential match. You have some transferable skills`;
        if (matchedNames.length > 0) {
            message += ` (${formatList(matchedNames)})`;
        }
        if (missingNames.length > 0) {
            message += `, but this role requires ${formatList(missingNames)}.`;
        }
        colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
        message = `This role might be a stretch. It requires specific skills`;
        if (missingNames.length > 0) {
            message += ` such as ${formatList(missingNames)}`;
        }
        message += ` that aren't on your profile yet.`;
        colorClass = 'text-gray-700 bg-gray-50 border-gray-200';
    }

    return (
        <div className={`p-4 rounded-lg border text-sm ${colorClass} ${className}`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{pct}%</span>
                <span className="font-semibold">Match Score</span>
            </div>
            <p>{message}</p>
        </div>
    );
}
