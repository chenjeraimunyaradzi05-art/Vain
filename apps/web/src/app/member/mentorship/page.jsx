"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { Users, Search, Clock, CheckCircle, XCircle, ArrowLeft, Calendar, Target, MessageSquare, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

// Skeleton loading component
function MentorshipSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Section skeleton */}
      <div>
        <div className="h-6 w-48 bg-slate-700 rounded mb-4" />
        <div className="grid gap-4">
          {[1, 2].map(i => (
            <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-5 w-1/2 bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-800 rounded mb-2" />
                  <div className="h-3 w-1/4 bg-slate-800 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-slate-700 rounded" />
                  <div className="h-8 w-20 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Mentors grid skeleton */}
      <div>
        <div className="h-6 w-40 bg-slate-700 rounded mb-4" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-slate-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 w-2/3 bg-slate-700 rounded mb-1" />
                  <div className="h-3 w-1/2 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded mb-2" />
              <div className="h-8 w-full bg-slate-700 rounded mt-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MentorshipPage() {
  const { token, user } = useAuth();
  const { showNotification } = useNotifications();
  const [mentors, setMentors] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [goals, setGoals] = useState('');
  const [preferredTimes, setPreferredTimes] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [mentorsRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE}/mentorship/mentors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/mentorship/matches`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const mentorsJson = await mentorsRes.json();
      const matchesJson = await matchesRes.json();

      if (mentorsRes.ok) setMentors(mentorsJson.mentors || []);
      if (matchesRes.ok) setMatches(matchesJson.matches || []);
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function requestMentor() {
    if (!selectedMentor) return;
    try {
      const res = await fetch(`${API_BASE}/mentorship/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: selectedMentor.id, goals, preferredTimes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      showNotification({ message: 'Mentor request sent successfully!', variant: 'success' });
      setShowRequestModal(false);
      setSelectedMentor(null);
      setGoals('');
      setPreferredTimes('');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  async function updateMatch(matchId, status) {
    try {
      const res = await fetch(`${API_BASE}/mentorship/matches/${matchId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  const activeMatches = matches.filter(m => m.status === 'ACTIVE');
  const pendingMatches = matches.filter(m => m.status === 'PENDING');
  const pastMatches = matches.filter(m => m.status === 'COMPLETED' || m.status === 'DECLINED');

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Mentorship</h1>
        </div>
        <p className="text-slate-300">Please log in to access mentorship features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Mentorship</li>
        </ol>
      </nav>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Mentorship</h1>
        </div>
        <Link
          href="/member/mentorship-community"
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
        >
          Community hub
        </Link>
      </div>
      <p className="text-slate-400 mb-8">Connect with experienced mentors who can guide your career journey.</p>

      {loading ? (
        <MentorshipSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Active Mentorships */}
          {activeMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Active Mentorships
              </h2>
              <div className="grid gap-4">
                {activeMatches.map(match => (
                  <div key={match.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {match.mentorId === user?.id ? (
                            <>Mentee: {match.mentee?.name || match.mentee?.email}</>
                          ) : (
                            <>Mentor: {match.mentor?.name || match.mentor?.email}</>
                          )}
                        </div>
                        {match.goals && (
                          <div className="text-sm text-slate-400 mt-1">Goals: {match.goals}</div>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          Started: {new Date(match.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`/member/mentorship/${match.id}`} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500">
                          View sessions
                        </a>
                        <button
                          onClick={() => updateMatch(match.id, 'COMPLETED')}
                          className="px-3 py-1 border border-slate-700 rounded text-sm hover:bg-slate-900"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending Requests */}
          {pendingMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" /> Pending Requests
              </h2>
              <div className="grid gap-4">
                {pendingMatches.map(match => (
                  <div key={match.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {match.mentorId === user?.id ? (
                            <>Request from: {match.mentee?.name || match.mentee?.email}</>
                          ) : (
                            <>Requested mentor: {match.mentor?.name || match.mentor?.email}</>
                          )}
                        </div>
                        {match.goals && (
                          <div className="text-sm text-slate-400 mt-1">Goals: {match.goals}</div>
                        )}
                        {match.preferredTimes && (
                          <div className="text-sm text-slate-400">Preferred times: {match.preferredTimes}</div>
                        )}
                      </div>
                      {match.mentorId === user?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateMatch(match.id, 'ACTIVE')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-500"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateMatch(match.id, 'DECLINED')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Find a Mentor */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" /> Find a Mentor
            </h2>
            {mentors.length === 0 ? (
              <p className="text-slate-400">No mentors available at this time.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {mentors.map(mentor => (
                  <div key={mentor.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
                    <div className="font-semibold">{mentor.name || mentor.email}</div>
                    {mentor.profile?.industry && (
                      <div className="text-sm text-slate-300 mt-1">Industry: {mentor.profile.industry}</div>
                    )}
                    {mentor.profile?.skills && (
                      <div className="text-sm text-slate-400 mt-1">Skills: {mentor.profile.skills}</div>
                    )}
                    {mentor.profile?.bio && (
                      <div className="text-sm text-slate-400 mt-2 line-clamp-2">{mentor.profile.bio}</div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-xs text-slate-500">
                        Capacity: {mentor.activeMatches}/{mentor.maxCapacity} mentees
                      </div>
                      <button
                        onClick={() => { setSelectedMentor(mentor); setShowRequestModal(true); }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-500"
                      >
                        <UserPlus className="w-4 h-4" /> Request mentor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Mentorships */}
          {pastMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-slate-400">Past Mentorships</h2>
              <div className="grid gap-4">
                {pastMatches.map(match => (
                  <div key={match.id} className="border border-slate-800 bg-slate-950/40 p-4 rounded opacity-60">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">
                          {match.mentorId === user?.id ? match.mentee?.email : match.mentor?.email}
                        </div>
                        <div className="text-xs text-slate-500">
                          Status: {match.status} • Ended: {new Date(match.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="font-semibold">Request Mentor</div>
                  <div className="text-sm text-slate-400">{selectedMentor.name || selectedMentor.email}</div>
                </div>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                  <Target className="w-4 h-4 text-slate-400" /> Your goals
                </label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What do you hope to achieve with mentorship? E.g., career guidance, skill development, job search support..."
                  className="w-full border border-slate-700 bg-slate-900/40 text-slate-100 px-3 py-2 rounded-lg h-24 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Preferred meeting times
                </label>
                <input
                  value={preferredTimes}
                  onChange={(e) => setPreferredTimes(e.target.value)}
                  placeholder="E.g., Weekday evenings, Saturday mornings..."
                  className="w-full border border-slate-700 bg-slate-900/40 text-slate-100 px-3 py-2 rounded-lg placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={requestMentor} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
                  <MessageSquare className="w-4 h-4" /> Send request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
