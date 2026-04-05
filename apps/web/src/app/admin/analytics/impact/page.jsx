"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../../../../components/notifications/NotificationProvider';

export default function AdminImpactDashboardPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotifications();

  const apiBase = useMemo(() => API_BASE, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [cohorts, setCohorts] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.userType !== 'GOVERNMENT' && user.userType !== 'ADMIN'))) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [metricsRes, historyRes, cohortsRes] = await Promise.all([
          fetch(`${apiBase}/reporting/metrics?period=month`, { headers }),
          fetch(`${apiBase}/reporting/metrics/history?limit=20`, { headers }),
          fetch(`${apiBase}/analytics/admin/cohorts`, { headers }).catch(() => null),
        ]);

        if (!metricsRes.ok) throw new Error('Failed to load impact metrics');
        const metricsJson = await metricsRes.json();
        setMetrics(metricsJson);

        if (historyRes.ok) {
          const historyJson = await historyRes.json();
          setHistory(Array.isArray(historyJson.metrics) ? historyJson.metrics : []);
        } else {
          setHistory([]);
        }

        if (cohortsRes?.ok) {
          const cohortsJson = await cohortsRes.json();
          setCohorts(cohortsJson);
        } else {
          setCohorts(null);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load impact analytics');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, apiBase]);

  async function downloadExport(format) {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${apiBase}/reporting/export?format=${encodeURIComponent(format)}&limit=250`, { headers });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `impact-metrics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
       
      console.error('Impact export failed', err);
      showNotification({ message: 'Export failed', variant: 'error' });
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-6">Impact Dashboard</h1>
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-600 border-t-blue-500" />
          <span className="text-slate-300">Loading impact dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-4 text-red-200 flex items-start gap-3">
          <span className="text-lg">❌</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const cards = metrics?.metrics || {};

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/admin" className="hover:text-blue-400 transition-colors">Admin</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li><a href="/admin/analytics" className="hover:text-blue-400 transition-colors">Analytics</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Impact Dashboard</li>
        </ol>
      </nav>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Impact Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Monthly snapshot for grant and RAP reporting</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadExport('csv')}
            className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => downloadExport('xlsx')}
            className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 text-sm"
          >
            Export XLSX
          </button>
          <button
            onClick={() => downloadExport('pdf')}
            className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 text-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard label={cards.members?.label || 'Registered Members'} value={cards.members?.total || 0} icon="👥" />
        <StatCard label={cards.employers?.label || 'Partner Employers'} value={cards.employers?.total || 0} icon="🏢" />
        <StatCard label={cards.placements?.label || 'Successful Placements'} value={cards.placements?.total || 0} icon="✅" color="green" sub={`${cards.placements?.rate || 0}% placement rate`} />
        <StatCard label={cards.mentoring?.label || 'Mentoring Sessions'} value={cards.mentoring?.total || 0} icon="🤝" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
          <h2 className="text-lg font-semibold mb-1">Metrics (last month)</h2>
          <p className="text-sm text-slate-400 mb-4">Counts are computed from platform activity.</p>

          <div className="space-y-2 text-sm">
            <Row label={cards.jobs?.label || 'Jobs Posted'} value={cards.jobs?.total || 0} />
            <Row label={cards.applications?.label || 'Applications Submitted'} value={cards.applications?.total || 0} />
            <Row label={cards.retention?.label || 'Retention Milestones'} value={cards.retention?.total || 0} />
            <Row label={cards.training?.label || 'Training Completions'} value={cards.training?.total || 0} />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
          <h2 className="text-lg font-semibold mb-1">Recorded Impact Metrics</h2>
          <p className="text-sm text-slate-400 mb-4">Latest entries from the ImpactMetric table.</p>

          {history.length === 0 ? (
            <div className="text-sm text-slate-400">No recorded metrics yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-2 text-slate-400 font-medium">Metric</th>
                    <th className="text-left py-2 text-slate-400 font-medium">Period</th>
                    <th className="text-right py-2 text-slate-400 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 12).map((m) => (
                    <tr key={m.id} className="border-b border-slate-800/50">
                      <td className="py-2">{m.metric}</td>
                      <td className="py-2 text-slate-300">{m.period}</td>
                      <td className="py-2 text-right font-medium">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {cohorts ? (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mt-4">
          <h2 className="text-lg font-semibold mb-1">Cohort Segmentation</h2>
          <p className="text-sm text-slate-400 mb-4">High-level breakdowns for reporting and targeting.</p>

          <div className="grid gap-4 md:grid-cols-3">
            <MiniTable title="Members by Mob Nation" rows={cohorts.membersByMobNation} />
            <MiniTable title="Companies by Industry" rows={cohorts.companiesByIndustry} />
            <MiniTable title="Companies by State" rows={cohorts.companiesByState} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1">{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/50 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function MiniTable({ title, rows }) {
  const entries = Object.entries(rows || {}).sort((a, b) => (b?.[1] || 0) - (a?.[1] || 0)).slice(0, 5);

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded">
      <div className="text-sm text-slate-300 font-medium mb-2">{title}</div>
      {entries.length === 0 ? (
        <div className="text-sm text-slate-500">No data</div>
      ) : (
        <div className="space-y-1 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-slate-400 truncate pr-2">{k}</span>
              <span className="text-slate-200 font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
