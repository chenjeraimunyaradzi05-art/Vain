'use client';

import MentorAnalyticsDashboard from '@/components/analytics/MentorAnalyticsDashboard';

export default function MentorAnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <a href="/" className="hover:text-blue-400 transition-colors">
              Home
            </a>
          </li>
          <li>
            <span className="text-slate-600">/</span>
          </li>
          <li>
            <a href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">
              Mentor Dashboard
            </a>
          </li>
          <li>
            <span className="text-slate-600">/</span>
          </li>
          <li className="text-white">Analytics</li>
        </ol>
      </nav>

      <MentorAnalyticsDashboard />
    </div>
  );
}
