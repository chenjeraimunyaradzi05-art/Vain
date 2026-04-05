'use client';

/**
 * Apprenticeships Page
 * Browse and apply for apprenticeship and traineeship opportunities
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { GraduationCap, Loader2, CheckCircle, Building2, Users, Clock, ChevronRight, Sparkles } from 'lucide-react';
import Apprenticeships from '@/components/Apprenticeships';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function ApprenticeshipsPage() {
  return (
    <div className="ngurra-page py-8 px-4">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-500">
            <li><Link href="/" className="hover:text-pink-600 transition-colors">Home</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-400" /></li>
            <li><Link href="/jobs" className="hover:text-pink-600 transition-colors">Jobs</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-400" /></li>
            <li className="text-pink-600 font-medium">Apprenticeships</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div 
              className="p-4 rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${accentPink}20 0%, ${accentPurple}20 100%)` }}
            >
              <GraduationCap className="w-12 h-12 text-pink-600" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2 block">
                Career Development
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
                Apprenticeships & Traineeships
              </h1>
              <p className="text-lg text-slate-600 mb-4">
                Earn while you learn with paid on-the-job training and nationally recognized qualifications
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Paid training</span>
                </div>
                <div className="flex items-center gap-2 text-purple-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Nationally recognized</span>
                </div>
                <div className="flex items-center gap-2 text-pink-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Career pathway</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="text-3xl font-bold text-pink-600 mb-1">150+</div>
            <div className="text-sm text-slate-500">Active Programs</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="text-3xl font-bold text-emerald-600 mb-1">85%</div>
            <div className="text-sm text-slate-500">Completion Rate</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="text-3xl font-bold text-purple-600 mb-1">50+</div>
            <div className="text-sm text-slate-500">Partner Employers</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="text-3xl font-bold text-slate-700 mb-1">12-48</div>
            <div className="text-sm text-slate-500">Months Duration</div>
          </div>
        </div>

        {/* Why Apprenticeships */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="p-3 rounded-xl bg-pink-50 inline-block mb-3">
              <Building2 className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Real Work Experience</h3>
            <p className="text-sm text-slate-500">
              Learn practical skills on the job with experienced mentors in your chosen industry
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="p-3 rounded-xl bg-purple-50 inline-block mb-3">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Indigenous Support</h3>
            <p className="text-sm text-slate-500">
              Many programs offer cultural support, mentoring, and accommodation assistance
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="p-3 rounded-xl bg-blue-50 inline-block mb-3">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Flexible Pathways</h3>
            <p className="text-sm text-slate-500">
              Choose from full-time, part-time, or school-based programs to suit your life
            </p>
          </div>
        </div>

        {/* Apprenticeships Component */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          </div>
        }>
          <Apprenticeships />
        </Suspense>

        {/* CTA Section */}
        <div 
          className="mt-12 bg-white border border-slate-200 rounded-2xl p-8 text-center"
          style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">
              Need Guidance?
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Not sure which path is right for you?</h3>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Speak with our career advisors or connect with a mentor who can help guide you towards 
            the right apprenticeship or traineeship for your goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/mentors" 
              className="text-white px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              Find a Mentor
            </Link>
            <Link 
              href="/ai-concierge" 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors border border-slate-200"
            >
              Ask AI Concierge
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
