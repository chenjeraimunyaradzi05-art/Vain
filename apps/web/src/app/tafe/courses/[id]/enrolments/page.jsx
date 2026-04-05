"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useAuth from '../../../../../hooks/useAuth';
import { useNotifications } from '../../../../../components/notifications/NotificationProvider';

export default function CourseEnrolmentsPage() {
  const params = useParams();
  const courseId = params?.id;
  const { token } = useAuth();
  const { showNotification } = useNotifications();
  const [course, setCourse] = useState(null);
  const [enrolments, setEnrolments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && courseId) loadData();
  }, [token, courseId]);

  async function loadData() {
    setLoading(true);
    try {
      const api = API_BASE;
      const [courseRes, enrolmentsRes] = await Promise.all([
        fetch(`${api}/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${api}/courses/${courseId}/enrolments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (courseRes.ok) {
        const json = await courseRes.json();
        setCourse(json.course);
      }
      if (enrolmentsRes.ok) {
        const json = await enrolmentsRes.json();
        setEnrolments(json.enrolments || []);
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function updateEnrolmentStatus(enrolmentId, status) {
    try {
      const api = API_BASE;
      const res = await fetch(`${api}/courses/enrolments/${enrolmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Update failed');
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Course Enrolments</h1>
        <p className="text-slate-300">Please log in to view enrolments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <a href="/tafe/courses" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← Courses</a>
      
      {loading ? (
        <div>Loading…</div>
      ) : !course ? (
        <div className="text-slate-400">Course not found or access denied.</div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">📋 Enrolments: {course.title}</h1>
            <div className="flex gap-4 text-sm text-slate-400">
              {course.industry && <span>{course.industry}</span>}
              {course.qualification && <span>• {course.qualification}</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-center">
              <div className="text-2xl font-bold text-blue-400">{enrolments.filter(e => e.status === 'ENQUIRY').length}</div>
              <div className="text-sm text-slate-300">Enquiries</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-center">
              <div className="text-2xl font-bold text-green-400">{enrolments.filter(e => e.status === 'ENROLLED').length}</div>
              <div className="text-sm text-slate-300">Enrolled</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-center">
              <div className="text-2xl font-bold text-purple-400">{enrolments.filter(e => e.status === 'COMPLETED').length}</div>
              <div className="text-sm text-slate-300">Completed</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-center">
              <div className="text-2xl font-bold text-slate-500">{enrolments.filter(e => e.status === 'WITHDRAWN').length}</div>
              <div className="text-sm text-slate-300">Withdrawn</div>
            </div>
          </div>

          {/* Enrolments List */}
          {enrolments.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded text-center">
              <p className="text-slate-400">No enrolments for this course yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrolments.map(enrolment => (
                <div key={enrolment.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{enrolment.member?.name || enrolment.member?.email}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        Enrolled: {new Date(enrolment.startDate || enrolment.createdAt).toLocaleDateString()}
                      </div>
                      {enrolment.completedAt && (
                        <div className="text-sm text-green-400 mt-1">
                          Completed: {new Date(enrolment.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        enrolment.status === 'ENROLLED' ? 'bg-green-900/50 text-green-300' :
                        enrolment.status === 'COMPLETED' ? 'bg-purple-900/50 text-purple-300' :
                        enrolment.status === 'ENQUIRY' ? 'bg-blue-900/50 text-blue-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {enrolment.status}
                      </span>
                      
                      {enrolment.status === 'ENQUIRY' && (
                        <button
                          onClick={() => updateEnrolmentStatus(enrolment.id, 'ENROLLED')}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-500"
                        >
                          Confirm enrolment
                        </button>
                      )}
                      {enrolment.status === 'ENROLLED' && (
                        <button
                          onClick={() => updateEnrolmentStatus(enrolment.id, 'COMPLETED')}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-500"
                        >
                          Mark complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
