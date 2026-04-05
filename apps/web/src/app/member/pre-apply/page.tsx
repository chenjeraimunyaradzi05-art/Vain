/**
 * Pre-Apply Jobs Page
 * 
 * Shows users their personalized job matches from the pre-apply queue.
 */

'use client';

import React from 'react';
import PreApplyDashboard from '../../../components/jobs/PreApplyDashboard';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PreApplyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/30 to-purple-900/30 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link 
            href="/member" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Pre-Apply Queue</h1>
              <p className="text-slate-400 mt-1">
                Jobs matched to your profile — apply before they're posted publicly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PreApplyDashboard limit={20} />
      </div>
    </div>
  );
}
