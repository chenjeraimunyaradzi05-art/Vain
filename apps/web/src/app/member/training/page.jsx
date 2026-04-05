"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

export default function TrainingPage() {
  const { token } = useAuth();
  const { showNotification } = useNotifications();
  const [courses, setCourses] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    loadData();
  }, [token, page, search, industry]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (search) params.set('search', search);
      if (industry) params.set('industry', industry);

      const [coursesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/courses?${params}`),
        fetch(`${API_BASE}/courses/categories`)
      ]);

      const coursesJson = await coursesRes.json();
      const categoriesJson = await categoriesRes.json();

      if (coursesRes.ok) {
        setCourses(coursesJson.courses || []);
        setTotal(coursesJson.total || 0);
      }
      if (categoriesRes.ok) {
        setCategories(categoriesJson.categories || []);
      }

      // Load user's enrolments if logged in
      if (token) {
        const enrolRes = await fetch(`${API_BASE}/courses/my/enrolments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (enrolRes.ok) {
          const enrolJson = await enrolRes.json();
          setEnrolments(enrolJson.enrolments || []);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function enrol(courseId) {
    if (!token) {
      showNotification({ message: 'Please log in to enrol in courses', variant: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Enrolment failed');
      showNotification({ message: json.message || 'Enrolled successfully!', variant: 'success' });
      loadData();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  const enrolledIds = new Set(enrolments.filter(e => e.status !== 'WITHDRAWN').map(e => e.courseId));
  const activeEnrolments = enrolments.filter(e => e.status === 'ENROLLED' || e.status === 'IN_PROGRESS');
  const completedEnrolments = enrolments.filter(e => e.status === 'COMPLETED');

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Training</li>
        </ol>
      </nav>
      
      <h1 className="text-2xl font-bold mb-2">📚 Training & Courses</h1>
      <p className="text-slate-300 mb-8">Develop your skills with courses from TAFE and training partners.</p>

      {/* My Enrolments Section */}
      {token && activeEnrolments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-400">●</span> My Current Courses
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeEnrolments.map(enrol => (
              <div key={enrol.id} className="border border-green-800 bg-green-900/20 p-4 rounded">
                <div className="font-semibold">{enrol.course?.title}</div>
                <div className="text-sm text-slate-400 mt-1">{enrol.course?.provider}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${
                    enrol.status === 'ENROLLED' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>
                    {enrol.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    Started {new Date(enrol.startDate || enrol.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <a href={`/member/training/${enrol.id}`} className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200">
                  Continue learning →
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Courses */}
      {token && completedEnrolments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-400">🏆 Completed Courses</h2>
          <div className="flex flex-wrap gap-2">
            {completedEnrolments.map(enrol => (
              <div key={enrol.id} className="px-3 py-2 bg-slate-800 rounded text-sm">
                ✅ {enrol.course?.title}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search courses..."
          className="flex-1 min-w-[200px] border border-slate-700 bg-slate-950/40 text-slate-100 px-4 py-2 rounded placeholder:text-slate-500"
        />
        <select
          value={industry}
          onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
          className="border border-slate-700 bg-slate-950/40 text-slate-100 px-4 py-2 rounded"
        >
          <option value="">All industries</option>
          {categories.map(cat => (
            <option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</option>
          ))}
        </select>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div>Loading…</div>
      ) : courses.length === 0 ? (
        <p className="text-slate-400">No courses found matching your criteria.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <div key={course.id} className="border border-slate-800 bg-slate-900/40 p-4 rounded flex flex-col">
                <div className="flex-1">
                  <div className="flex gap-2 mb-1">
                    {course.industry && <span className="text-xs text-slate-400">{course.industry}</span>}
                    {course.qualification && <span className="text-xs text-blue-400">{course.qualification}</span>}
                  </div>
                  <div className="font-semibold">{course.title}</div>
                  <div className="text-sm text-slate-300 mt-1">{course.provider}</div>
                  {course.description && (
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-400">
                    {course.duration && <span>⏱️ {course.duration}</span>}
                    {course.location && <span>📍 {course.location}</span>}
                    {course.isOnline && <span>💻 Online</span>}
                    {course.price && <span>💰 ${(course.price / 100).toFixed(0)}</span>}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{course.enrolmentCount} enrolled</span>
                  {enrolledIds.has(course.id) ? (
                    <span className="text-sm text-green-400">✓ Enrolled</span>
                  ) : (
                    <button
                      onClick={() => enrol(course.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                    >
                      Enrol
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex justify-center gap-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-400">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
