"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';
import { useNotifications } from '../../../../components/notifications/NotificationProvider';

// Skeleton loading for sessions page
function SessionsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="h-8 w-64 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-48 bg-slate-800 rounded mb-1" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-700 rounded" />
      </div>
      <div className="mb-8">
        <div className="h-6 w-40 bg-slate-700 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-32 bg-slate-800 rounded mb-1" />
                  <div className="h-3 w-24 bg-slate-800 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-slate-700 rounded" />
                  <div className="h-8 w-20 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MentorshipSessionsPage() {
  const params = useParams();
  const matchId = params?.id;
  const { token, user } = useAuth();
  const { showNotification } = useNotifications();
  const [match, setMatch] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');

  useEffect(() => {
    if (token && matchId) {
      loadData();
    }
  }, [token, matchId]);

  async function loadData() {
    setLoading(true);
    try {
      const [matchesRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/mentorship/matches`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/mentorship/matches/${matchId}/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const matchesJson = await matchesRes.json();
      const sessionsJson = await sessionsRes.json();

      if (matchesRes.ok) {
        const foundMatch = (matchesJson.matches || []).find(m => m.id === matchId);
        setMatch(foundMatch);
      }
      if (sessionsRes.ok) setSessions(sessionsJson.sessions || []);
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function scheduleSession() {
    if (!sessionDate) {
      showNotification({ message: 'Please select a date and time', variant: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/mentorship/matches/${matchId}/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: sessionDate,
          durationMins: parseInt(sessionDuration),
          topic: sessionTopic,
          location: sessionLocation
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to schedule');
      showNotification({ message: 'Session scheduled!', variant: 'success' });
      setShowScheduleModal(false);
      setSessionDate('');
      setSessionTopic('');
      setSessionLocation('');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  async function submitFeedback() {
    if (!selectedSession) return;
    try {
      const res = await fetch(`${API_BASE}/mentorship/sessions/${selectedSession.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          feedback: feedbackText,
          notes: sessionNotes
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to submit feedback');
      showNotification({ message: 'Feedback submitted successfully!', variant: 'success' });
      setShowFeedbackModal(false);
      setSelectedSession(null);
      setFeedbackRating(5);
      setFeedbackText('');
      setSessionNotes('');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  async function updateSession(sessionId, data) {
    try {
      const res = await fetch(`${API_BASE}/mentorship/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  const upcomingSessions = sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledAt) >= new Date());
  const pastSessions = sessions.filter(s => s.status === 'COMPLETED' || new Date(s.scheduledAt) < new Date());

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Mentorship Sessions</h1>
        <p className="text-slate-300">Please log in to view sessions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li><Link href="/member/mentorship" className="hover:text-blue-400 transition-colors">Mentorship</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Sessions</li>
        </ol>
      </nav>
      
      {loading ? (
        <SessionsSkeleton />
      ) : !match ? (
        <div className="text-slate-400">Mentorship not found or access denied.</div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">📅 Mentorship Sessions</h1>
              <p className="text-slate-300">
                {match.mentorId === user?.id ? (
                  <>Mentee: {match.mentee?.name || match.mentee?.email}</>
                ) : (
                  <>Mentor: {match.mentor?.name || match.mentor?.email}</>
                )}
              </p>
              {match.goals && (
                <p className="text-sm text-slate-400 mt-1">Goals: {match.goals}</p>
              )}
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
            >
              + Schedule session
            </button>
          </div>

          {/* Upcoming Sessions */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-400">●</span> Upcoming Sessions
            </h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-slate-400">No upcoming sessions scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {new Date(session.scheduledAt).toLocaleDateString('en-AU', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-slate-300">
                          {new Date(session.scheduledAt).toLocaleTimeString('en-AU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} • {session.durationMins} minutes
                        </div>
                        {session.topic && (
                          <div className="text-sm text-slate-400 mt-1">Topic: {session.topic}</div>
                        )}
                        {session.location && (
                          <div className="text-sm text-slate-400">Location: {session.location}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSession(session.id, { status: 'COMPLETED' })}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                        >
                          Mark complete
                        </button>
                        <button
                          onClick={() => updateSession(session.id, { status: 'CANCELLED' })}
                          className="px-3 py-1 border border-slate-700 rounded text-sm hover:bg-slate-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-slate-400">Past Sessions</h2>
              <div className="space-y-4">
                {pastSessions.map(session => (
                  <div key={session.id} className="border border-slate-800 bg-slate-950/40 p-4 rounded opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">
                          {new Date(session.scheduledAt).toLocaleDateString('en-AU', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {session.topic && (
                          <div className="text-sm text-slate-400">Topic: {session.topic}</div>
                        )}
                        {session.notes && (
                          <div className="text-sm text-slate-400 mt-1">Notes: {session.notes}</div>
                        )}
                        {session.feedback && (
                          <div className="text-sm text-slate-300 mt-1">
                            <span className="text-yellow-400">{'★'.repeat(session.rating || 0)}{'☆'.repeat(5 - (session.rating || 0))}</span>
                            {' '}{session.feedback}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {session.status === 'COMPLETED' && !session.feedback && (
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setSessionNotes(session.notes || '');
                              setShowFeedbackModal(true);
                            }}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-500"
                          >
                            Add Feedback
                          </button>
                        )}
                        <div className={`text-xs px-2 py-1 rounded ${
                          session.status === 'COMPLETED' ? 'bg-green-900/50 text-green-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {session.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded shadow-lg w-full max-w-lg">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="font-semibold">Schedule a Session</div>
              <button onClick={() => setShowScheduleModal(false)} className="px-2 py-1 border border-slate-700 rounded hover:bg-slate-900">Close</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-200 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-200 mb-1">Duration</label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-200 mb-1">Topic (optional)</label>
                <input
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  placeholder="E.g., Resume review, Career planning, Interview prep..."
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-200 mb-1">Location or video link</label>
                <input
                  value={sessionLocation}
                  onChange={(e) => setSessionLocation(e.target.value)}
                  placeholder="E.g., Zoom link, cafe address, phone call..."
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded placeholder:text-slate-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowScheduleModal(false)} className="px-3 py-1 border border-slate-700 rounded hover:bg-slate-900">Cancel</button>
                <button onClick={scheduleSession} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500">Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded shadow-lg w-full max-w-lg">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="font-semibold">Session Feedback</div>
              <button onClick={() => { setShowFeedbackModal(false); setSelectedSession(null); }} className="px-2 py-1 border border-slate-700 rounded hover:bg-slate-900">Close</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-slate-400 mb-4">
                Session on {new Date(selectedSession.scheduledAt).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {selectedSession.topic && <span> • {selectedSession.topic}</span>}
              </div>
              
              <div>
                <label className="block text-sm text-slate-200 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl transition-colors ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-200 mb-1">Your feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="How was the session? What did you learn?"
                  rows={3}
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded placeholder:text-slate-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-200 mb-1">Session notes (optional)</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Key takeaways, action items, next steps..."
                  rows={2}
                  className="w-full border border-slate-700 bg-slate-950/40 text-slate-100 px-3 py-2 rounded placeholder:text-slate-500"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowFeedbackModal(false); setSelectedSession(null); }} className="px-3 py-1 border border-slate-700 rounded hover:bg-slate-900">Cancel</button>
                <button onClick={submitFeedback} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500">Submit Feedback</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
