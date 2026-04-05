"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import useAuth from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../../../../components/notifications/NotificationProvider';

export default function AdminCtaAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Simple role check - redirect if not authorized
  useEffect(() => {
    if (!authLoading && (!user || (user.userType !== 'GOVERNMENT' && user.userType !== 'ADMIN'))) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const api = API_BASE;
        const res = await fetch(`${api}/analytics/admin/cta-summary`);
        if (!res.ok) throw new Error('Failed to fetch CTA metrics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex items-center justify-center gap-3 py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-600 border-t-blue-500" />
        <span className="text-slate-300">Loading CTA metrics…</span>
      </div>
    </div>
  );
  if (error) return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-4 text-red-200 flex items-start gap-3">
        <span className="text-lg">❌</span>
        <span>{error}</span>
      </div>
    </div>
  );

  const { total, byEventType = {}, byLocation = {}, timeseries = [] } = data || {};

  // Helper: generate a compact sparkline SVG from timeseries data
  function Sparkline({ data = [], width = 240, height = 40, stroke = '#60a5fa' }) {
    if (!data || data.length === 0) return null;
    const values = data.map(d => d.count);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(1, max - min);
    const step = width / Math.max(1, values.length - 1);

    const points = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    // small area fill path
    const areaPath = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' L ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="CTA activity sparkline">
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M0 ${height} L ${areaPath} L ${width} ${height} Z`} fill="rgba(96,165,250,0.08)" stroke="none" />
      </svg>
    );
  }

  async function handleExportCSV() {
    try {
      const api = API_BASE;
      const res = await fetch(`${api}/analytics/admin/cta-export?days=30`, { headers: { 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '' } });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cta-events-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
       
      console.error('Export failed', err);
      showNotification({ message: 'Export failed', variant: 'error' });
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/admin" className="hover:text-blue-400 transition-colors">Admin</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li><a href="/admin/analytics" className="hover:text-blue-400 transition-colors">Analytics</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">CTA Metrics</li>
        </ol>
      </nav>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="cta-metrics-heading">CTA Metrics</h1>
          <p className="text-sm text-slate-400 mt-1">Summary of CTA clicks and feature usage (last 30 days)</p>
        </div>
        <button 
          onClick={handleExportCSV} 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
          <div className="text-sm text-slate-400">Total CTA Events</div>
          <div className="text-2xl font-bold">{total}</div>
          <div className="mt-3">
            <Sparkline data={timeseries} />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
          <div className="text-sm text-slate-400">Top Event Types</div>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(byEventType).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="text-slate-300">{v}</span></li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
          <div className="text-sm text-slate-400">Top Locations</div>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(byLocation).slice(0,10).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="text-slate-300">{v}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
        <h3 className="font-semibold mb-2">Daily Timeseries</h3>
        <div className="text-sm text-slate-400 mb-2">(last {timeseries.length} days)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 text-slate-400 font-medium">Date</th>
                <th className="text-right py-2 text-slate-400 font-medium">Events</th>
              </tr>
            </thead>
            <tbody>
              {timeseries.map((d) => (
                <tr key={d.date} className="border-b border-slate-800/50">
                  <td className="py-2">{d.date}</td>
                  <td className="py-2 text-right">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
