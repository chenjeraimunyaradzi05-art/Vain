'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, DollarSign, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
  employment?: string;
  salaryLow?: number;
  salaryHigh?: number;
}

export default function EditJobPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [salaryLow, setSalaryLow] = useState('');
  const [salaryHigh, setSalaryHigh] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ job: Job }>(`/company/jobs/${id}`);
      if (res.ok && res.data) {
        const job = res.data.job;
        setTitle(job.title || '');
        setDescription(job.description || '');
        setLocation(job.location || '');
        setEmployment(job.employment || 'FULL_TIME');
        setSalaryLow(job.salaryLow ? String(job.salaryLow) : '');
        setSalaryHigh(job.salaryHigh ? String(job.salaryHigh) : '');
      } else {
        setError('Job not found');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load job'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body = {
        title,
        description,
        location,
        employment,
        salaryLow: salaryLow ? Number(salaryLow) : undefined,
        salaryHigh: salaryHigh ? Number(salaryHigh) : undefined,
      };

      const res = await api(`/company/jobs/${id}`, {
        method: 'PATCH',
        body,
      });

      if (res.ok) {
        router.push('/company/jobs');
      } else {
        setError(res.error || 'Save failed');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/company/jobs" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Job</h1>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Senior Software Engineer"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Sydney, NSW (Remote)"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Employment Type</label>
              <select
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="CASUAL">Casual</option>
                <option value="APPRENTICESHIP">Apprenticeship</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Salary Range (Annual)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={salaryLow}
                    onChange={(e) => setSalaryLow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Min"
                    disabled={saving}
                  />
                </div>
                <span className="text-slate-500">-</span>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={salaryHigh}
                    onChange={(e) => setSalaryHigh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Max"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[200px]"
              placeholder="Describe the role, responsibilities, and requirements..."
              disabled={saving}
              required
            />
            <p className="text-xs text-slate-500 mt-2">Markdown formatting is supported.</p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link 
            href="/company/jobs"
            className="px-6 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
