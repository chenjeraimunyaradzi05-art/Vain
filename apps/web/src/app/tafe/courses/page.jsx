"use client";
import { API_BASE } from '@/lib/apiBase';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function TafeCourseManagement() {
  const { token } = useAuth();
  const { showNotification } = useNotifications();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    industry: '',
    qualification: '',
    duration: '',
    location: '',
    isOnline: false,
    price: '',
    startDate: '',
    endDate: '',
    maxEnrolments: '',
    externalUrl: ''
  });

  useEffect(() => {
    if (token) loadCourses();
  }, [token]);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses?pageSize=100`);
      if (res.ok) {
        const json = await res.json();
        setCourses(json.courses || []);
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingCourse(null);
    setForm({
      title: '',
      description: '',
      industry: '',
      qualification: '',
      duration: '',
      location: '',
      isOnline: false,
      price: '',
      startDate: '',
      endDate: '',
      maxEnrolments: '',
      externalUrl: ''
    });
    setShowCreateModal(true);
  }

  function openEdit(course) {
    setEditingCourse(course);
    setForm({
      title: course.title || '',
      description: course.description || '',
      industry: course.industry || '',
      qualification: course.qualification || '',
      duration: course.duration || '',
      location: course.location || '',
      isOnline: course.isOnline || false,
      price: course.price ? (course.price / 100).toString() : '',
      startDate: course.startDate ? course.startDate.split('T')[0] : '',
      endDate: course.endDate ? course.endDate.split('T')[0] : '',
      maxEnrolments: course.maxEnrolments || '',
      externalUrl: course.externalUrl || ''
    });
    setShowCreateModal(true);
  }

  async function saveCourse() {
    try {
      const url = editingCourse 
        ? `${API_BASE}/courses/${editingCourse.id}`
        : `${API_BASE}/courses`;
      
      // Transform form data to API format
      const payload = {
        ...form,
        price: form.price ? Math.round(parseFloat(form.price) * 100) : null,
        maxEnrolments: form.maxEnrolments ? parseInt(form.maxEnrolments, 10) : null
      };
      
      const res = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save course');
      showNotification({ message: editingCourse ? 'Course updated!' : 'Course created!', variant: 'success' });
      setShowCreateModal(false);
      loadCourses();
    } catch (e) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  if (!token) {
    return (
      <div className="ngurra-page">
        <div className="max-w-5xl mx-auto py-12 px-4">
          <h1 className="ngurra-h1 mb-4">Course Management</h1>
          <p className="ngurra-text">Please log in to manage courses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-5xl mx-auto">
          <Link href="/tafe/dashboard" className="text-pink-600 hover:text-pink-700 text-sm mb-4 inline-flex items-center gap-1 font-medium">
            ← Dashboard
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Training Programs</p>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">📚 Course Management</h1>
              <p className="text-lg text-slate-600 mt-2">Create and manage training courses for community members.</p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
            >
              + Create Course
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Loading…</div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-slate-500 mb-4">No courses yet. Create your first course to get started.</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }}>
            Create Course
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map(course => (
            <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-1">
                    {course.industry && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{course.industry}</span>}
                    {course.qualification && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.1)', color: accentPurple }}>{course.qualification}</span>}
                  </div>
                  <div className="font-bold text-lg text-slate-900">{course.title}</div>
                  <div className="text-sm text-slate-500">{course.provider}</div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    {course.duration && <span>⏱️ {course.duration}</span>}
                    {course.location && <span>📍 {course.location}</span>}
                    {course.isOnline && <span>💻 Online</span>}
                    {course.price > 0 && <span>💰 ${(course.price / 100).toFixed(0)}</span>}
                    {course.startDate && <span>📅 Starts {new Date(course.startDate).toLocaleDateString()}</span>}
                    <span>👥 {course.enrolmentCount || 0} enrolled</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link 
                    href={`/tafe/courses/${course.id}/enrolments`}
                    className="px-3 py-2 border-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-50" style={{ borderColor: '#94A3B8', color: '#475569' }}
                  >
                    View enrolments
                  </Link>
                  <button
                    onClick={() => openEdit(course)}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 overflow-auto z-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="font-bold text-xl text-slate-900">{editingCourse ? 'Edit Course' : 'Create Course'}</div>
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Course title"
                  className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Course description..."
                  className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg h-24 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Industry</label>
                  <input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="E.g., Construction, Healthcare, IT"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Qualification</label>
                  <input
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder="E.g., Certificate III, Diploma"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Duration</label>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="E.g., 6 weeks, 3 months"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="E.g., Darwin Campus"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Leave blank if free"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Max Enrolments</label>
                  <input
                    type="number"
                    value={form.maxEnrolments}
                    onChange={(e) => setForm({ ...form, maxEnrolments: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div className="flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isOnline}
                      onChange={(e) => setForm({ ...form, isOnline: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">Online course</span>
                  </label>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">External URL</label>
                <input
                  value={form.externalUrl}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                  placeholder="Link to course materials or information"
                  className="w-full border-2 border-slate-200 bg-white text-slate-900 px-4 py-3 rounded-lg placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 border-2 border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={saveCourse} className="px-6 py-2.5 rounded-lg text-white font-semibold transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }}>
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
