'use client';

import api from '@/lib/apiClient';
import { getAccessToken, refreshAccessToken } from '@/lib/tokenStore';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Government Reports Page
 * 
 * View and download compliance reports aligned with Closing the Gap.
 * Supports quarterly and annual reporting periods.
 */

// Skeleton loading component
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// Report status badge
function StatusBadge({ status }) {
  const colors = {
    PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}

// Report card component
function ReportCard({ report, onView, onDownload }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs uppercase tracking-wide text-gray-500">
              {report.type} Report
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {report.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Period: {report.period}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Generated: {new Date(report.generatedAt).toLocaleDateString('en-AU')}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onView(report)}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          View Details
        </button>
        <button
          onClick={() => onDownload(report.id, 'csv')}
          className="px-3 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={`Download ${report.title} as CSV`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Report detail modal
function ReportDetailModal({ report, onClose, onDownload }) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 print:border-none">
          <div className="flex items-center justify-between">
            <h2 id="report-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {report.title || `Report ${report.reportId}`}
            </h2>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Print report"
                title="Print report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={() => onDownload?.(report.reportId || report.id, 'csv')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Download CSV"
                title="Download CSV"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Print header */}
          <div className="hidden print:block mt-2">
            <p className="text-sm text-gray-500">Ngurra Pathways - Closing the Gap Compliance Report</p>
            <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString('en-AU')}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Executive Summary */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Executive Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="text-sm text-gray-500">Total Placements</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.executiveSummary?.totalPlacements || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="text-sm text-gray-500">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.executiveSummary?.retentionRate || 0}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="text-sm text-gray-500">Training Completions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.executiveSummary?.trainingCompletions || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="text-sm text-gray-500">Employer Partners</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.executiveSummary?.employerPartnerships || 0}
                </p>
              </div>
            </div>
          </section>

          {/* Key Highlights */}
          {report.executiveSummary?.keyHighlights?.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Key Highlights
              </h3>
              <ul className="space-y-2">
                {report.executiveSummary.keyHighlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTG Alignment */}
          {report.closingTheGapAlignment && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Closing the Gap Alignment
              </h3>
              <div className="space-y-3">
                {Object.entries(report.closingTheGapAlignment).map(([key, target]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{target.name}</p>
                      <p className="text-sm text-gray-500">Target #{target.targetNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{target.currentValue}</p>
                      <p className={`text-sm ${target.trend?.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {target.trend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={() => onDownload?.(report.reportId || report.id, 'csv')}
              className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Generate report modal
function GenerateReportModal({ onClose, onGenerate, loading }) {
  const [reportType, setReportType] = useState('quarterly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({ reportType, periodStart, periodEnd });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="generate-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Generate New Report
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type
            </label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="quarterly">Quarterly Report</option>
              <option value="annual">Annual Report</option>
              <option value="custom">Custom Period</option>
            </select>
          </div>

          <div>
            <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period Start
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period End
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GovernmentReportsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await api('/government/reports');

        if (!res.ok) throw new Error('Failed to load reports');

        setReports(res.data?.data?.reports || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  const handleViewReport = async (report) => {
    try {
      const res = await api(`/government/reports/${report.id}`);

      if (!res.ok) throw new Error('Failed to load report details');

      setSelectedReport({ ...report, ...(res.data?.data || {}) });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadReport = async (reportId, format) => {
    try {
      let token = getAccessToken();
      if (!token) token = await refreshAccessToken();

      const res = await fetch(`/api/government/reports/${reportId}/export?format=${format}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to download report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Report downloaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateReport = async (options) => {
    setGenerating(true);
    try {
      const res = await api('/government/reports/generate', {
        method: 'POST',
        body: options,
      });

      if (!res.ok) throw new Error('Failed to generate report');

      setSelectedReport(res.data?.data);
      setShowGenerateModal(false);
      setSuccess('Report generated successfully');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh reports list
      const listRes = await api('/government/reports');
      if (listRes.ok) setReports(listRes.data?.data?.reports || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
                <Link href="/government/dashboard" className="hover:text-amber-600">
                  Government Portal
                </Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 dark:text-white">Reports</span>
              </nav>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Compliance Reports
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                View and download Closing the Gap compliance reports
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/government/dashboard"
                className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-28 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Reports Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Generate your first Closing the Gap compliance report.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Generate Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onView={handleViewReport}
                onDownload={handleDownloadReport}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDownload={handleDownloadReport}
        />
      )}

      {showGenerateModal && (
        <GenerateReportModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateReport}
          loading={generating}
        />
      )}
    </div>
  );
}
