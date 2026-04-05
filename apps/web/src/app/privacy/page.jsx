'use client';

import { API_BASE } from '@/lib/apiBase';
import api from '@/lib/apiClient';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '../../components/notifications/NotificationProvider';

export default function PrivacyPage() {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [consent, setConsent] = useState({
    analyticsSharing: false,
    researchParticipation: false,
    communityDataBenefit: false,
    marketingCommunications: false,
    thirdPartySharing: false,
    updatedAt: null,
  });

  const [cdba, setCdba] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportId, setExportId] = useState('');
  const [exportStatus, setExportStatus] = useState(null);

  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const consentUpdatedLabel = useMemo(() => {
    if (!consent?.updatedAt) return 'Not set yet';
    try {
      return new Date(consent.updatedAt).toLocaleString();
    } catch {
      return String(consent.updatedAt);
    }
  }, [consent]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [consentRes, cdbaRes] = await Promise.all([
        api('/data-sovereignty/consent'),
        api('/data-sovereignty/cdba'),
      ]);

      if (consentRes.ok) {
        const data = consentRes.data;
        setConsent(data?.consent || data);
      }

      if (cdbaRes.ok) {
        setCdba(cdbaRes.data);
      }
    } catch (e) {
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveConsent(next) {
    setError(null);
    setConsent(next);
    try {
      const { ok, data } = await api('/data-sovereignty/consent', {
        method: 'PUT',
        body: next,
      });

      if (!ok) throw new Error('Failed');
      setConsent(data?.consent || next);
    } catch {
      setError('Could not save consent preferences');
    }
  }

  async function requestExport(format) {
    setExporting(true);
    setError(null);
    try {
      const { ok, data } = await api('/data-sovereignty/export', {
        method: 'POST',
        body: { format, includeFiles: true },
      });

      if (!ok) throw new Error(data?.error || 'Export failed');

      setExportId(data.exportId);
      setExportStatus({ status: data.status, exportId: data.exportId });
    } catch (e) {
      setError(e?.message || 'Could not request export');
    } finally {
      setExporting(false);
    }
  }

  async function refreshExportStatus() {
    if (!exportId) return;
    setError(null);
    try {
      const { ok, data } = await api(`/data-sovereignty/export/${exportId}`);
      if (!ok) throw new Error(data?.error || 'Failed to fetch export status');
      setExportStatus(data);
    } catch (e) {
      setError(e?.message || 'Could not refresh export status');
    }
  }

  async function requestDeletion() {
    setDeleting(true);
    setError(null);
    try {
      const { ok, data } = await api('/data-sovereignty/delete', {
        method: 'POST',
        body: { confirmEmail, reason: deleteReason },
      });
      if (!ok) throw new Error(data?.error || 'Deletion request failed');
      setError(null);
      showNotification({ message: `Deletion scheduled for ${new Date(data.deletionDate).toLocaleDateString()}`, variant: 'success' });
    } catch (e) {
      setError(e?.message || 'Could not request deletion');
    } finally {
      setDeleting(false);
    }
  }

  async function cancelDeletion() {
    setDeleting(true);
    setError(null);
    try {
      const { ok, data } = await api('/data-sovereignty/delete/cancel', {
        method: 'POST',
      });
      if (!ok) throw new Error(data?.error || 'Cancel failed');
      showNotification({ message: 'Deletion request cancelled', variant: 'info' });
    } catch (e) {
      setError(e?.message || 'Could not cancel deletion');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="vantage-page max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-300 dark:border-slate-700 border-t-purple-500" />
          <span className="vantage-muted">Loading privacy & data settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vantage-page max-w-4xl mx-auto px-4 py-8">
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 vantage-muted">
          <li><Link href="/" className="vantage-link">Home</Link></li>
          <li><span className="text-slate-400 dark:text-slate-600">/</span></li>
          <li className="text-slate-900 dark:text-white">Privacy & Data</li>
        </ol>
      </nav>

      <h1 className="vantage-h1 mb-2">Privacy & Data</h1>
      <p className="vantage-text mb-8">
        Manage your consent choices, export your data, and request account deletion.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <section className="vantage-card p-6 mb-6">
        <h2 className="vantage-h2 text-xl mb-1">Consent Preferences</h2>
        <p className="vantage-muted text-sm mb-4">Last updated: {consentUpdatedLabel}</p>

        <div className="space-y-3">
          {[
            ['analyticsSharing', 'Analytics sharing', 'Help improve the platform with anonymized usage analytics.'],
            ['researchParticipation', 'Research participation', 'Opt-in to community-benefit research using anonymized, aggregated data.'],
            ['communityDataBenefit', 'Community Data Benefit Agreement (CDBA)', 'Support community programs via anonymized insights.'],
            ['marketingCommunications', 'Marketing communications', 'Receive product updates and opportunities.'],
            ['thirdPartySharing', 'Third-party sharing', 'Allow sharing with trusted partners (opt-in only).'],
          ].map(([key, title, desc]) => (
            <label key={key} className="flex items-start justify-between gap-4 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div>
                <div className="font-medium">{title}</div>
                <div className="text-sm vantage-muted">{desc}</div>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-blue-600"
                checked={Boolean(consent[key])}
                onChange={(e) => saveConsent({ ...consent, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="vantage-card p-6 mb-6">
        <h2 className="vantage-h2 text-xl mb-2">Community Data Benefit Agreement</h2>
        <p className="vantage-text mb-4">{cdba?.description || 'Anonymized, aggregated insights can help benefit community outcomes.'}</p>

        {cdba?.benefits?.length ? (
          <div className="text-sm vantage-text space-y-1">
            {cdba.benefits.map((b) => (
              <div key={b}>• {b}</div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="vantage-card p-6 mb-6">
        <h2 className="vantage-h2 text-xl mb-2">Export Your Data</h2>
        <p className="vantage-muted text-sm mb-4">
          Request a portable export of your profile and activity. When ready, you can download it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            type="button"
            disabled={exporting}
            onClick={() => requestExport('json')}
            className="vantage-btn-primary px-4 py-2 rounded-lg"
          >
            Request JSON Export
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => requestExport('csv')}
            className="vantage-btn-secondary px-4 py-2 rounded-lg"
          >
            Request CSV Export
          </button>
        </div>

        {exportId && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="text-sm vantage-text mb-2">Export ID: <span className="text-slate-900 dark:text-slate-200">{exportId}</span></div>
            <div className="text-sm vantage-muted mb-4">Status: {exportStatus?.status || 'unknown'}</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={refreshExportStatus}
                className="vantage-btn-secondary px-4 py-2 rounded-lg"
              >
                Refresh Status
              </button>
              {exportStatus?.status === 'completed' && (
                <a
                  href={`${API_BASE}/data-sovereignty/export/${exportId}/download`}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-center"
                >
                  Download Export
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="vantage-card border-red-200 dark:border-red-900/40 p-6">
        <h2 className="vantage-h2 text-xl mb-2">Account Deletion</h2>
        <p className="vantage-muted text-sm mb-4">
          You can request deletion of your account. A grace period applies, and you can cancel within that window.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Confirm your email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="vantage-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reason (optional)</label>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="vantage-input"
              placeholder="Your reason"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            type="button"
            disabled={deleting}
            onClick={requestDeletion}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-lg"
          >
            Request Deletion
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={cancelDeletion}
            className="px-4 py-2 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-lg"
          >
            Cancel Deletion Request
          </button>
        </div>
      </section>
    </div>
  );
}
