"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState, useRef } from 'react';
import useAiCooldown from '../../../hooks/useAiCooldown';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
import useAuth from '../../../hooks/useAuth';
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
function MentorDashboardInner() {
    const { token, user } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [aiSource, setAiSource] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [throttleMsg, setThrottleMsg] = useState(null);
    const [mentorStats, setMentorStats] = useState(null);
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

    // Fetch mentor stats
    async function fetchMentorStats() {
        if (!token) return;
        try {
            const base = API_BASE;
            const r = await fetch(`${base}/mentorship/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r.ok) {
                const data = await r.json();
                setMentorStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch mentor stats:', e);
        }
    }

    // useFetchOnMount removed — we perform a single consolidated fetch in useEffect
    // consolidated fetch - can be triggered initially and via Retry
    async function fetchSuggestions() {
        setLoading(true);
        setThrottleMsg(null);
        setIsCached(false);
        setAiSource(null);
        try {
            const base = API_BASE;
            const r = await fetch(`${base}/ai/concierge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ userId: user?.id, context: 'Mentor dashboard load' }) });
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
            // ignore network errors
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchSuggestions(); fetchMentorStats(); }, [token, user?.id]);
    return (<div className="max-w-4xl mx-auto py-12 px-4">
      {/* Announcements */}
      <AnnouncementsBanner />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/" className="hover:text-blue-400 transition-colors">Home</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Mentor Dashboard</li>
        </ol>
      </nav>
      <h2 className="text-2xl font-bold mb-4">Mentor Dashboard</h2>
      
      {/* Stats cards */}
      {mentorStats?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded text-center">
            <div className="text-2xl font-bold text-purple-400">{mentorStats.stats.activeMatches}</div>
            <div className="text-sm text-slate-400">Active Mentees</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded text-center">
            <div className="text-2xl font-bold text-yellow-400">{mentorStats.stats.pendingRequests}</div>
            <div className="text-sm text-slate-400">Pending Requests</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded text-center">
            <div className="text-2xl font-bold text-green-400">{mentorStats.stats.completedSessions}</div>
            <div className="text-sm text-slate-400">Sessions Completed</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded text-center">
            <div className="text-2xl font-bold text-slate-100">{mentorStats.stats.capacity?.current || 0}/{mentorStats.stats.capacity?.max || 5}</div>
            <div className="text-sm text-slate-400">Capacity</div>
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {mentorStats?.upcomingSessions?.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded mb-6">
          <h3 className="font-semibold mb-3 text-slate-100">📅 Upcoming Sessions</h3>
          <div className="space-y-2">
            {mentorStats.upcomingSessions.map(session => (
              <div key={session.id} className="flex justify-between items-center p-3 bg-slate-950/40 rounded border border-slate-800">
                <div>
                  <div className="text-slate-100">{session.mentee?.email || 'Mentee'}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(session.scheduledAt).toLocaleString()}
                  </div>
                </div>
                <a href={`/member/mentorship`} className="text-sm text-purple-400 hover:underline">View</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
        <p className="mb-4 text-slate-200">Welcome back{user?.email ? ` — ${user.email}` : ''}. Manage your mentees, schedule sessions, and track your mentoring impact.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <a href="/mentor/requests" className="block p-4 border border-amber-700 rounded bg-amber-900/20 hover:bg-amber-900/40">
            <div className="font-medium text-slate-100">📬 Mentorship Requests</div>
            <div className="text-sm text-slate-400 mt-1">Review pending requests, accept or decline</div>
          </a>
          <a href="/mentor/earnings" className="block p-4 border border-green-700 rounded bg-green-900/20 hover:bg-green-900/40">
            <div className="font-medium text-slate-100">💰 Earnings</div>
            <div className="text-sm text-slate-400 mt-1">Track your income and payouts</div>
          </a>
          <a href="/mentor/availability" className="block p-4 border border-blue-700 rounded bg-blue-900/20 hover:bg-blue-900/40">
            <div className="font-medium text-slate-100">📅 Availability</div>
            <div className="text-sm text-slate-400 mt-1">Set your available times for sessions</div>
          </a>
          <a href="/mentor/analytics" className="block p-4 border border-purple-700 rounded bg-purple-900/20 hover:bg-purple-900/40">
            <div className="font-medium text-slate-100">📊 Analytics</div>
            <div className="text-sm text-slate-400 mt-1">View your impact, ratings &amp; session trends</div>
          </a>
          <a href="/mentor/setup" className="block p-4 border border-slate-800 rounded bg-slate-950/30 hover:bg-slate-900">
            <div className="font-medium text-slate-100">⚙️ Profile Settings</div>
            <div className="text-sm text-slate-400 mt-1">Update your mentor profile</div>
          </a>
        </div>

        {throttleMsg && (<div className="mt-4 p-3 rounded border border-yellow-700/50 bg-yellow-900/20 text-sm text-yellow-200">{throttleMsg}</div>)}

        {/* Show UI countdown + progress if server throttled and local cooldown is active */}
        {isCooling && (<div className="mt-3">
            {totalMs && totalMs > 0 ? (<>
                {/* Accessible, animated progress bar. Respects prefers-reduced-motion via Tailwind's motion-reduce classes. */}
                <div className="relative w-full bg-slate-800 rounded h-2 overflow-hidden" role="progressbar" aria-label="AI cooldown progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="bg-indigo-500 h-2 transition-all duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${percent}%` }}/>
                  {/* warm pulse when nearing completion */}
                  {percent >= 80 && (<div data-testid="ai-cooldown-pulse" className="absolute -top-3 h-6 w-6 rounded-full opacity-60 -translate-x-1/2 bg-yellow-400 animate-ping motion-reduce:animate-none pointer-events-none" style={{ left: `${percent}%` }} aria-hidden="true"/>)}
                  <div data-testid="ai-cooldown-indicator" className={`absolute -top-2 h-4 w-4 rounded-full border-2 transform -translate-x-1/2 animate-pulse motion-reduce:animate-none ${percent >= 80 ? 'bg-yellow-400 border-yellow-600' : 'bg-slate-950 border-indigo-300'}`} style={{ left: `${percent}%` }} aria-hidden="true"/>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Cooling down — {Math.ceil(remainingMs / 1000)}s remaining
                  <span className="sr-only">; {percent}% complete</span>
                </div>
                {/* Announce completion briefly for screen readers */}
                <div role="status" aria-live="polite" data-testid="ai-cooldown-live" className="sr-only">{justEnded ? 'AI suggestions are ready — you can request updated tips now.' : ''}</div>
                {/* Visible toast handled by global NotificationProvider when the cooldown finishes */}
              </>) : (<div className="text-sm text-slate-200">AI requests cooling down — try again in {Math.ceil(remainingMs / 1000)}s</div>)}
          </div>)}

        {suggestions.length > 0 && (<div className="mt-6 bg-slate-950/30 border border-slate-800 p-4 rounded">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold mb-2">AiConcierge suggestions</h3>
              <div className="flex items-center gap-2 text-xs">
                {aiSource && ['ai', 'openai', 'prototype', 'ai'].includes(String(aiSource).toLowerCase()) && (<span className="inline-block bg-indigo-500/20 text-indigo-200 px-2 py-1 rounded">AI-powered</span>)}
                {isCached && (<span className="inline-block bg-slate-800 text-slate-200 px-2 py-1 rounded">Cached result</span>)}
              </div>
            </div>
            <ul className="list-disc pl-6 space-y-1">{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => fetchSuggestions()} className="px-3 py-1 border border-slate-700 rounded text-sm hover:bg-slate-900" disabled={isCooling || loading}>Retry suggestions</button>
            </div>
          </div>)}
      </div>
    </div>);
}
export default MentorDashboardInner;
