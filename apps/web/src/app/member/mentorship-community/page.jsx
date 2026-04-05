"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { Network, Users, Repeat, Calendar } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

export default function MentorshipCommunityPage() {
  const { token } = useAuth();
  const { showNotification } = useNotifications();
  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [circles, setCircles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reverseMatches, setReverseMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningCircleId, setJoiningCircleId] = useState(null);
  const [leavingCircleId, setLeavingCircleId] = useState(null);
  const [rsvpGroupId, setRsvpGroupId] = useState(null);
  const [cancelRsvpGroupId, setCancelRsvpGroupId] = useState(null);
  const [requestingReverseId, setRequestingReverseId] = useState(null);
  const [joinedCircles, setJoinedCircles] = useState({});
  const [rsvpedGroups, setRsvpedGroups] = useState({});
  const [requestedReverse, setRequestedReverse] = useState({});

  useEffect(() => {
    if (!token) return;
    async function load() {
      setLoading(true);
      try {
        const [networkRes, circlesRes, groupsRes, reverseRes] = await Promise.all([
          fetch(`${API_BASE}/mentorship/network`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/mentorship/circles`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/mentorship/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/mentorship/reverse`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (networkRes.ok) setNetwork(await networkRes.json());
        if (circlesRes.ok) {
          const data = await circlesRes.json();
          setCircles(data?.circles || []);
        }
        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setGroups(data?.groups || []);
        }
        if (reverseRes.ok) {
          const data = await reverseRes.json();
          setReverseMatches(data?.matches || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function joinCircle(circleId) {
    if (!token) return;
    setJoiningCircleId(circleId);
    try {
      const res = await fetch(`${API_BASE}/mentorship/circles/${circleId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to join circle');
      setJoinedCircles((prev) => ({ ...prev, [circleId]: true }));
      showNotification({ message: 'Joined circle successfully.', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    } finally {
      setJoiningCircleId(null);
    }
  }

  async function rsvpGroup(groupId) {
    if (!token) return;
    setRsvpGroupId(groupId);
    try {
      const res = await fetch(`${API_BASE}/mentorship/groups/${groupId}/rsvp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to RSVP');
      setRsvpedGroups((prev) => ({ ...prev, [groupId]: true }));
      showNotification({ message: 'RSVP confirmed.', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    } finally {
      setRsvpGroupId(null);
    }
  }

  async function leaveCircle(circleId) {
    if (!token) return;
    setLeavingCircleId(circleId);
    try {
      const res = await fetch(`${API_BASE}/mentorship/circles/${circleId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to leave circle');
      setJoinedCircles((prev) => ({ ...prev, [circleId]: false }));
      showNotification({ message: 'Left circle successfully.', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    } finally {
      setLeavingCircleId(null);
    }
  }

  async function cancelRsvp(groupId) {
    if (!token) return;
    setCancelRsvpGroupId(groupId);
    try {
      const res = await fetch(`${API_BASE}/mentorship/groups/${groupId}/rsvp/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to cancel RSVP');
      setRsvpedGroups((prev) => ({ ...prev, [groupId]: false }));
      showNotification({ message: 'RSVP cancelled.', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    } finally {
      setCancelRsvpGroupId(null);
    }
  }

  async function requestReverseMentor(matchId) {
    if (!token) return;
    setRequestingReverseId(matchId);
    try {
      const res = await fetch(`${API_BASE}/mentorship/reverse/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to send request');
      setRequestedReverse((prev) => ({ ...prev, [matchId]: true }));
      showNotification({ message: 'Reverse mentoring request sent.', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    } finally {
      setRequestingReverseId(null);
    }
  }

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-2">Mentorship Community</h1>
        <p className="text-slate-300">Please sign in to view mentorship community features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li><a href="/member/mentorship" className="hover:text-blue-400 transition-colors">Mentorship</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Community</li>
        </ol>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-600/20 rounded-lg">
          <Network className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mentorship Community</h1>
          <p className="text-slate-300">Circles, reverse mentoring, and group sessions.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading community data…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Mentoring Circles
            </h3>
            <div className="space-y-3">
              {circles.map((circle) => (
                <div key={circle.id} className="rounded-lg bg-slate-950/50 border border-slate-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{circle.topic}</div>
                      <div className="text-xs text-slate-400">Members: {circle.members?.length || 0}</div>
                    </div>
                    {joinedCircles[circle.id] ? (
                      <button
                        onClick={() => leaveCircle(circle.id)}
                        disabled={leavingCircleId === circle.id}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          leavingCircleId === circle.id
                            ? 'bg-emerald-900/40 text-emerald-300 cursor-default'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {leavingCircleId === circle.id ? 'Leaving…' : 'Leave'}
                      </button>
                    ) : (
                      <button
                        onClick={() => joinCircle(circle.id)}
                        disabled={joiningCircleId === circle.id}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          joiningCircleId === circle.id
                            ? 'bg-emerald-900/40 text-emerald-300 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {joiningCircleId === circle.id ? 'Joining…' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {circles.length === 0 && <p className="text-sm text-slate-500">No circles yet.</p>}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" /> Group Sessions
            </h3>
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="rounded-lg bg-slate-950/50 border border-slate-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{group.title}</div>
                      <div className="text-xs text-slate-400">{group.topic}</div>
                      <div className="text-xs text-slate-500">Next: {new Date(group.nextSession).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">Spots left: {group.spotsLeft ?? 0}</div>
                    </div>
                    {rsvpedGroups[group.id] ? (
                      <button
                        onClick={() => cancelRsvp(group.id)}
                        disabled={cancelRsvpGroupId === group.id}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          cancelRsvpGroupId === group.id
                            ? 'bg-amber-900/40 text-amber-300 cursor-default'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {cancelRsvpGroupId === group.id ? 'Cancelling…' : 'Cancel RSVP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => rsvpGroup(group.id)}
                        disabled={rsvpGroupId === group.id || group.spotsLeft === 0}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          group.spotsLeft === 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : rsvpGroupId === group.id
                            ? 'bg-amber-900/40 text-amber-300 cursor-default'
                            : 'bg-amber-600 text-white hover:bg-amber-500'
                        }`}
                      >
                        {group.spotsLeft === 0 ? 'Full' : rsvpGroupId === group.id ? 'Saving…' : 'RSVP'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-slate-500">No group sessions listed.</p>}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-purple-400" /> Reverse Mentoring
            </h3>
            <div className="space-y-3">
              {reverseMatches.map((match) => (
                <div key={match.id} className="rounded-lg bg-slate-950/50 border border-slate-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{match.name}</div>
                      <div className="text-xs text-slate-400">{match.specialty}</div>
                      <div className="text-xs text-slate-500">{match.reason}</div>
                    </div>
                    <button
                      onClick={() => requestReverseMentor(match.id)}
                      disabled={requestingReverseId === match.id || requestedReverse[match.id]}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        requestedReverse[match.id]
                          ? 'bg-purple-900/40 text-purple-300 cursor-default'
                          : 'bg-purple-600 text-white hover:bg-purple-500'
                      }`}
                    >
                      {requestedReverse[match.id] ? 'Requested' : requestingReverseId === match.id ? 'Sending…' : 'Request'}
                    </button>
                  </div>
                </div>
              ))}
              {reverseMatches.length === 0 && <p className="text-sm text-slate-500">No reverse mentoring matches.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-lg p-5">
        <h3 className="text-lg font-semibold mb-3">Network Snapshot</h3>
        <p className="text-sm text-slate-400">Nodes: {network.nodes?.length || 0} · Connections: {network.edges?.length || 0}</p>
      </div>
    </div>
  );
}
