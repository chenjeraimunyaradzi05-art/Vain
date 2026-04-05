"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../../hooks/useAuth';

export default function MemberSkillsPage() {
    const { token } = useAuth();

    const [mySkills, setMySkills] = useState([]);
    const [trending, setTrending] = useState([]);
    const [upgradable, setUpgradable] = useState([]);
    const [recommendedCourses, setRecommendedCourses] = useState([]);

    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const apiBase = API_BASE;

    const mySkillIds = useMemo(() => {
        return new Set((mySkills || []).map((us) => us.skillId || us.skill?.id));
    }, [mySkills]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                const [myRes, recRes, courseRes] = await Promise.all([
                    fetch(`${apiBase}/skills/user/me`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiBase}/skills/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiBase}/courses/recommendations?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                const [myJson, recJson, courseJson] = await Promise.all([
                    myRes.ok ? myRes.json() : null,
                    recRes.ok ? recRes.json() : null,
                    courseRes.ok ? courseRes.json() : null,
                ]);

                if (!mounted) return;
                if (myJson?.skills) setMySkills(myJson.skills);
                if (recJson?.trending) setTrending(recJson.trending);
                if (recJson?.upgradable) setUpgradable(recJson.upgradable);
                if (Array.isArray(courseJson?.courses)) setRecommendedCourses(courseJson.courses);
            } catch (e) {
                // ignore
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [token, apiBase]);

    useEffect(() => {
        if (!token) return;
        if (!search || search.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        let mounted = true;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${apiBase}/skills?search=${encodeURIComponent(search.trim())}&limit=20`);
                const json = await res.json().catch(() => null);
                if (!mounted) return;
                setSearchResults(json?.skills || []);
            } catch (e) {
                if (!mounted) return;
                setSearchResults([]);
            }
        }, 250);

        return () => {
            mounted = false;
            clearTimeout(t);
        };
    }, [search, token, apiBase]);

    async function addSkill(skillId) {
        if (!token) return;
        setSavingId(skillId);
        try {
            const res = await fetch(`${apiBase}/skills/user`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ skillId, level: 'beginner' }),
            });
            if (res.ok) {
                const j = await res.json();
                const userSkill = j.userSkill;
                setMySkills((prev) => {
                    const next = Array.isArray(prev) ? [...prev] : [];
                    const existingIdx = next.findIndex((x) => x.skillId === userSkill.skillId);
                    if (existingIdx >= 0) next[existingIdx] = userSkill;
                    else next.unshift(userSkill);
                    return next;
                });
            }
        } finally {
            setSavingId(null);
        }
    }

    async function removeSkill(skillId) {
        if (!token) return;
        setSavingId(skillId);
        try {
            const res = await fetch(`${apiBase}/skills/user/${skillId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setMySkills((prev) => (prev || []).filter((x) => (x.skillId || x.skill?.id) !== skillId));
            }
        } finally {
            setSavingId(null);
        }
    }

    if (!token) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4">
                <h1 className="text-2xl font-bold mb-2">Skills</h1>
                <p className="text-slate-300">Please sign in to manage your skills.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Skills</li>
                </ol>
            </nav>

            <h1 className="text-2xl font-bold mb-2">Skills</h1>
            <p className="text-slate-300 mb-6">Track your skills and get course recommendations.</p>

            {loading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
                    <span className="text-slate-400">Loading skills…</span>
                </div>
            ) : (
                <>
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg mb-6">
                        <h2 className="font-semibold mb-3">Add a skill</h2>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search skills…"
                            className="w-full px-4 py-2 bg-slate-950/40 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />

                        {searchResults.length > 0 && (
                            <div className="mt-3 border border-slate-800 rounded-lg overflow-hidden">
                                {searchResults.slice(0, 8).map((s) => {
                                    const already = mySkillIds.has(s.id);
                                    return (
                                        <div key={s.id} className="flex items-center justify-between px-4 py-2 bg-slate-950/30 border-b border-slate-800 last:border-b-0">
                                            <div>
                                                <div className="text-sm text-slate-100">{s.name}</div>
                                                {s.category && <div className="text-xs text-slate-400">{s.category}</div>}
                                            </div>
                                            {already ? (
                                                <span className="text-xs text-green-300">✓ Added</span>
                                            ) : (
                                                <button
                                                    onClick={() => addSkill(s.id)}
                                                    disabled={savingId === s.id}
                                                    className="px-3 py-1 text-xs border border-slate-700 rounded hover:bg-slate-900 disabled:opacity-60"
                                                >
                                                    {savingId === s.id ? 'Adding…' : 'Add'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg mb-6">
                        <h2 className="font-semibold mb-4">Your skills</h2>
                        {mySkills.length === 0 ? (
                            <div className="text-slate-400">No skills added yet.</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {mySkills.map((us) => {
                                    const skill = us.skill || {};
                                    const skillId = us.skillId || skill.id;
                                    return (
                                        <span key={us.id || skillId} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm">
                                            <span className="text-slate-100">{skill.name || 'Skill'}</span>
                                            <button
                                                onClick={() => removeSkill(skillId)}
                                                disabled={savingId === skillId}
                                                className="text-slate-400 hover:text-slate-200"
                                                aria-label={`Remove ${skill.name || 'skill'}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {(trending.length > 0 || upgradable.length > 0) && (
                        <div className="grid gap-4 md:grid-cols-2 mb-6">
                            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg">
                                <h2 className="font-semibold mb-4">Trending skills</h2>
                                {trending.length === 0 ? (
                                    <div className="text-slate-400">No trending skills yet.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {trending.slice(0, 8).map((s) => (
                                            <div key={s.id} className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm text-slate-100">{s.name}</div>
                                                    <div className="text-xs text-slate-400">Demand: {s.demandCount || 0}</div>
                                                </div>
                                                {mySkillIds.has(s.id) ? (
                                                    <span className="text-xs text-green-300">✓ Added</span>
                                                ) : (
                                                    <button
                                                        onClick={() => addSkill(s.id)}
                                                        disabled={savingId === s.id}
                                                        className="px-3 py-1 text-xs border border-slate-700 rounded hover:bg-slate-900 disabled:opacity-60"
                                                    >
                                                        {savingId === s.id ? 'Adding…' : 'Add'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg">
                                <h2 className="font-semibold mb-4">Skills you can level up</h2>
                                {upgradable.length === 0 ? (
                                    <div className="text-slate-400">No suggestions yet.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {upgradable.slice(0, 8).map((s) => (
                                            <div key={s.skillId} className="flex items-center justify-between">
                                                <div className="text-sm text-slate-100">{s.skillId}</div>
                                                <span className="text-xs text-slate-400">Current: {s.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg">
                        <h2 className="font-semibold mb-4">Recommended courses</h2>
                        {recommendedCourses.length === 0 ? (
                            <div className="text-slate-400">No course recommendations available.</div>
                        ) : (
                            <div className="space-y-3">
                                {recommendedCourses.map((c) => (
                                    <a
                                        key={c.id}
                                        href={`/courses/${c.id}`}
                                        className="block p-3 bg-slate-950/30 border border-slate-800 rounded hover:bg-slate-900 transition-colors"
                                    >
                                        <div className="text-sm font-medium text-slate-100">{c.title}</div>
                                        <div className="text-xs text-slate-400">{c.duration || 'Varies'}{c.provider ? ` • ${c.provider}` : ''}</div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
