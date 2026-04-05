'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Users, FileText, Mail, Calendar, CheckCircle, XCircle, Clock, MoreHorizontal, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    memberProfile?: {
      headline?: string;
    };
  };
  resume?: {
    url: string;
    filename: string;
  };
}

const STATUS_OPTIONS = [
  { value: 'SUBMITTED', label: 'New', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'REVIEWING', label: 'Reviewing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'INTERVIEWING', label: 'Interviewing', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'OFFERED', label: 'Offer Sent', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'HIRED', label: 'Hired', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

export default function ApplicantsPage() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const id = params?.id as string;

  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ applicants: Application[] }>(`/company/jobs/${id}/applicants`);
      if (res.ok && res.data) {
        setApplicants(res.data.applicants);
      } else {
        setError('Failed to load applicants');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load applicants'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  async function updateStatus(appId: string, newStatus: string) {
    try {
      const res = await api(`/company/jobs/${id}/applicants/${appId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });

      if (res.ok) {
        setApplicants(applicants.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      }
    } catch (err: unknown) {
      alert('Failed to update status: ' + getErrorMessage(err));
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
    <div className="max-w-6xl mx-auto py-12 px-4">
      <Link href={`/company/jobs/${id}`} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Job Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Applicants</h1>
          <p className="text-slate-400">Review and manage candidates for this position.</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg text-slate-300">
          Total: <span className="text-white font-bold">{applicants.length}</span>
        </div>
      </div>

      {applicants.length > 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="p-4 font-medium">Candidate</th>
                  <th className="p-4 font-medium">Applied</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Resume</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {app.user.firstName} {app.user.lastName}
                          </div>
                          <div className="text-sm text-slate-400">{app.user.email}</div>
                          {app.user.memberProfile?.headline && (
                            <div className="text-xs text-slate-500 mt-0.5">{app.user.memberProfile.headline}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          STATUS_OPTIONS.find(o => o.value === app.status)?.color || 'text-slate-400 border-slate-600'
                        }`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-300">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      {app.resume?.url ? (
                        <a 
                          href={app.resume.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          View Resume
                        </a>
                      ) : (
                        <span className="text-slate-500 text-sm italic">No resume</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Send Message"
                          onClick={() => alert('Messaging coming soon!')}
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Schedule Interview"
                          onClick={() => alert('Scheduling coming soon!')}
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No applicants yet</h3>
          <p className="text-slate-400">
            When candidates apply to this job, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
