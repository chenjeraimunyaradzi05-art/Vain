"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import { useNotifications } from '../../../../components/notifications/NotificationProvider';

export default function EnrolmentDetailPage() {
  const params = useParams();
  const enrolmentId = params?.id;
  const { token, user } = useAuth();
  const { showNotification } = useNotifications();
  const [enrolment, setEnrolment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    if (token && enrolmentId) {
      loadEnrolment();
    }
  }, [token, enrolmentId]);

  useEffect(() => {
    if (enrolment) {
      setProgressValue(enrolment.progress || 0);
    }
  }, [enrolment]);

  async function loadEnrolment() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/my/enrolments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        // IDs are strings (cuid)
        const found = (json.enrolments || []).find(e => e.id === enrolmentId);
        if (found) {
          setEnrolment(found);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function updateProgress(newProgress) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/courses/enrolments/${enrolmentId}/progress`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      
      // Refresh the full enrolment data
      await loadEnrolment();
      
      if (newProgress === 100) {
        // Attempt to issue a completion badge (best-effort).
        try {
          const courseId = json?.enrolment?.course?.id;
          if (courseId && user?.id) {
            await fetch(`${API_BASE}/badges/issue-for-course`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, courseId, enrolmentId })
            });
          }
        } catch (e) {
          // ignore
        }
        showNotification({ message: '🎉 Congratulations! You have completed this course!', variant: 'success' });
      }
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
    setSaving(false);
  }

  async function withdraw() {
    if (!confirm('Are you sure you want to withdraw from this course?')) return;
    try {
      const res = await fetch(`${API_BASE}/courses/enrolments/${enrolmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Withdrawal failed');
      showNotification({ message: 'Successfully withdrawn from course', variant: 'success' });
      window.location.href = '/member/training';
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Course Progress</h1>
        <p className="text-slate-300">Please log in to view your enrolment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <a href="/member/training" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← Training</a>
      
      {loading ? (
        <div>Loading…</div>
      ) : !enrolment ? (
        <div className="text-slate-400">Enrolment not found or access denied.</div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex gap-2 mb-2">
                {enrolment.course?.industry && <span className="text-xs text-slate-400">{enrolment.course.industry}</span>}
                {enrolment.course?.qualification && <span className="text-xs text-blue-400">{enrolment.course.qualification}</span>}
              </div>
              <h1 className="text-2xl font-bold mb-2">{enrolment.course?.title}</h1>
              <p className="text-slate-300">{enrolment.course?.provider}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-400">
                {enrolment.course?.duration && <span>⏱️ {enrolment.course.duration}</span>}
                {enrolment.course?.location && <span>📍 {enrolment.course.location}</span>}
                {enrolment.course?.isOnline && <span>💻 Online</span>}
                {enrolment.course?.price > 0 && <span>💰 ${(enrolment.course.price / 100).toFixed(0)}</span>}
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-sm ${
              enrolment.status === 'COMPLETED' ? 'bg-green-900/50 text-green-300' :
              enrolment.status === 'WITHDRAWN' ? 'bg-red-900/50 text-red-300' :
              'bg-blue-900/50 text-blue-300'
            }`}>
              {enrolment.status}
            </div>
          </div>

          {enrolment.course?.description && (
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded mb-6">
              <h2 className="font-semibold mb-2">About this course</h2>
              <p className="text-slate-300">{enrolment.course.description}</p>
            </div>
          )}

          {enrolment.status !== 'WITHDRAWN' && enrolment.status !== 'COMPLETED' && (
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-6">
              <h2 className="font-semibold mb-4">Course Progress</h2>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span className="font-medium text-blue-400">{progressValue}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                
                {/* Progress Slider */}
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Update your progress:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressValue}
                    onChange={(e) => setProgressValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Quick Progress Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setProgressValue(pct)}
                      className={`px-3 py-1 text-sm rounded ${
                        progressValue === pct 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-400">
                  {enrolment.status === 'ENQUIRY' 
                    ? 'Your enrolment is pending confirmation from the training provider.'
                    : progressValue === 100 
                      ? 'Ready to mark course as complete!' 
                      : 'Track your progress as you work through the course.'}
                </p>
                
                <button
                  onClick={() => updateProgress(progressValue)}
                  disabled={saving || progressValue === (enrolment.progress || 0)}
                  className={`px-4 py-2 rounded disabled:opacity-50 ${
                    progressValue === 100 
                      ? 'bg-green-600 text-white hover:bg-green-500' 
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {saving ? 'Saving...' : progressValue === 100 ? '🎉 Complete Course' : 'Save Progress'}
                </button>
              </div>
            </div>
          )}

          {enrolment.status === 'COMPLETED' && (
            <div className="bg-green-900/20 border border-green-800 p-6 rounded mb-6 text-center">
              <div className="text-4xl mb-2">🎓</div>
              <h2 className="text-xl font-bold text-green-300 mb-2">Course Completed!</h2>
              <p className="text-slate-300">
                Completed on {new Date(enrolment.completedAt || enrolment.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {enrolment.course?.externalUrl && (
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded mb-6">
              <h2 className="font-semibold mb-2">Course Materials</h2>
              <a 
                href={enrolment.course.externalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-300 hover:text-blue-200 underline"
              >
                Access course on external platform →
              </a>
            </div>
          )}

          {enrolment.status !== 'WITHDRAWN' && enrolment.status !== 'COMPLETED' && (
            <div className="border-t border-slate-800 pt-6">
              <button
                onClick={withdraw}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Withdraw from course
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
