"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, Users, ClipboardList, UserCheck, GraduationCap, Settings, Sparkles, Radar, ArrowRight } from 'lucide-react';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';
import useAiCooldown from '../../../hooks/useAiCooldown';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
import useAuth from '../../../hooks/useAuth';
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
function TafeDashboardInner() {
    const { token, user } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [aiSource, setAiSource] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [throttleMsg, setThrottleMsg] = useState(null);
    const [tafeStats, setTafeStats] = useState(null);
    const { isCooling, remainingMs, startCooldown, totalMs, percent, justEnded } = useAiCooldown('concierge', user?.id);
    const { showNotification } = useNotifications();
    const shownRef = useRef(false);
    useEffect(() => {
        if (justEnded && !shownRef.current) {
            shownRef.current = true;
            showNotification({ id: `ai-cooldown-${user?.id || 'anon'}`, message: 'AI suggestions are ready — try again for fresh tips.', autoHideMs: 3000, variant: 'info' });
            const t = setTimeout(() => { shownRef.current = false; }, 3500);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [justEnded, showNotification, user?.id]);

    // Fetch TAFE stats
    async function fetchTafeStats() {
        if (!token) return;
        try {
            const base = API_BASE;
            const r = await fetch(`${base}/courses/my/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r.ok) {
                const data = await r.json();
                setTafeStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch TAFE stats:', e);
        }
    }

    // consolidated fetch handled in component useEffect
    async function fetchSuggestions() {
        setLoading(true);
        setThrottleMsg(null);
        setIsCached(false);
        setAiSource(null);
        try {
            const base = API_BASE;
            const r = await fetch(`${base}/ai/concierge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ userId: user?.id, context: 'TAFE dashboard load' }) });
            if (r.status === 429) {
                const retry = r.headers.get('Retry-After');
                const sec = retry ? (Number(retry) * 1000) : 60000;
                startCooldown(sec);
                setThrottleMsg('You are making requests too quickly — try again in a minute.');
                return;
            }
            const j = await r.json().catch(() => null);
            if (!j)
                return;
            setAiSource(j.source || null);
            setIsCached(String(j.source || '').toLowerCase() === 'cache');
            if (Array.isArray(j.suggestions))
                setSuggestions(j.suggestions);
            if (j.text && (!j.suggestions || j.suggestions.length === 0))
                setSuggestions([String(j.text)]);
        }
        catch (e) {
            // Log error for debugging but don't crash the UI
            console.error('Failed to fetch AI suggestions:', e?.message || e);
            // Optionally show a user-friendly message
            if (e?.name !== 'AbortError') {
                setSuggestions(['Unable to load AI suggestions. Please try again later.']);
            }
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchSuggestions(); fetchTafeStats(); }, [token, user?.id]);
    return (<div className="min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-4xl mx-auto">
          {/* Announcements */}
          <AnnouncementsBanner />

          {/* Breadcrumb */}
          <nav className="mb-6 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="text-pink-600 hover:text-pink-700 transition-colors">Home</Link></li>
              <li><span className="text-slate-400">/</span></li>
              <li className="text-slate-700 font-medium">TAFE Dashboard</li>
            </ol>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}>
              <GraduationCap className="w-8 h-8 text-pink-600" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">Education Hub</p>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">TAFE / Institution Dashboard</h1>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Stats cards */}
      {tafeStats?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <div className="text-3xl font-bold text-emerald-600">{tafeStats.stats.totalCourses}</div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600 mt-1">Total Courses</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <ClipboardList className="w-6 h-6 mx-auto mb-2 text-pink-500" />
            <div className="text-3xl font-bold" style={{ color: accentPink }}>{tafeStats.stats.activeCourses}</div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mt-1">Active Courses</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <Users className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-3xl font-bold text-amber-600">{tafeStats.stats.enquiries}</div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600 mt-1">Enquiries</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-center transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <UserCheck className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-3xl font-bold" style={{ color: accentPurple }}>{tafeStats.stats.enrolled}</div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mt-1">Enrolled</p>
          </div>
        </div>
      )}

      {/* Recent enrolments */}
      {tafeStats?.recentEnrolments?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
          <h3 className="font-bold text-lg mb-3 text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-pink-500" /> 
            <span>Recent Enrolments</span>
          </h3>
          <div className="space-y-2">
            {tafeStats.recentEnrolments.map(enrolment => (
              <div key={enrolment.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <div className="text-slate-900 font-medium">{enrolment.memberName}</div>
                  <div className="text-xs text-slate-500">{enrolment.courseTitle}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  enrolment.status === 'ENROLLED' ? 'bg-emerald-100 text-emerald-700' :
                  enrolment.status === 'ENQUIRY' ? 'bg-amber-100 text-amber-700' :
                  enrolment.status === 'COMPLETED' ? 'bg-pink-100 text-pink-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{enrolment.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
        <p className="mb-4 text-slate-600">Welcome back{user?.email ? ` — ${user.email}` : ''}. Manage your courses, track enrolments, and support learners.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link href="/tafe/setup" className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5 text-slate-500" />
            <span className="text-slate-700">Manage institution profile</span>
          </Link>
          <Link href="/tafe/courses" className="flex items-center gap-3 p-4 border-2 rounded-xl transition-colors hover:bg-pink-50" style={{ borderColor: accentPink, background: 'rgba(233, 30, 140, 0.05)' }}>
            <BookOpen className="w-5 h-5 text-pink-600" />
            <div>
              <div className="font-semibold text-slate-900">Manage Courses</div>
              <div className="text-sm text-slate-500">Create and manage training programs</div>
            </div>
          </Link>
          <Link href="/tafe/analytics" className="flex items-center justify-between gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-semibold text-slate-900">Training Analytics</div>
                <div className="text-sm text-slate-500">View the training-to-job funnel</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </Link>
          <Link href="/ai-wellness" className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span className="text-slate-700">AI Wellness Coach</span>
          </Link>
          <Link href="/opportunity-radar" className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Radar className="w-5 h-5 text-blue-500" />
            <span className="text-slate-700">Opportunity Radar</span>
          </Link>
        </div>

        {throttleMsg && (<div className="mt-4 p-3 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-800">{throttleMsg}</div>)}

        {isCooling && (<div className="mt-3">
            {totalMs && totalMs > 0 ? (<>
                <div className="relative w-full bg-slate-800 rounded h-2 overflow-hidden" role="progressbar" aria-label="AI cooldown progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="bg-indigo-500 h-2 transition-all duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${percent}%` }}/>
                  {percent >= 80 && (<div data-testid="ai-cooldown-pulse" className="absolute -top-3 h-6 w-6 rounded-full opacity-60 -translate-x-1/2 bg-yellow-400 animate-ping motion-reduce:animate-none pointer-events-none" style={{ left: `${percent}%` }} aria-hidden="true"/>)}
                  <div data-testid="ai-cooldown-indicator" className={`absolute -top-2 h-4 w-4 rounded-full border-2 transform -translate-x-1/2 animate-pulse motion-reduce:animate-none ${percent >= 80 ? 'bg-yellow-400 border-yellow-600' : 'bg-slate-950 border-indigo-300'}`} style={{ left: `${percent}%` }} aria-hidden="true"/>
                </div>
                <div className="text-xs text-slate-400 mt-1">Cooling down — {Math.ceil(remainingMs / 1000)}s remaining<span className="sr-only">; {percent}% complete</span></div>
                <div role="status" aria-live="polite" data-testid="ai-cooldown-live" className="sr-only">{justEnded ? 'AI suggestions are ready — you can request updated tips now.' : ''}</div>
                  {/* Visible toast handled by global NotificationProvider when the cooldown finishes */}
              </>) : (<div className="mt-3 text-sm text-slate-200">AI requests cooling down — try again in {Math.ceil(remainingMs / 1000)}s</div>)}
          </div>)}

        {suggestions.length > 0 && (<div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 mb-2">AI concierge suggestions</h3>
              <div className="flex items-center gap-2 text-xs">
                {aiSource && ['ai', 'openai', 'prototype', 'ai'].includes(String(aiSource).toLowerCase()) && (<span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">AI-powered</span>)}
                {isCached && (<span className="inline-block bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-semibold">Cached result</span>)}
              </div>
            </div>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => fetchSuggestions()} className="px-4 py-2 border-2 rounded-lg text-sm font-semibold transition-all hover:bg-pink-50" style={{ borderColor: accentPink, color: accentPink }} disabled={isCooling || loading}>Retry suggestions</button>
            </div>
          </div>)}
      </div>
      </div>
    </div>);
}
export default TafeDashboardInner;
