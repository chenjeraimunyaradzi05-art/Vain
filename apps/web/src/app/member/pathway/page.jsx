"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, CheckCircle, Circle } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';

const DEFAULT_PATHWAY = {
  title: 'Career Pathway',
  description: 'A visual roadmap from where you are now to possible next roles, with skills to build along the way.',
  nodes: [
    {
      id: 'now',
      title: 'Where you are now',
      subtitle: 'Starting point',
      skills: [],
      next: ['role-1', 'role-2'],
    },
    {
      id: 'role-1',
      title: 'Site Support Trainee',
      subtitle: 'Entry role',
      skills: ['White Card', 'Workplace safety basics', 'Communication'],
      next: ['role-3'],
    },
    {
      id: 'role-2',
      title: 'Customer Service (Community)',
      subtitle: 'Entry role',
      skills: ['Communication', 'Customer focus', 'Digital basics'],
      next: ['role-4'],
    },
    {
      id: 'role-3',
      title: 'Operations Coordinator',
      subtitle: 'Growth role',
      skills: ['Scheduling', 'Stakeholder management', 'Incident reporting'],
      next: ['role-5'],
    },
    {
      id: 'role-4',
      title: 'Team Leader',
      subtitle: 'Growth role',
      skills: ['Leadership basics', 'Conflict resolution', 'Reporting'],
      next: ['role-5'],
    },
    {
      id: 'role-5',
      title: 'Program / Project Officer',
      subtitle: 'Future role',
      skills: ['Project planning', 'Budget literacy', 'Community engagement'],
      next: [],
    },
  ],
};

function normalizeSkillName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default function MemberPathwayPage() {
  const { token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const [selectedId, setSelectedId] = useState('now');
  const [loading, setLoading] = useState(true);
  const [pathways, setPathways] = useState([]);
  const [internships, setInternships] = useState([]);

  const apiBase = API_BASE;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [profileRes, skillsRes, pathwaysRes, internshipsRes] = await Promise.all([
          fetch(`${apiBase}/member/profile`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${apiBase}/skills/user/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch('/api/learning/pathways').catch(() => null),
          fetch('/api/learning/internships').catch(() => null),
        ]);

        if (!mounted) return;

        if (profileRes?.ok) {
          const p = await profileRes.json();
          setProfile(p?.profile || null);
        }

        if (skillsRes?.ok) {
          const s = await skillsRes.json();
          setMySkills(Array.isArray(s?.skills) ? s.skills : []);
        }

        if (pathwaysRes?.ok) {
          const p = await pathwaysRes.json();
          setPathways(Array.isArray(p?.pathways) ? p.pathways : []);
        }

        if (internshipsRes?.ok) {
          const i = await internshipsRes.json();
          setInternships(Array.isArray(i?.internships) ? i.internships : []);
        }
      } catch {
        // keep page usable even if API is unavailable
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token, apiBase]);

  const skillSet = useMemo(() => {
    const out = new Set();
    for (const row of mySkills || []) {
      const name = row?.skill?.name || row?.name;
      if (name) out.add(normalizeSkillName(name));
    }
    return out;
  }, [mySkills]);

  const nodesById = useMemo(() => {
    const map = new Map();
    for (const n of DEFAULT_PATHWAY.nodes) map.set(n.id, n);
    return map;
  }, []);

  const selected = nodesById.get(selectedId) || DEFAULT_PATHWAY.nodes[0];

  const currentLabel = profile?.careerInterest ? `Current focus: ${profile.careerInterest}` : 'Current focus: Getting started';

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-2">Career Pathway</h1>
        <p className="text-slate-300">Please sign in to view your pathway.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Career Pathway</li>
        </ol>
      </nav>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Compass className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold">Career Pathway</h1>
      </div>
      <p className="text-slate-300 mb-6">{DEFAULT_PATHWAY.description}</p>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
          <span className="text-slate-400">Loading pathway…</span>
        </div>
      ) : (
        <>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-400">{currentLabel}</div>
                  <div className="text-lg font-semibold mt-1">Your roadmap</div>
                </div>
                <div className="text-xs text-slate-500">Click a role to see skills</div>
              </div>

              <div className="space-y-3">
                {DEFAULT_PATHWAY.nodes.map((n) => {
                  const isSelected = n.id === selectedId;
                  const isStart = n.id === 'now';

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={
                        "w-full text-left border rounded-lg p-4 transition-colors " +
                        (isSelected ? "border-blue-700 bg-slate-950/50" : "border-slate-800 bg-slate-950/20 hover:bg-slate-900/40")
                      }
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <div className={"mt-0.5 " + (isSelected ? "text-blue-400" : "text-slate-500")}>
                          {isStart ? <Circle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">{n.title}</div>
                            {Array.isArray(n.skills) && n.skills.length > 0 && (
                              <div className="text-xs text-slate-400">{n.skills.length} skill{n.skills.length === 1 ? '' : 's'}</div>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">{n.subtitle}</div>

                          {Array.isArray(n.next) && n.next.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              Next: {n.next.map((id) => nodesById.get(id)?.title).filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg">
              <div className="text-sm text-slate-400">Selected role</div>
              <h2 className="text-lg font-semibold mt-1">{selected.title}</h2>
              <div className="text-sm text-slate-400 mb-4">{selected.subtitle}</div>

              <div className="text-sm font-semibold mb-2">Skills needed</div>
              {selected.skills.length === 0 ? (
                <p className="text-sm text-slate-400">Choose a role to see the skills to build next.</p>
              ) : (
                <ul className="space-y-2">
                  {selected.skills.map((s) => {
                    const have = skillSet.has(normalizeSkillName(s));
                    return (
                      <li key={s} className="flex items-start gap-2">
                        <span className={have ? 'text-green-400' : 'text-slate-500'} aria-hidden="true">
                          {have ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <Circle className="w-4 h-4 mt-0.5" />}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-100">{s}</div>
                          <div className={"text-xs " + (have ? 'text-green-300' : 'text-slate-500')}>
                            {have ? 'Already in your skill set' : 'Suggested next skill'}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 text-xs text-slate-500">
                This roadmap is a starting point. Your pathway can change as your goals and skills grow.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Articulation Pathways</div>
            <div className="space-y-3">
              {pathways.length === 0 && (
                <p className="text-sm text-slate-500">No pathway data available yet.</p>
              )}
              {pathways.map((path) => (
                <div key={path.id} className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-sm font-semibold">{path.from} → {path.to}</div>
                  <div className="text-xs text-slate-400">{path.provider} · {path.creditRPL}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Internships & Placements</div>
            <div className="space-y-3">
              {internships.length === 0 && (
                <p className="text-sm text-slate-500">No placements listed right now.</p>
              )}
              {internships.map((internship) => (
                <div key={internship.id} className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-sm font-semibold">{internship.title}</div>
                  <div className="text-xs text-slate-400">{internship.provider} · {internship.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
