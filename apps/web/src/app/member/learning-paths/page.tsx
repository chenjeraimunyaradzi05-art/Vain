'use client';

import LearningPathVisualization from '@/components/learning/LearningPathVisualization';

export default function LearningPathsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-400">
            <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
            <li><span className="text-slate-600">/</span></li>
            <li className="text-white">Learning Paths</li>
          </ol>
        </nav>

        <LearningPathVisualization />
      </div>
    </div>
  );
}
